const crypto = require('crypto');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');

const scryptAsync = promisify(crypto.scrypt);

/**
 * Detect legacy Deno/denorg scrypt hashes (tarsnap-style base64 starting with c2NyeXB0).
 */
function isScryptHash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  return hash.startsWith('c2NyeXB0') || hash.startsWith('scrypt');
}

function isBcryptHash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  return /^\$2[aby]?\$/.test(hash);
}

/**
 * Verify a password against a denorg/Deno scrypt hash
 * (https://deno.land/x/scrypt — tarsnap/node-scrypt FORMAT).
 */
async function verifyScrypt(password, encodedHash) {
  try {
    const bytes = Buffer.from(encodedHash, 'base64');
    if (bytes.length !== 96) return false;
    if (bytes.subarray(0, 6).toString('utf8') !== 'scrypt') return false;
    if (bytes[6] !== 0) return false;

    const logN = bytes[7];
    const r = bytes.readUInt32BE(8);
    const p = bytes.readUInt32BE(12);
    if (logN < 1 || logN > 31) return false;

    const salt = bytes.subarray(16, 48);
    const checksum = bytes.subarray(48, 64);
    const storedHmac = bytes.subarray(64, 96);

    const header48 = bytes.subarray(0, 48);
    const sha = crypto.createHash('sha256').update(header48).digest();
    if (!crypto.timingSafeEqual(checksum, sha.subarray(0, 16))) {
      return false;
    }

    const N = 2 ** logN;
    // dkLen 64 — same as denorg/scrypt default for scrypt format
    const derived = await scryptAsync(password, salt, 64, {
      N,
      r,
      p,
      maxmem: 256 * 1024 * 1024,
    });

    const hmacKey = derived.subarray(32, 64);
    const header64 = bytes.subarray(0, 64);
    const computedHmac = crypto.createHmac('sha256', hmacKey).update(header64).digest();

    return crypto.timingSafeEqual(storedHmac, computedHmac);
  } catch (err) {
    console.error('scrypt verify error:', err.message);
    return false;
  }
}

/**
 * Verify password against bcrypt OR legacy scrypt.
 * New passwords must always be hashed with bcrypt only.
 *
 * @returns {{ ok: boolean, needsRehash: boolean }}
 */
async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) {
    return { ok: false, needsRehash: false };
  }

  if (isBcryptHash(storedHash)) {
    const ok = await bcrypt.compare(plainPassword, storedHash);
    return { ok, needsRehash: false };
  }

  if (isScryptHash(storedHash)) {
    const ok = await verifyScrypt(plainPassword, storedHash);
    return { ok, needsRehash: ok };
  }

  // Unknown format — try bcrypt as last resort (won't match junk)
  try {
    const ok = await bcrypt.compare(plainPassword, storedHash);
    return { ok, needsRehash: false };
  } catch {
    return { ok: false, needsRehash: false };
  }
}

async function hashPasswordBcrypt(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

module.exports = {
  verifyPassword,
  hashPasswordBcrypt,
  isScryptHash,
  isBcryptHash,
  verifyScrypt,
};
