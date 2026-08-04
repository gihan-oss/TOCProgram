# Data Export / Import Runbook: Supabase → PostgreSQL

> **Project:** `toc-portal`
> **Applies to:** the Docker + PostgreSQL deployment (`docker-compose.yml`, `db/init/01-schema.sql`, `lib/db.ts`)
> **Versions:** Next.js 15.5.19 · React 19.0 · node:20-alpine · postgres:16-alpine · pg ^8.22.0 (node-postgres) · bcryptjs ^3.0.3
> **Goal:** move every byte from Supabase to the new PostgreSQL with zero data loss and zero user-facing change (same logins, same data, same URLs).

This is the operational companion to `zero-impact-migration-playbook.md`. It contains the exact export/import commands for the **actual** table schema (the older docs referenced renamed tables like `app_users`/`user_profiles`; the implementation uses 1:1 table names instead).

---

## 1. What lives where

| Supabase (source) | New PostgreSQL (target) | Notes |
|---|---|---|
| `auth.users` (email + `encrypted_password`) | `members.temp_password` | bcrypt hashes copied verbatim by `scripts/migrate-auth-users.mjs` (email/password users only; Google OAuth users are skipped — they sign in via Google on the new server too) |
| `auth.users` metadata (`created_at`, `last_sign_in_at`, `confirmed_at`, `raw_user_meta_data`, `raw_app_meta_data`) | *(no matching target columns)* | Export as `auth-users-reference.csv` for audit/reference only — the current `members` table has no columns for these (see §3.4.2) |
| `public.members` | `members` | Same columns (email, name, role, status, temp_password, client, created_at) |
| `public.profiles` | `profiles` | Same columns incl. `avatar_url` |
| `public.notifications` | `notifications` | `id` uuid → text; new schema defaults `id` to `gen_random_uuid()::text` |
| `public.course` | `course` | Identical single-row JSON doc |
| `public.course_progress` | `course_progress` | Identical (done text[], meta jsonb) |
| `public.clients` | `clients` | Identical single-row JSON doc |
| `public.toc` | `toc` | Identical per-learner JSON |
| `public.messages` | `messages` | `id` uuid → text; default generated |
| `public.dms` | `dms` | `id` uuid → text; default generated |
| `public.programs` + PM tables | `programs` / `program_tasks` / `program_financials` / `program_indicators` / `program_budget_lines` | See column notes in §5 |
| `public.assumptions` / `public.evidence` | `assumptions` / `evidence` | Mostly identical |
| `public.program_assignments` | *(not in app schema)* | Preserve manually if it has rows — see §5 |

Per the earlier migration docs, `programs`, the PM tables, `assumptions`, `evidence` and `program_assignments` were **not deployed** to Supabase (the app ran those on localStorage), so they are normally empty. Export them anyway and include them only if their row counts are non-zero.

---

## 2. Prerequisites

- The Docker stack is built and the `db` service is healthy:
  ```bash
  docker compose up -d --build
  docker compose ps            # db (healthy), portal (running)
  ```
  On first boot, `db/init/01-schema.sql` creates all tables (a fresh database gets them automatically; `lib/db.ts` also runs an equivalent inline schema lazily).
- A `scripts/migrate-auth-users.mjs` run needs `DATABASE_URL` — inside the `portal` container it is already set.
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
union all select 'programs', count(*) from public.programs
union all select 'program_tasks', count(*) from public.program_tasks
union all select 'program_financials', count(*) from public.program_financials
union all select 'program_indicators', count(*) from public.program_indicators
union all select 'program_budget_lines', count(*) from public.program_budget_lines
union all select 'assumptions', count(*) from public.assumptions
union all select 'evidence', count(*) from public.evidence
union all select 'auth_users (non-deleted)', count(*) from auth.users where deleted_at is null
union all select 'auth_users (total)', count(*) from auth.users
union all select 'storage_objects', count(*) from storage.objects;
```

### 3.2 Core application tables (export every one)

Run each `SELECT` below individually, then download the result as CSV. Save the files with the names shown — the import scripts in §4 reference them.

```sql
-- members (allowlist + invitations)
select email, name, role, status, temp_password, client, created_at
from public.members order by created_at;
-- Save as: members.csv

