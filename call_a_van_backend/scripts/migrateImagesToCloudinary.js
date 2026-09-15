/**
 * Download legacy driver images (Supabase / external) and re-upload to Cloudinary,
 * then update drivers.profile_image_url / van_image_url.
 *
 * Usage (from call_a_van_backend):
 *   node scripts/migrateImagesToCloudinary.js
 *
 * Options:
 *   --dry-run     Only log what would be migrated (no upload / no DB write)
 *   --force       Re-upload even if URL already points at Cloudinary
 *   --limit=N     Process at most N drivers (for testing)
 */
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const db = require('../config/db');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

function isCloudinaryUrl(url) {
  if (!url) return false;
  return /res\.cloudinary\.com\//i.test(url) || /cloudinary\.com\//i.test(url);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function uploadFromUrl(sourceUrl, publicId) {
  // Prefer Cloudinary remote fetch (it downloads the URL server-side)
  try {
    const result = await cloudinary.uploader.upload(sourceUrl, {
      folder: 'call_a_van_uploads',
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      timeout: 120000,
    });
    return result.secure_url;
  } catch (remoteErr) {
    console.warn(`  remote upload failed (${remoteErr.message}) — trying local download…`);
  }

  // Fallback: download then upload as data URI
  const res = await fetch(sourceUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'CallAVan-ImageMigrator/1.0' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} downloading ${sourceUrl}`);
  }

  const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error('Empty image download');

  const dataUri = `data:${contentType};base64,${buf.toString('base64')}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'call_a_van_uploads',
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    timeout: 120000,
  });
  return result.secure_url;
}

async function migrateField(driver, field, label) {
  const current = driver[field];
  if (!current || !String(current).trim()) {
    return { skipped: true, reason: 'empty' };
  }
  if (!FORCE && isCloudinaryUrl(current)) {
    return { skipped: true, reason: 'already-cloudinary' };
  }

  const publicId = `driver_${driver.id}_${label}`;
  if (DRY_RUN) {
    console.log(`  [dry-run] would migrate ${label}: ${current}`);
    return { skipped: true, reason: 'dry-run', url: current };
  }

  const newUrl = await uploadFromUrl(current, publicId);
  await db.query(`UPDATE drivers SET ${field} = $1 WHERE id = $2`, [newUrl, driver.id]);
  return { skipped: false, url: newUrl };
}

async function main() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Missing Cloudinary env vars (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).');
    process.exit(1);
  }

  console.log('Migrating driver images → Cloudinary');
  console.log(`  dry-run=${DRY_RUN} force=${FORCE} limit=${LIMIT ?? 'none'}`);
  console.log('');

  let sql = `
    SELECT id, email, full_name, profile_image_url, van_image_url
    FROM drivers
    WHERE
      (profile_image_url IS NOT NULL AND profile_image_url <> '')
      OR (van_image_url IS NOT NULL AND van_image_url <> '')
    ORDER BY id ASC
  `;
  if (LIMIT && Number.isFinite(LIMIT)) {
    sql += ` LIMIT ${LIMIT}`;
  }

  const { rows: drivers } = await db.query(sql);
  console.log(`Found ${drivers.length} drivers with at least one image.\n`);

  const stats = {
    profileOk: 0,
    vanOk: 0,
    skipped: 0,
    failed: 0,
  };

  for (const driver of drivers) {
    console.log(`#${driver.id} ${driver.email || driver.full_name}`);

    try {
      const profile = await migrateField(driver, 'profile_image_url', 'profile');
      if (profile.skipped) {
        stats.skipped += 1;
        if (profile.reason !== 'empty') console.log(`  profile: skip (${profile.reason})`);
      } else {
        stats.profileOk += 1;
        console.log(`  profile: OK → ${profile.url}`);
      }
    } catch (err) {
      stats.failed += 1;
      console.error(`  profile: FAIL — ${err.message}`);
    }

    try {
      const van = await migrateField(driver, 'van_image_url', 'van');
      if (van.skipped) {
        stats.skipped += 1;
        if (van.reason !== 'empty') console.log(`  van: skip (${van.reason})`);
      } else {
        stats.vanOk += 1;
        console.log(`  van: OK → ${van.url}`);
      }
    } catch (err) {
      stats.failed += 1;
      console.error(`  van: FAIL — ${err.message}`);
    }

    // Gentle rate limit for Cloudinary free/paid tiers
    await sleep(350);
  }

  console.log('\nDone.');
  console.log(stats);
  await db.pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await db.pool.end();
  } catch (_) {}
  process.exit(1);
});
