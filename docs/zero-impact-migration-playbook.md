# Zero-Impact Migration Playbook

> **Status:** Draft for coordinator review  
> **Date:** 2026-08-03  
> **Project:** `toc-portal` (currently on Vercel + Supabase)  
> **Principle:** Users must not notice the migration. No downtime. No password resets. No data loss. No emails asking them to do anything.

---

## Prerequisites: What Must Be Done Before Cutover Day

This playbook covers the **operational cutover** — the steps to flip traffic from Vercel to the new Docker server without users noticing. Before any of these steps can run, the code changes described in the companion document must be completed:

- **`docs/supabase-to-docker-migration.md`** — full technical implementation: schema, auth server, API routes, Google OAuth, store rewrites, Dockerfile and docker-compose updates, dependency changes.
- **`docs/code-changes-supabase-to-local-db.md`** — exactly which files change, before/after patterns, what each of the 9 client files loses and gains.
- **`docs/data-export-import-runbook.md`** — the exact export/import commands (matching the real table schema), password migration, delta sync and verification steps.

In short, the following must already be merged and working on a branch **before** this playbook's Phase 1 begins:

```
□ db/init/01-schema.sql created (all 14 tables)
□ lib/db.ts created (pg Pool)
□ lib/auth-server.ts created (bcrypt + Google OAuth + HMAC sessions)
□ app/api/auth/* routes created (signin, signup, signout, session, reset)
□ All data API routes created (profile, notifications, members, course, progress, clients, programs, pm, chat)
□ components/auth.tsx updated (replaces Supabase Auth with our session API + Google)
□ app/login/page.tsx updated (Google Sign-In button added)
□ All client stores updated (Supabase calls → API calls, localStorage fallback kept)
□ docker-compose.yml updated (db service + DATABASE_URL + AUTH_SECRET + GOOGLE_CLIENT_ID)
□ Dockerfile updated (ws-server build stage)
□ supervisord.conf updated (ws-server program)
□ package.json updated (@supabase/* removed, pg + bcryptjs + google-auth-library + ws added)
□ Google Cloud OAuth client ID created
```

---

## The Core Strategy: Parallel Run, Then Cut

```
                    ┌──────────────────┐
                    │   Your Domain    │
                    │  (DNS → Vercel)  │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐          ┌────────▼────────┐
     │  OLD (Vercel)   │          │  NEW (Docker)   │
     │  ─────────────  │          │  ─────────────  │
     │  Supabase Auth   │          │  PostgreSQL 16  │
     │  Supabase DB     │          │  Self-hosted    │
     │  (LIVE — users)  │          │  (STAGING only) │
     └─────────────────┘          └─────────────────┘
```

**Key insight:** The new Docker server runs in **staging mode** (pointing at imported production data) while real users continue on Vercel untouched. Only when every check passes do we flip DNS. If anything goes wrong, we flip back — users never see a difference.

---

## Phase 1: Prep (No User Impact — All Behind the Scenes)

### Step 1.1 — Snapshot Supabase Data

**When:** Any time. Takes ~10 minutes. Zero user effect — Supabase stays live.

```sql
-- ═══════════════════════════════════════════════════════════════
-- 1. AUTH USERS — complete export (every column preserved)
-- ═══════════════════════════════════════════════════════════════
SELECT
  id, email, encrypted_password, email_confirmed_at,
  last_sign_in_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  phone, banned_until, is_sso_user
FROM auth.users
WHERE email IS NOT NULL AND deleted_at IS NULL
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════
-- 2. AUTH IDENTITIES — OAuth-linked accounts
-- ═══════════════════════════════════════════════════════════════
SELECT
  id, user_id, provider, email, identity_data,
  created_at, updated_at, last_sign_in_at
FROM auth.identities
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════
-- 3. APPLICATION TABLES — 10 active tables only
-- ═══════════════════════════════════════════════════════════════
COPY (SELECT * FROM public.members ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.profiles ORDER BY email) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.notifications ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.course) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.course_progress ORDER BY email) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.clients) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.toc ORDER BY email) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.messages ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.dms ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.program_assignments ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
```

> **Tables not exported** (exist in `supabase/schema.sql` but not deployed to Supabase — run on localStorage only): `programs`, `program_budget_lines`, `program_financials`, `program_tasks`, `program_indicators`, `assumptions`, `evidence`. These get fresh PostgreSQL tables on the new server — nothing to migrate.

**Verify:** Count rows in each CSV. Match against `SELECT count(*)` on each Supabase table. Write numbers down.

### Step 1.2 — Set Up Docker Server

**When:** Any time. Zero user effect — it's a new machine.