-- profiles ("Know Our Members")
select email, name, role_type, department, commitment, tenure, skills, onboarded, avatar_url, updated_at
from public.profiles order by email;
-- Save as: profiles.csv

-- notifications
select id, email, title, body, read, created_at
from public.notifications order by created_at;
-- Save as: notifications.csv

-- course (single shared document)
select id, modules, updated_at from public.course;
-- Save as: course.csv

-- course_progress (per-learner completion)
select email, done, meta, updated_at
from public.course_progress order by email;
-- Save as: course_progress.csv

-- clients (single shared directory)
select id, data, updated_at from public.clients;
-- Save as: clients.csv

-- toc (per-learner Theory of Change)
select email, data, updated_at from public.toc order by email;
-- Save as: toc.csv

-- messages (group chat per client)
select id, client, email, name, body, created_at
from public.messages order by created_at;
-- Save as: messages.csv

-- dms (1:1 direct messages)
select id, from_email, to_email, from_name, body, read, created_at
from public.dms order by created_at;
-- Save as: dms.csv
```

### 3.3 Optional tables — export only if §3.1 counts were > 0

Most of these tables were not deployed to Supabase (the app used localStorage for them), so they are normally empty. If any counts were non-zero, export them with the queries below (see §5 for column-specific notes).

```sql
select * from public.program_assignments order by created_at;
-- Save as: program_assignments.csv

select id, data, email, name, area, sub_focus, question_zero, input, baseline, target,
       outcome, decision, status, budget, department, region,
       coalesce((select array_agg(x::text) from jsonb_array_elements_text(team) x), '{}') as team,
       updated_at
from public.programs;
-- Save as: programs.csv

select * from public.program_tasks order by created_at;
-- Save as: program_tasks.csv

select * from public.program_financials order by created_at;
-- Save as: program_financials.csv

select * from public.program_indicators order by created_at;
-- Save as: program_indicators.csv

select * from public.program_budget_lines order by created_at;
-- Save as: program_budget_lines.csv

select * from public.assumptions order by created_at;
-- Save as: assumptions.csv

