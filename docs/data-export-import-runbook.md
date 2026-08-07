# Data Export / Import Runbook: Supabase → PostgreSQL

> **Project:** `toc-portal`
> **Applies to:** the Docker + PostgreSQL deployment (`docker-compose.yml`, `db/init/01-schema.sql`, `lib/db.ts`)
> **Versions:** Next.js 15.5.19 · React 19.0 · node:20-alpine · postgres:16-alpine · pg ^8.22.0 (node-postgres) · bcryptjs ^3.0.3
> **Goal:** move every byte from Supabase to the new PostgreSQL with zero data loss and zero user-facing change (same logins, same data, same URLs).

This is the operational companion to `zero-impact-migration-playbook.md`. It contains the exact export/import commands for the **actual** table schema (the older docs referenced renamed tables like `app_users`/`user_profiles`; the implementation uses 1:1 table names instead).

---

## 1. What lives where

Two separate concerns, two separate target tables:

| Supabase (source) | New PostgreSQL (target) | Notes |
|---|---|---|
| `auth.users` (email, `encrypted_password`, name, timestamps) | `users` | Authentication accounts — mirrors `auth.users` 1:1. `encrypted_password` is the bcrypt hash verbatim (NULL for Google OAuth users). `email_confirmed_at` is the Supabase `confirmed_at` timestamp. `raw_user_meta_data` / `raw_app_meta_data` are carried as-is. See §3.4. |
| `public.members` | `members` | Identical (8 columns: email, name, role, status, temp_password, client, created_at). `temp_password` is the admin-set invitation password (emailed to the invitee, consumed on first sign-in, then cleared). The user's permanent password lives in `users.encrypted_password`. |
| `public.profiles` | `profiles` | Identical (10 columns incl. `avatar_url`) |
| `public.notifications` | `notifications` | Identical (id uuid, 6 columns) |
| `public.course` | `course` | Identical single-row JSON doc |
| `public.course_progress` | `course_progress` | Identical (done text[], meta jsonb) |
| `public.clients` | `clients` | Identical single-row JSON doc |
| `public.toc` | `toc` | Identical per-learner JSON |
| `public.messages` | `messages` | Identical (id uuid, 6 columns) |
| `public.dms` | `dms` | Identical (id uuid, 7 columns) |
| `public.program_assignments` | *(not in app schema)* | Exists in Supabase but has 0 rows; preserve manually if it ever gains rows — see §5 |
| `storage.objects` (`course-files` bucket) | `public/uploads/` (Docker volume `uploads-data`) | Files downloaded from Supabase Storage, placed in the container volume, served at `/uploads/...`. Old URLs in `course.modules` and `profiles.avatar_url` updated via SQL — see §3.5.3 |

`programs`, the PM tables, `assumptions`, and `evidence` were **never deployed** to Supabase (the app used localStorage for them). They are excluded from the export queries below. `program_assignments` exists but is empty (0 rows); export it only if a future count shows rows.

---

## 2. Prerequisites

- The Docker stack is built and the `db` service is healthy:
  ```bash
  docker compose up -d --build
  docker compose ps            # db (healthy), portal (running)
  ```
  On first boot, `db/init/01-schema.sql` creates all tables (a fresh database gets them automatically; `lib/db.ts` also runs an equivalent inline schema lazily).