```bash
# On the target server
git clone <repo> /opt/toc-portal
cd /opt/toc-portal

# Create .env with real values
cat > .env << 'EOF'
POSTGRES_PASSWORD=<generate strong random>
AUTH_SECRET=<generate 64-char random>
GOOGLE_CLIENT_ID=<from GCP console>
ANTHROPIC_API_KEY=<same as Vercel>
BREVO_API_KEY=<same as Vercel>
EMAIL_FROM=<same as Vercel>
EOF

# Build and start
docker compose up -d --build

# Verify it's running
curl http://localhost:3000/health
# → "ok"
```

### Step 1.3 — Import Data into New PostgreSQL

**When:** After Docker is up. Zero user effect — data goes to the new DB, Supabase still serves live users.

```bash
# Import each CSV (map table names as needed)
docker cp members.csv toc-portal-db:/tmp/
docker exec -i toc-portal-db psql -U toc_user -d toc_db \
  -c "\COPY app_members FROM '/tmp/members.csv' WITH (FORMAT csv, HEADER true)"

# Repeat for all tables...
# Key: verify row counts match after each import
docker exec -i toc-portal-db psql -U toc_user -d toc_db \
  -c "SELECT 'app_users' as tbl, count(*) FROM app_users
      UNION ALL SELECT 'app_members', count(*) FROM app_members
      UNION ALL SELECT 'user_profiles', count(*) FROM user_profiles
      UNION ALL SELECT 'app_notifications', count(*) FROM app_notifications
      UNION ALL SELECT 'course_doc', count(*) FROM course_doc
      UNION ALL SELECT 'course_progress', count(*) FROM course_progress
      UNION ALL SELECT 'clients_doc', count(*) FROM clients_doc
      UNION ALL SELECT 'toc_docs', count(*) FROM toc_docs
      UNION ALL SELECT 'chat_messages', count(*) FROM chat_messages
      UNION ALL SELECT 'direct_messages', count(*) FROM direct_messages
      UNION ALL SELECT 'program_assignments', count(*) FROM program_assignments
      "
```

### Step 1.4 — Verify Login Works (Staging)

**When:** After data import. Zero user effect — we test with real data but on the new server only.

```bash
# Test email/password sign-in using a real user from the export
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"real-user@example.com","password":"their-actual-password"}'
# → {"ok":true,"user":{"email":"real-user@example.com",...}}

# Test session persistence
# (use the Set-Cookie from above)
curl http://localhost:3000/api/auth/session \
  -H "Cookie: toc_session=<token from above>"
# → {"user":{"email":"real-user@example.com",...}}
```

**If this fails:** The bcrypt hash didn't transfer. Check the export. This is why we test before DNS switch.

### Step 1.5 — Spot-Check Data Integrity

**When:** After import. Zero user effect — read-only checks on the new DB.

Pick 3–5 real users and verify:
```
□ Their name matches in user_profiles
□ Their course progress (done resources) matches
□ Their TOC documents are intact
□ Their program assignments are correct
□ Their notifications are there
```

---

## Phase 2: Parallel Run (Both Systems Live)

### Step 2.1 — Point a Test Subdomain at the New Server

**When:** After Phase 1 passes. Zero user effect — users don't know about the test subdomain.

```
DNS: staging.yourdomain.com → NEW SERVER IP
DNS: app.yourdomain.com     → VERCEL (unchanged — users still go here)
```

### Step 2.2 — Smoke Test on Staging Domain

**When:** After DNS propagates (~1 hour). Zero user effect — only you visit staging.

```
□ Open staging.yourdomain.com in browser
□ Sign in with email/password (real account)
□ Sign in with Google
□ Navigate all main pages: Dashboard, Programs, Learning, People, Chat
□ Create a test program (verify it saves)
□ Complete a course resource (verify progress saves)
□ Check notifications appear
□ Verify the test data you created doesn't affect production (different DB!)
```

### Step 2.3 — Wait 24 Hours

**Why:** Let any issues surface. Check server logs. Verify PostgreSQL isn't crashing. Verify memory/CPU usage is stable. Users are still on Vercel — unaffected.

---

## Phase 3: Final Sync & Cutover (The Only User-Visible Step)

This is the **only** phase where users could be affected. We minimize it to under 5 minutes.

### Step 3.1 — Announce a Maintenance Window (Optional but Polite)

```
"We're upgrading our infrastructure. The portal will be briefly unavailable 
on [DATE] at [TIME] for approximately 5 minutes. No action is needed from you."
```

Send via Brevo email 24h before, and again 1h before.

### Step 3.2 — Final Data Sync

**When:** Immediately before DNS switch. The goal: capture any data created between the initial export and now.

```sql
-- In Supabase SQL Editor, export only rows created/updated AFTER your initial export:
SELECT * FROM public.profiles WHERE updated_at > '2026-08-02T00:00:00Z';
SELECT * FROM public.course_progress WHERE updated_at > '2026-08-02T00:00:00Z';
SELECT * FROM public.programs WHERE updated_at > '2026-08-02T00:00:00Z';
-- ... do this for every table with an updated_at or created_at column

-- For tables WITHOUT timestamps (course, clients, members):
-- Export the whole table again and use ON CONFLICT upsert during import
```

