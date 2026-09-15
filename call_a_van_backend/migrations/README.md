# Legacy data migration

## File

`001_import_legacy_drivers.sql`

## What it does

1. Deletes all rows in `driver_locations` and `drivers` (**does not touch `admins`**)
2. Inserts the merged Supabase + Webflow driver union (78 drivers)
3. Inserts location pins where coords existed (offline, `is_live=false`)

## How to run

In Supabase SQL editor / `psql` against your Postgres DB:

```bash
psql "$DATABASE_URL" -f call_a_van_backend/migrations/001_import_legacy_drivers.sql
```

Or paste the file contents into the Supabase SQL editor and run.

## After import

- Legacy passwords are **Deno scrypt** hashes.
- Backend login accepts **bcrypt or scrypt**; on successful scrypt login the hash is upgraded to **bcrypt**.
- New signups / password resets always use bcrypt only.
- Admin accounts are unchanged.

## Migrate images to Cloudinary

After the SQL import, re-host Supabase/Webflow image URLs on Cloudinary:

```bash
cd call_a_van_backend

# Optional: preview only
node scripts/migrateImagesToCloudinary.js --dry-run

# Full migrate (uses .env Cloudinary + DB settings)
node scripts/migrateImagesToCloudinary.js

# Test on first 3 drivers
node scripts/migrateImagesToCloudinary.js --limit=3
```

Already-Cloudinary URLs are skipped unless you pass `--force`.

## Regenerate (if dumps change)

```bash
cd call_a_van_backend
node scripts/generateDataMigration.js
```
