import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'web-analytics.json');

export const ANALYTICS_EVENTS = [
  'Become driver',
  'Login clicked',
  'Go live',
  'End session',
  'Profile viewed',
  'Call button',
  'Logged in',
  'Signed up',
  'Edit profile',
];

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ events: [] }, null, 2), 'utf8');
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return { events: [] };
  }
}

async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function verifyAdminToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_123!';
  const [header, payload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  const provided = signature;
  if (expected.length !== provided.length) return false;
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload));
    if (!data?.isAdmin) return false;
    if (data.exp && data.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function detectDevice(userAgent = '') {
  const ua = userAgent || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  return `${isMobile ? 'Mobile' : 'Desktop'} · ${os}`;
}

export async function appendAnalyticsEvent(entry) {
  const store = await readStore();
  const event = {
    id: crypto.randomUUID(),
    when: new Date().toISOString(),
    event: entry.event,
    userType: entry.userType || 'guest',
    userEmail: entry.userEmail || '',
    driverEmail: entry.driverEmail || '',
    device: entry.device || 'Unknown',
  };
  store.events.unshift(event);
  // Keep last 5000 events to avoid unbounded growth
  if (store.events.length > 5000) {
    store.events = store.events.slice(0, 5000);
  }
  await writeStore(store);
  return event;
}

export async function getAnalyticsSummary({ limit = 100 } = {}) {
  const store = await readStore();
  const counts = Object.fromEntries(ANALYTICS_EVENTS.map((name) => [name, 0]));
  for (const row of store.events) {
    if (counts[row.event] !== undefined) counts[row.event] += 1;
  }
  return {
    counts,
    events: store.events.slice(0, Math.min(Math.max(limit, 1), 500)),
    totalEvents: store.events.length,
  };
}