Import these delta rows into the new DB using `ON CONFLICT ... DO UPDATE` to merge without duplicates.

### Step 3.3 — Put Vercel in Read-Only Mode (Optional, 0–5 min downtime)

If you want zero risk of split-brain writes:

```bash
# Option A: Deploy a maintenance page to Vercel (takes ~30 sec)
# Option B: Add a middleware that redirects POST/PUT/DELETE to a "under maintenance" page
# Option C: Just do the DNS switch — the window between last write on old 
#           and first write on new is ~2 minutes of DNS propagation
```

### Step 3.4 — Flip DNS

**When:** After final sync confirmed. **Duration: DNS TTL — set to 60 seconds beforehand.**

```
Before (set TTL to 60s, 24h in advance):
  app.yourdomain.com  A  300  →  VERCEL_IP

Change to (during cutover):
  app.yourdomain.com  A  60   →  NEW_SERVER_IP
```

```
Timeline:
  T+0:00   Change DNS record
  T+0:01   Most DNS resolvers see new record (TTL was 60s)
  T+0:05   All traffic flowing to new server
  T+0:10   Verify: no errors in new server logs, users signing in successfully
  T+1:00   Set TTL back to 300 (5 min) for normal operation
```

### Step 3.5 — Verify Live Traffic

**When:** Minutes after DNS switch.

```
□ Monitor new server logs: docker compose logs -f portal
□ Check for 500 errors
□ Check PostgreSQL connection pool: no connection exhaustion
□ Sign in yourself on the production URL
□ Ask 1–2 trusted users to confirm they can sign in
```

### Step 3.6 — Rollback If Needed (Under 2 Minutes)

If anything is wrong:

```
1. Change DNS back to VERCEL_IP
2. Users are back on Supabase within 60 seconds
3. Debug the new server without pressure
4. Try again when fixed
```

**Supabase is never touched during cutover** — it's still there, still has all data, still works. The rollback is just a DNS change.

---

## Phase 4: Post-Migration (Days After)

### Week 1 — Monitor

```
□ Daily: check PostgreSQL disk usage, connection count, slow queries
□ Daily: check server RAM/CPU (docker stats)
□ Daily: verify new user sign-ups work (both email and Google)
□ Set up automated daily pg_dump to off-server storage
```

### Week 2–4 — Clean Up

```
□ Remove Vercel deployment (keep the project for another 30 days just in case)
□ Keep Supabase project paused (not deleted) for 30 days
□ After 30 days with zero issues: delete Supabase project
□ Update any documentation/hardcoded URLs that pointed to Supabase
```

---

## Summary: Why Users Notice Nothing

| Concern | How We Prevent It |
|---|---|
| **Downtime** | DNS switch takes ~60 seconds. Most users won't even reload during that window. |
| **Password reset** | bcrypt hashes exported as-is from Supabase. Same password works on new server. |
| **Data loss** | Final delta sync captures every row created between initial export and cutover. |
| **Wrong server** | Both run in parallel. Staging tested for 24h+ before DNS switch. |
| **Login failure** | Google sign-in is live as fallback. If password auth breaks for any user, Google works. |
| **Rollback panic** | DNS flip-back takes 60 seconds. Supabase is never deleted. |
| **User confusion** | Same URL. Same login page. Google sign-in is a new addition they'll see after migration — everything else looks identical. |

---

## Pre-Flight Checklist

Before the coordinator approves the cutover:

```
□ All CSVs exported and row counts verified
□ Docker server built and running on staging domain
□ Email/password sign-in tested with 5+ real accounts
□ Google sign-in tested
□ All pages navigated: Dashboard, Programs, Learning, People, Chat, Profile
□ Course progress, TOC docs, notifications verified for 3 users
□ Program CRUD tested (create, edit, delete)
□ WebSocket/polling tested for chat and notifications
□ Server RAM/CPU stable for 24h under idle
□ DNS TTL set to 60s on the production domain (24h before cutover)
□ Rollback DNS record documented (old Vercel IP)
□ Final delta sync script ready
□ Maintenance announcement drafted (optional)
□ 1–2 trusted users identified for post-cutover verification
```

---

## Timeline Estimate

| Phase | Duration | User Impact |
|---|---|---|
| 1. Prep (export, build, import) | 1–2 days | None |
| 2. Parallel run (staging testing) | 1–2 days | None |
| 3. Final sync + DNS cutover | 10 minutes | ~1 minute of potential unavailability |
| 4. Monitoring | 30 days | None |
| **Total until Supabase deleted** | **~35 days** | **1 minute** |

---

*For the technical implementation details (file changes, schema, API routes), see the companion document: `docs/supabase-to-docker-migration.md`.*
