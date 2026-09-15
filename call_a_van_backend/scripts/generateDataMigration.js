/**
 * One-shot generator: merges Supabase + Webflow dumps → SQL migration.
 * Run: node scripts/generateDataMigration.js
 *
 * Does NOT modify the admins table.
 * Flushes drivers + driver_locations, then inserts the union of dump data.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ROOT = path.join(__dirname, '..', '..');
const DUMP = path.join(ROOT, 'datadump');
const OUT = path.join(__dirname, '..', 'migrations', '001_import_legacy_drivers.sql');

const WEBFLOW_DRIVERS = path.join(
  DUMP,
  '69a1e72f62bb83ccc0c7d73c-69a1e72f63393d97c8998eed-2026-09-15T19-35-34-838Z.csv'
);
const WEBFLOW_LOCATIONS = path.join(
  DUMP,
  '69a1e72f62bb83ccc0c7d73c-69a747a2f58a483fb1f6db2a-2026-09-15T19-35-16-357Z.csv'
);

const SERVICE_SLUG_MAP = {
  'waste-disposal-runs': 'Waste / Disposal Runs',
  'house-removals': 'House Removals',
  'storage-moves': 'Storage Moves',
  'small-moves-student-moves': 'Small Moves / Student Moves',
  'furniture-collection-delivery': 'Furniture Collection / Delivery',
  'single-item-transport': 'Single Item Transport',
};

/** Minimal RFC4180 CSV parser (handles quotes + newlines inside fields). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== '')).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx] : '';
    });
    return obj;
  });
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseCsv(raw);
}

function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseBool(v) {
  const s = String(v || '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function parseCoord(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  if (n === 0) return null;
  return n;
}

function sqlStr(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBool(v) {
  return v ? 'TRUE' : 'FALSE';
}

function sqlNum(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'NULL';
  return String(v);
}

function sqlTs(v) {
  if (!v || !String(v).trim()) return 'NOW()';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'NOW()';
  return sqlStr(d.toISOString());
}

function pick(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function servicesFromWebflow(servicesCell) {
  if (!servicesCell) return [];
  return String(servicesCell)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((slug) => SERVICE_SLUG_MAP[slug] || slug)
    .filter(Boolean);
}

async function main() {
  const authRows = readCsv(path.join(DUMP, 'Drivers_rows.csv'));
  const detailRows = readCsv(path.join(DUMP, 'DriversDetails_rows.csv'));
  const locRows = readCsv(path.join(DUMP, 'driver_locations_rows.csv'));
  const serviceRows = readCsv(path.join(DUMP, 'Services_rows.csv'));
  const driverServiceRows = readCsv(path.join(DUMP, 'driver-services_rows.csv'));
  const webflowDrivers = readCsv(WEBFLOW_DRIVERS);
  const webflowLocations = fs.existsSync(WEBFLOW_LOCATIONS) ? readCsv(WEBFLOW_LOCATIONS) : [];

  const serviceById = {};
  for (const s of serviceRows) {
    serviceById[s.id] = s['service-name'] || s.service_name || s.name;
  }

  // driver_id (legacy uuid / webflow id) → service names
  const servicesByDriverId = {};
  for (const link of driverServiceRows) {
    const did = String(link.driverid || '').trim();
    const sid = String(link.serviceid || '').trim();
    if (!did || !sid) continue;
    if (!servicesByDriverId[did]) servicesByDriverId[did] = [];
    const name = serviceById[sid];
    if (name && !servicesByDriverId[did].includes(name)) {
      servicesByDriverId[did].push(name);
    }
  }

  // email → auth
  const authByEmail = {};
  for (const row of authRows) {
    const email = normEmail(row.email);
    if (!email) continue;
    authByEmail[email] = row;
  }

  // email → details
  const detailsByEmail = {};
  for (const row of detailRows) {
    const email = normEmail(row.email);
    if (!email) continue;
    detailsByEmail[email] = row;
  }

  // email → supabase location
  const locByEmail = {};
  for (const row of locRows) {
    const email = normEmail(row.email);
    if (!email) continue;
    locByEmail[email] = row;
  }

  // webflow item id → location (driver column is often the Name or slug; locations file has "driver" field)
  // Prefer matching webflow locations by joining later via email when possible.
  // Webflow locations CSV columns: driver, longitude, latitude, is-live
  // The "driver" field may be the driver Name — map name→email from webflow drivers.
  const webflowByEmail = {};
  const webflowByName = {};
  for (const row of webflowDrivers) {
    const email = normEmail(row.Email);
    if (!email) continue;
    webflowByEmail[email] = row;
    const name = String(row.Name || '').trim().toLowerCase();
    if (name) webflowByName[name] = row;
  }

  const webflowLocByEmail = {};
  for (const row of webflowLocations) {
    const driverRef = String(row.driver || row.Driver || '').trim();
    if (!driverRef) continue;
    // try match by name
    const byName = webflowByName[driverRef.toLowerCase()];
    if (byName) {
      webflowLocByEmail[normEmail(byName.Email)] = row;
      continue;
    }
    // try as email
    const asEmail = normEmail(driverRef);
    if (webflowByEmail[asEmail]) {
      webflowLocByEmail[asEmail] = row;
    }
  }

  // Union of all emails
  const allEmails = new Set([
    ...Object.keys(authByEmail),
    ...Object.keys(detailsByEmail),
    ...Object.keys(webflowByEmail),
  ]);

  const placeholderHash = bcrypt.hashSync(
    `legacy-no-password-${crypto.randomBytes(16).toString('hex')}`,
    10
  );

  const drivers = [];
  for (const email of [...allEmails].sort()) {
    const auth = authByEmail[email];
    const details = detailsByEmail[email];
    const wf = webflowByEmail[email];

    const archived = wf ? parseBool(wf.Archived) : false;
    const draft = wf ? parseBool(wf.Draft) : false;

    // Approval: supabase password+approval win when present;
    // draft/archived webflow → pending
    let isApproved = false;
    if (archived || draft) {
      isApproved = false;
    } else if (auth && String(auth.approved || '').toLowerCase() === 'approved') {
      isApproved = true;
    } else if (wf && String(wf.Status || '').toLowerCase() === 'approved') {
      isApproved = true;
    }

    const passwordHash =
      auth && auth.password && String(auth.password).trim()
        ? String(auth.password).trim()
        : placeholderHash;

    const fullName = pick(
      details?.name,
      wf?.Name,
      email.split('@')[0]
    );

    const mobile = pick(details?.phone, wf?.Phone, '0000000000');
    const company = pick(details?.companyName, wf?.['Company Name']);
    const baseArea = pick(details?.baseArea, wf?.['Base Area'], wf?.Location);
    const vehicleType = pick(details?.vehicleType, wf?.['Vehicle Type']);
    const shortBio = stripHtml(pick(details?.shortBio, wf?.['Short Bio']) || '');
    const profileImage = pick(details?.profileImage, wf?.['Profile Picture']);
    const vanImage = pick(details?.driverlicense, wf?.['Driver License']);

    // Services: supabase junction by details.driver_id, else webflow slugs
    let services = [];
    if (details?.driver_id && servicesByDriverId[details.driver_id]) {
      services = [...servicesByDriverId[details.driver_id]];
    }
    if (!services.length && auth?.driver_id && servicesByDriverId[auth.driver_id]) {
      services = [...servicesByDriverId[auth.driver_id]];
    }
    if (!services.length && wf?.Services) {
      services = servicesFromWebflow(wf.Services);
    }

    // Coords: supabase location by email, else details defaults, else webflow base area / location row
    const sbLoc = locByEmail[email];
    const wfLoc = webflowLocByEmail[email];

    let lat = parseCoord(sbLoc?.latitude);
    let lng = parseCoord(sbLoc?.longitude);
    if (lat === null || lng === null) {
      lat = parseCoord(details?.defaultLatitude);
      lng = parseCoord(details?.defaultLongitude);
    }
    if (lat === null || lng === null) {
      lat = parseCoord(wf?.['Base Area Latitude']);
      lng = parseCoord(wf?.['Base Area Longitude']);
    }
    if (lat === null || lng === null) {
      lat = parseCoord(wfLoc?.latitude);
      lng = parseCoord(wfLoc?.longitude);
    }

    const createdAt = pick(auth?.created_at, details?.created_at, wf?.['Created On']);

    drivers.push({
      email,
      fullName,
      mobile,
      passwordHash,
      company,
      baseArea,
      vehicleType,
      shortBio,
      services,
      isApproved,
      profileImage,
      vanImage,
      lat,
      lng,
      createdAt,
      hasRealPassword: Boolean(auth && auth.password),
    });
  }

  // Sort for stable SQL; assign sequential ids starting at 1
  drivers.sort((a, b) => a.email.localeCompare(b.email));

  const lines = [];
  lines.push('-- =============================================================================');
  lines.push('-- Call-A-Van legacy data import (Supabase + Webflow union)');
  lines.push('-- Generated by call_a_van_backend/scripts/generateDataMigration.js');
  lines.push('--');
  lines.push('-- WHAT THIS DOES');
  lines.push('--   1) DELETE all rows from driver_locations and drivers (admins UNTOUCHED)');
  lines.push('--   2) INSERT merged driver profiles + location pins');
  lines.push('--');
  lines.push('-- RULES');
  lines.push('--   - Union by email');
  lines.push('--   - Supabase wins for password + approval');
  lines.push('--   - Webflow fills missing profile fields');
  lines.push('--   - Webflow Draft/Archived → is_approved = false (pending)');
  lines.push('--   - driverlicense / Driver License → van_image_url');
  lines.push('--   - Locations start offline (is_live=false); offline pin = coords when present');
  lines.push('--   - Analytics NOT imported');
  lines.push('--   - Admins NOT modified');
  lines.push('--');
  lines.push(`-- Drivers to insert: ${drivers.length}`);
  lines.push(`-- With legacy scrypt password: ${drivers.filter((d) => d.hasRealPassword).length}`);
  lines.push(`-- Without login password (placeholder bcrypt; use forgot-password): ${drivers.filter((d) => !d.hasRealPassword).length}`);
  lines.push('-- =============================================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');
  lines.push('-- Flush existing driver data (keep admins)');
  lines.push('DELETE FROM driver_locations;');
  lines.push('DELETE FROM drivers;');
  lines.push('');
  lines.push("-- Reset identity so IDs start cleanly at 1");
  lines.push("ALTER SEQUENCE drivers_id_seq RESTART WITH 1;");
  lines.push('');

  drivers.forEach((d, idx) => {
    const id = idx + 1;
    const servicesJson = JSON.stringify(d.services || []);
    lines.push(`-- ${d.email}`);
    lines.push('INSERT INTO drivers (');
    lines.push('  id, full_name, mobile_number, email, password_hash,');
    lines.push('  company_name, base_area, vehicle_type, short_bio, services_offered,');
    lines.push('  is_approved, is_live, created_at, profile_image_url, van_image_url');
    lines.push(') VALUES (');
    lines.push(
      [
        id,
        sqlStr(d.fullName),
        sqlStr(d.mobile),
        sqlStr(d.email),
        sqlStr(d.passwordHash),
        sqlStr(d.company),
        sqlStr(d.baseArea),
        sqlStr(d.vehicleType),
        sqlStr(d.shortBio),
        `${sqlStr(servicesJson)}::jsonb`,
        sqlBool(d.isApproved),
        'FALSE',
        sqlTs(d.createdAt),
        sqlStr(d.profileImage),
        sqlStr(d.vanImage),
      ].join(', ')
    );
    lines.push(');');
    lines.push('');

    if (d.lat !== null && d.lng !== null) {
      lines.push('INSERT INTO driver_locations (');
      lines.push('  driver_id, latitude, longitude, offline_latitude, offline_longitude,');
      lines.push('  is_live, is_logged_in, last_active');
      lines.push(') VALUES (');
      lines.push(
        [
          id,
          sqlNum(d.lat),
          sqlNum(d.lng),
          sqlNum(d.lat),
          sqlNum(d.lng),
          'FALSE',
          'FALSE',
          'NOW()',
        ].join(', ')
      );
      lines.push(');');
      lines.push('');
    }
  });

  lines.push(`SELECT setval(pg_get_serial_sequence('drivers', 'id'), (SELECT COALESCE(MAX(id), 1) FROM drivers));`);
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');

  console.log(`Wrote ${OUT}`);
  console.log(`Drivers: ${drivers.length}`);
  console.log(`With locations: ${drivers.filter((d) => d.lat !== null && d.lng !== null).length}`);
  console.log(`Approved: ${drivers.filter((d) => d.isApproved).length}`);
  console.log(`Pending: ${drivers.filter((d) => !d.isApproved).length}`);
  console.log(`Legacy scrypt passwords: ${drivers.filter((d) => d.hasRealPassword).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