- The `users` table must be imported before `members` (foreign key dependency: `members.email` → `users.email`).
- Note the container name for the database is **`toc-portal-db`** (renamed to avoid a collision with the sibling TOCPortal project's `toc-db`).

---

## 3. Export from Supabase

All exports are done through the **Supabase SQL Editor** (the dashboard's SQL editor is the only tool you need). After running each query below, use the results panel's **"Download CSV"** button (or copy-paste the results into a `.csv` file).

> **Important:** Supabase's SQL Editor runs queries against the `public` schema by default. Queries referencing `auth.users` or `storage.objects` must include the schema prefix as shown. The `\copy` command does **not** work in the SQL Editor — use `SELECT` queries and download the results instead.

### 3.1 Pre-export inventory (run first — record every count)

Run this once to see exactly what you have. Write down every count — you will compare against them after import to prove nothing was lost.

```sql
-- Row counts for every table that might have data
select 'members' as tbl, count(*) from public.members
union all select 'profiles', count(*) from public.profiles
union all select 'notifications', count(*) from public.notifications
union all select 'course', count(*) from public.course
union all select 'course_progress', count(*) from public.course_progress
union all select 'clients', count(*) from public.clients
union all select 'toc', count(*) from public.toc
union all select 'messages', count(*) from public.messages
union all select 'dms', count(*) from public.dms
union all select 'program_assignments', count(*) from public.program_assignments
union all select 'auth_users (non-deleted)', count(*) from auth.users where deleted_at is null
union all select 'auth_users (total)', count(*) from auth.users
union all select 'storage_objects', count(*) from storage.objects;
```

### 3.2 Core application tables (export every one)

Run each `SELECT` below individually, then download the result as CSV. Save the files with the names shown — the import scripts in §4 reference them.

```sql
-- members (allowlist + invitations)
select * from public.members order by created_at;
-- Save as: members.csv

-- profiles ("Know Our Members")
select * from public.profiles order by email;
-- Save as: profiles.csv

-- notifications
select * from public.notifications order by created_at;
-- Save as: notifications.csv

-- course (single shared document)
select * from public.course;
-- Save as: course.csv

-- course_progress (per-learner completion)
select * from public.course_progress order by email;
-- Save as: course_progress.csv

-- clients (single shared directory)
select * from public.clients;
-- Save as: clients.csv

-- toc (per-learner Theory of Change)
select * from public.toc order by email;
-- Save as: toc.csv

-- messages (group chat per client)
select * from public.messages order by created_at;
-- Save as: messages.csv

-- dms (1:1 direct messages)
select * from public.dms order by created_at;
-- Save as: dms.csv
```

### 3.3 Optional table — export only if §3.1 count was > 0

`program_assignments` exists in Supabase but the app does not use it yet (the target schema does not include it). If it ever gains rows and you want to preserve them, create the table in the target first (see §5), then export:

```sql
select * from public.program_assignments order by created_at;
-- Save as: program_assignments.csv
```

### 3.4 Auth users → `users` table

`auth.users` holds the actual sign-in accounts. This migrates to a dedicated `users` table — separate from `members` (the invite allowlist). The two are linked by email.

The target `users` table (mirrors `auth.users`):

```sql
create table if not exists users (
  id                  uuid not null default gen_random_uuid() unique,
  email               text primary key,
  name                text not null default '',
  encrypted_password  text,                          -- NULL for Google OAuth users
  email_confirmed_at  timestamptz,                   -- Supabase confirmed_at
  last_sign_in_at     timestamptz,
  raw_user_meta_data  jsonb not null default '{}',
  raw_app_meta_data   jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

#### 3.4.1 Export users (required — loads into the `users` table)

```sql
select
  email,
  encrypted_password,
  coalesce(
    raw_user_meta_data->>'name',
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'user_name',
    split_part(email, '@', 1)
  ) as name,
  confirmed_at as email_confirmed_at,
  last_sign_in_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at
from auth.users
where email is not null and deleted_at is null
order by created_at;
-- Save as: auth-users.csv
```

Supabase hashes are bcrypt (`$2a$`/`$2b$`), which bcryptjs verifies as-is — users keep their exact passwords. Google OAuth users have NULL `encrypted_password`; they authenticate via Google, not a password. The `name` column is extracted from `raw_user_meta_data` with a fallback to the email prefix. Review `auth-users.csv` and fix any fallback names before importing.

#### 3.4.2 Members allowlist (already covered in §3.2)

The `members` table is copied 1:1 from Supabase (§3.2, `select *`). It holds the invite allowlist — email, name, role, status, temp_password, client, created_at. `temp_password` is the admin-set invitation password, distinct from the user's permanent `users.encrypted_password`.

> **Important:** After the migration, `members.email` references `users.email`. Import `auth-users.csv` (→ `users`) **before** `members.csv` (→ `members`), otherwise the foreign key constraint fails.

#### 3.4.3 Cross-check: auth users not in the members allowlist

These are users who signed up (exist in `auth.users`) but were never added to the invite allowlist (`public.members`). They will **lose access** after migration unless you add them. Run this query and review every row:

```sql
select a.email, a.created_at, a.last_sign_in_at,
       case when a.encrypted_password is null or a.encrypted_password = ''
            then 'google' else 'email' end as provider,
       coalesce(
         a.raw_user_meta_data->>'name',
         a.raw_user_meta_data->>'full_name',
         split_part(a.email, '@', 1)
       ) as display_name
from auth.users a
where a.deleted_at is null
  and lower(a.email) not in (select lower(m.email) from public.members m)
order by a.created_at;
```

**If this query returns rows:** for each user, decide whether to:
- **Add them to `members.csv`** before importing (set an appropriate role and client), or
- **Let them self-serve** post-cutover — Google users on an admin domain auto-create their members row on first sign-in; email/password users will need a password reset.

#### 3.4.4 Cross-check: members not in auth.users

Invitees who never signed up (a `members` row but no `auth.users` row). These are expected — they keep their invitation status. Their `users` row is created when they first sign in.

```sql
select m.email, m.role, m.status, m.created_at
from public.members m
where lower(m.email) not in (select lower(a.email) from auth.users a where a.deleted_at is null)
order by m.created_at;
```

### 3.5 Storage (uploaded files)

#### 3.5.1 List all stored objects

```sql
select name, bucket_id, owner, created_at,
       (metadata->>'size')::bigint as size_bytes,
       (metadata->>'mimetype') as mime_type
from storage.objects
where bucket_id = 'course-files'
order by created_at;
-- Save as: storage-objects.csv (for reference)
```

#### 3.5.2 Download the files

Option A — Supabase Dashboard: go to **Storage → course-files**, select all files, click **Download**. Option B — Supabase CLI:

```bash
supabase storage download course-files --local-path ./course-files-export
```

If you have neither, the `storage.objects` query above lists every file name and its metadata, so nothing is lost.

On the new server these files go into the persistent `uploads-data` volume (`/app/public/uploads` inside the `portal` container, served at `/uploads/...`). Copy them in:

```bash
docker cp ./course-files-export/. toc-portal:/app/public/uploads/
```

#### 3.5.3 Update stored URLs in the database

After cutover, the old Supabase Storage public URLs (e.g. `https://evwzlgzticnblpdqphus.supabase.co/storage/v1/object/public/course-files/...`) are dead. Two database columns reference them:

| Column | Table | Format |
|---|---|---|
| `avatar_url` | `profiles` | Full Supabase Storage URL (one per profile) |
| `url` | `course.modules` JSONB | Inside `Resource.url` for File/PDF/Image resources |

**Replace the Supabase Storage base URL** with `/uploads/` so existing course materials and avatars keep working. Run this SQL against the new PostgreSQL **after** importing the CSVs and copying the files:

```sql
-- 1. Profile avatars: replace the Supabase Storage base URL
UPDATE profiles
SET avatar_url = regexp_replace(
  avatar_url,
  '^https://[^/]+/storage/v1/object/public/course-files/',
  '/uploads/'
)
WHERE avatar_url LIKE '%supabase.co/storage/v1/object/public/course-files/%';

-- 2. Course resources (inside the `modules` JSONB column): replace every
--    Resource.url that points to Supabase Storage. The modules column is a
--    JSON array of module objects, each with a resources array.
UPDATE course
SET modules = regexp_replace(
  modules::text,
  'https://[^/]+/storage/v1/object/public/course-files/',
  '/uploads/',
  'g'
)::jsonb
WHERE modules::text LIKE '%supabase.co/storage/v1/object/public/course-files/%';
```

**Verify** after running:

```sql
-- Should return 0 rows — no remaining Supabase Storage URLs
SELECT email, avatar_url FROM profiles
WHERE avatar_url LIKE '%supabase.co%';

-- Should return 0 rows
SELECT id FROM course
WHERE modules::text LIKE '%supabase.co%';
```

> **Note:** Profile avatars also have a per-browser localStorage cache (`toc-avatar:{email}`). This cache self-heals: the next time a user saves their profile, the new `/uploads/...` URL overwrites the stale cache. No action needed.

---

## 4. Import into PostgreSQL

```bash
# Step 1 — Users (auth accounts). MUST run before members (FK dependency).
docker cp auth-users.csv toc-portal-db:/tmp/auth-users.csv
docker exec -i toc-portal-db psql -U toc_user -d toc_db \
  -c "\copy users from '/tmp/auth-users.csv' with (format csv, header true)"

# Step 2 — Core tables (members, profiles, notifications, etc.)
for t in members profiles notifications course course_progress clients toc messages dms; do
  docker cp $t.csv toc-portal-db:/tmp/$t.csv
  docker exec -i toc-portal-db psql -U toc_user -d toc_db \
    -c "\copy $t from '/tmp/$t.csv' with (format csv, header true)"
done
```

Or pipe without copying:

```bash
cat members.csv | docker exec -i toc-portal-db psql -U toc_user -d toc_db \
  -c "\copy members from stdin with (format csv, header true)"
```

Then verify row counts match the Supabase counts:

```bash
docker exec -i toc-portal-db psql -U toc_user -d toc_db -c \
  "select 'users' as t, count(*) from users
   union all select 'members', count(*) from members
   union all select 'profiles', count(*) from profiles
   union all select 'notifications', count(*) from notifications
   union all select 'course', count(*) from course
   union all select 'course_progress', count(*) from course_progress
   union all select 'clients', count(*) from clients
   union all select 'toc', count(*) from toc
   union all select 'messages', count(*) from messages
   union all select 'dms', count(*) from dms;"
```

Also verify no Supabase Storage URLs remain in the database after running the §3.5.3 URL replacement:

```bash
docker exec -i toc-portal-db psql -U toc_user -d toc_db -c \
  "SELECT 'profile avatars' AS src, count(*) AS stale FROM profiles WHERE avatar_url LIKE '%supabase.co%'
   UNION ALL
   SELECT 'course resources', count(*) FROM course WHERE modules::text LIKE '%supabase.co%';"
# Both rows must show 0.
```

### 4.1 Passwords (already handled by the `users` import)

The CSV import in Step 1 above already loads `encrypted_password` into the `users` table. No separate migration script is needed — `auth-users.csv` carries the bcrypt hashes in the `encrypted_password` column, and the `\copy` loads them directly.

Verify that every email/password user has a bcrypt hash and every Google user has NULL:

```bash
docker exec -i toc-portal-db psql -U toc_user -d toc_db -c \
  "SELECT
     count(*) FILTER (WHERE encrypted_password IS NOT NULL AND encrypted_password LIKE '\$2%') AS email_users,
     count(*) FILTER (WHERE encrypted_password IS NULL) AS google_users,
     count(*) FILTER (WHERE encrypted_password IS NOT NULL AND encrypted_password NOT LIKE '\$2%') AS needs_review
   FROM users;"
-- needs_review must be 0.

---

## 5. Column note for `program_assignments`

The app does not use this table yet, so it is not in the target schema. If it has rows and you want to preserve them, create it in the target before importing:

```sql
create table if not exists program_assignments (
  id          uuid primary key default gen_random_uuid(),
  program_id  text not null,
  email       text not null,
  assigned_by text not null default '',
  created_at  timestamptz not null default now(),
  unique (program_id, email)
);
```

---

## 6. Verification before cutover (no user impact)

1. **Logins** — sign in with 5+ real accounts on the new server using their existing passwords (proves §4.1). Also test one Google sign-in.
2. **Spot-check 3 users**: profile name + avatar, completed resources, quiz scores/worksheets (`course_progress.meta`), TOC documents, notifications.
3. **Live writes** — complete a resource and toggle a program task; confirm they persist after a container restart (also confirms the `id` defaults on `notifications`/`messages`/`dms`).
4. **Email** — trigger an invite and a password reset; confirm both send (Brevo) and the reset link works end to end.
5. **Uploads** — upload a course file, restart the `portal` container, confirm the file is still served (`/uploads/...`).

---

## 7. Final delta sync (immediately before DNS switch)

Any rows written to Supabase after your first export must be carried over so nothing created in the gap is lost.

1. Note the exact export time (or use the max `updated_at` in each export).
2. Just before cutover, export only newer rows (use the SQL Editor, download each result as CSV):
   ```sql
   select * from public.members where created_at > '<EXPORT_TIMESTAMP>';
   select * from public.profiles where updated_at > '<EXPORT_TIMESTAMP>';
   select * from public.course_progress where updated_at > '<EXPORT_TIMESTAMP>';
   select * from public.notifications where created_at > '<EXPORT_TIMESTAMP>';
   select * from public.messages where created_at > '<EXPORT_TIMESTAMP>';
   select * from public.dms where created_at > '<EXPORT_TIMESTAMP>';
   select * from public.toc where updated_at > '<EXPORT_TIMESTAMP>';
   -- Tables without timestamps (course, clients): export the whole row.
   select * from public.course;
   select * from public.clients;
   -- Auth: any new signups since initial export
   select email, encrypted_password from auth.users
   where deleted_at is null and created_at > '<EXPORT_TIMESTAMP>';
   ```
3. Import with upsert semantics so nothing duplicates:
   ```bash
   docker exec -i toc-portal-db psql -U toc_user -d toc_db \
     -c "\copy course_progress from 'delta_course_progress.csv' with (format csv, header true, on_conflict do update)"
   ```
   (`\copy` supports `on_conflict do update` for single-column primary keys; for composite ones use a temp table + `INSERT ... ON CONFLICT (email) DO UPDATE`.)
4. For any new accounts created during the delta window, re-export `auth.users` into a fresh `delta-auth-users.csv` (same query as §3.4.1) and import via the same `\copy users` command.
5. Re-verify the affected row counts, then flip DNS.

---

## 8. Rollback

Supabase stays untouched throughout. If anything is wrong after the DNS switch, point DNS back at Vercel: users are back on Supabase within a minute, and the new server can be debugged without pressure. Keep the Supabase project (paused, not deleted) for at least 30 days.
