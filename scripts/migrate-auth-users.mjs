// One-time migration: carry existing Supabase passwords into the new
// PostgreSQL members.temp_password column so users keep their passwords at
// cutover (no resets, no re-registration).
//
// Supabase stores passwords as bcrypt hashes in auth.users.encrypted_password.
// bcryptjs verifies those hashes as-is (see the signin route's "$2" branch),
// so we copy the hash verbatim.
//
// Usage:
//   1. In Supabase SQL Editor, export:
//        SELECT email, encrypted_password FROM auth.users
//        WHERE email IS NOT NULL AND deleted_at IS NULL ORDER BY created_at;
//      (Table → Export → CSV, or Copy → CSV with a header row.)
//   2. Run inside the app container (needs DATABASE_URL):
//        node scripts/migrate-auth-users.mjs /path/to/auth-users.csv
//
// Safe to run more than once: existing rows are updated in place.

import { readFileSync } from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/migrate-auth-users.mjs <auth-users.csv>");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

let imported = 0;
let skipped = 0;

const lines = readFileSync(file, "utf8").split("\n").slice(1).filter(Boolean);
for (const line of lines) {
  // email,encrypted_password  (fields cannot contain commas)
  const [email, hash] = line.split(",").map((s) => s.trim());
  if (!email || !hash) { skipped++; continue; }
  if (!hash.startsWith("$2")) {
    console.warn(`[skip] ${email}: hash does not look like bcrypt, left untouched`);
    skipped++;
    continue;
  }
  await pool.query(
    `INSERT INTO members (email, name, role, status, temp_password)
     VALUES ($1, '', 'participant', 'Active', $2)
     ON CONFLICT (email) DO UPDATE
       SET temp_password = EXCLUDED.temp_password, status = 'Active'`,
    [email.toLowerCase(), hash],
  );
  imported++;
}

await pool.end();
console.log(`Migrated ${imported} auth users (skipped ${skipped}).`);
