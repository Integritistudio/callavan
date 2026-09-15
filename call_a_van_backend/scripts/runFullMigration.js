/**
 * Full legacy migration in one command:
 *   1) Generate SQL from datadump CSVs
 *   2) Flush drivers + locations and insert merged rows (admins untouched)
 *   3) Download images and upload to Cloudinary, update driver URLs
 *
 * Usage (from call_a_van_backend):
 *   node scripts/runFullMigration.js
 *
 * Flags:
 *   --skip-generate   Use existing migrations/001_import_legacy_drivers.sql
 *   --skip-sql        Skip DB import (images only)
 *   --skip-images     Skip Cloudinary image migration
 *   --dry-run-images  Pass --dry-run to image migrator
 *   --force-images    Pass --force to image migrator
 *   --limit=N         Pass --limit=N to image migrator
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const limitArg = args.find((a) => a.startsWith('--limit='));

function runNode(scriptRel, extraArgs = []) {
  const scriptPath = path.join(__dirname, scriptRel);
  console.log(`\n>>> node ${path.relative(process.cwd(), scriptPath)} ${extraArgs.join(' ')}\n`);
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${scriptRel} failed with exit code ${result.status}`);
  }
}

async function runSqlFile(sqlPath) {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`\n>>> Running SQL: ${sqlPath}\n`);
  await db.query(sql);
  console.log('SQL import finished.\n');
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '001_import_legacy_drivers.sql');

  if (!has('--skip-generate')) {
    runNode('generateDataMigration.js');
  } else {
    console.log('Skipping SQL generate (--skip-generate)');
  }

  if (!has('--skip-sql')) {
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Missing ${sqlPath}. Run without --skip-generate first.`);
    }
    await runSqlFile(sqlPath);
  } else {
    console.log('Skipping SQL import (--skip-sql)');
  }

  if (!has('--skip-images')) {
    const imageArgs = [];
    if (has('--dry-run-images')) imageArgs.push('--dry-run');
    if (has('--force-images')) imageArgs.push('--force');
    if (limitArg) imageArgs.push(limitArg);
    runNode('migrateImagesToCloudinary.js', imageArgs);
  } else {
    console.log('Skipping image migration (--skip-images)');
  }

  console.log('\n✅ Full migration complete.');
  await db.pool.end();
}

main().catch(async (err) => {
  console.error('\n❌ Migration failed:', err.message || err);
  try {
    await db.pool.end();
  } catch (_) {}
  process.exit(1);
});