select id, email, name, kind, tags, linked_to, uploaded_by, date, created_at
from public.evidence order by created_at;
-- Save as: evidence.csv
-- (columns file_path and file_url are omitted — the target schema doesn't have them)
```

### 3.4 Auth users (passwords + reference metadata)

This is the most critical export — it determines whether users can sign in after cutover.

> **Important:** The target `members` table only stores the bcrypt password hash (`temp_password`). It does NOT have columns for `created_at`, `last_sign_in_at`, `confirmed_at`, `raw_user_meta_data`, or `raw_app_meta_data` from `auth.users`. Export the full metadata anyway (§3.4.2) — you'll want it for audit, support, and troubleshooting post-cutover.

#### 3.4.1 Password hashes (required — feeds `scripts/migrate-auth-users.mjs`)

```sql
select email, encrypted_password from auth.users
where email is not null and deleted_at is null
order by created_at;
-- Save as: auth-users.csv
```

Supabase hashes are bcrypt (`$2a$`/`$2b$`), which bcryptjs verifies as-is — users keep their exact passwords. Rows where `encrypted_password` is NULL or empty are **Google sign-in users** (they authenticate via OAuth, not a password); the migration script skips those automatically. Google users will continue to sign in via Google on the new server (the signin route auto-creates their `members` row on first login if they match the admin domain or are already in the allowlist).

#### 3.4.2 Full auth metadata (recommended — audit & reference)

Export every `auth.users` column for your records. The target `members` table cannot store most of these, but you'll want this CSV if you need to answer "when did user X last sign in?" or "was user Y email-verified?" post-cutover.

```sql
select
  email,
  encrypted_password,
  created_at        as signed_up_at,
  updated_at        as auth_updated_at,
  last_sign_in_at   as last_login_at,
  confirmed_at      as email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  case when encrypted_password is null or encrypted_password = ''
       then 'google' else 'email' end as auth_provider
from auth.users
where deleted_at is null
order by created_at;
-- Save as: auth-users-reference.csv
```

**What this tells you (reference only — not imported):**
- **`signed_up_at`** — original account creation date. The target `members.created_at` comes from `public.members.created_at` (the invitation date), which may differ.
- **`last_login_at`** — who has been active. No equivalent column in the new schema.
- **`email_confirmed_at`** — whether the user verified their email.
- **`auth_provider`** — separates Google sign-in users from email/password users at a glance.
- **`raw_user_meta_data`** — may contain `name`, `full_name`, or `avatar_url` captured during Supabase sign-up. Compare with `public.members.name` and `public.profiles.name` to spot discrepancies.

#### 3.4.3 Cross-check: auth users not in the members allowlist

These are users who exist in Supabase Auth but are missing from `public.members`. They will **lose access** after migration unless you add them to the `members` table. Run this query and review every row:

```sql
select a.email, a.created_at, a.last_sign_in_at,
       case when a.encrypted_password is null or a.encrypted_password = ''
            then 'google' else 'email' end as provider
from auth.users a
where a.deleted_at is null
  and lower(a.email) not in (select lower(m.email) from public.members m)
order by a.created_at;
```

**If this query returns rows:** decide whether to add those emails to the `members` CSV before importing, or handle them as new sign-ups post-cutover (Google users will auto-create on first sign-in if they match the admin domain; email users will need a password reset).

#### 3.4.4 Cross-check: members not in auth.users

Invitees who never signed up (they have a `members` row but no `auth.users` row). These are expected — they keep their invitation status:

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

---

## 4. Import into PostgreSQL

```bash
# Core tables — import each CSV. All CSVs have the same columns as their
# target tables, so plain \copy works.
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
  "select 'members' as t, count(*) from members
   union all select 'profiles', count(*) from profiles
   union all select 'notifications', count(*) from notifications
   union all select 'course', count(*) from course
   union all select 'course_progress', count(*) from course_progress
   union all select 'clients', count(*) from clients
   union all select 'toc', count(*) from toc
   union all select 'messages', count(*) from messages
   union all select 'dms', count(*) from dms;"
```

### 4.1 Passwords

Copy `auth-users.csv` into the `portal` container and run the migration script:

```bash
docker cp auth-users.csv toc-portal:/tmp/auth-users.csv
docker exec -i toc-portal node scripts/migrate-auth-users.mjs /tmp/auth-users.csv
# expect: Migrated <N> auth users (skipped <M>).
```

This upserts `members.temp_password` (bcrypt) and sets `status = 'Active'` for every email/password user — so existing logins work immediately. Skipped rows are Google sign-in users (no bcrypt hash in `encrypted_password`).

> **Note:** `public.members.created_at` (exported in `members.csv`) is preserved during the CSV import. The migration script does NOT overwrite `created_at` — it only touches `temp_password` and `status`. The `auth.users.created_at` (account creation date) and `public.members.created_at` (invitation date) may differ; keep `auth-users-reference.csv` from §3.4.2 if you need the original signup dates.

---

## 5. Column notes for the optional tables

Import these only if the §3.1 counts were non-zero.

- **`programs`** — target `team` is `text[]`, source is `jsonb`. The SELECT query in §3.3 already handles the `jsonb_array_elements_text` transform. Source has no `created_at`; the target defaults it to `now()`.
- **`program_tasks` / `program_financials` / `program_indicators`** — source ids are uuid, dates are `date`/`timestamptz`; target ids are `text`. The CSV import casts values to text automatically, so plain `select *` exports work.
- **`evidence`** — source has extra `file_path`/`file_url` columns the target lacks. The SELECT query in §3.3 already excludes them.
- **`program_assignments`** — the app does not use this table yet, so it is not in the target schema. If it has rows and you want to preserve them, create it in the target before importing:
  ```sql
  create table if not exists program_assignments (
    id          text primary key default gen_random_uuid()::text,
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
4. Re-run `migrate-auth-users.mjs` on the delta `auth-users.csv` for any new accounts.
5. Re-verify the affected row counts, then flip DNS.

---

## 8. Rollback

Supabase stays untouched throughout. If anything is wrong after the DNS switch, point DNS back at Vercel: users are back on Supabase within a minute, and the new server can be debugged without pressure. Keep the Supabase project (paused, not deleted) for at least 30 days.
