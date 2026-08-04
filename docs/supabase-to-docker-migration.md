# Migration Plan: Vercel + Supabase → Self-Hosted Docker + PostgreSQL

> **Status:** Draft for review with coordinator  
> **Date:** 2026-07-30  
> **Goal:** Move `toc-portal` off Vercel & Supabase onto a Dockerized server with its own PostgreSQL — zero data loss, zero user disruption, plus Google sign-in.

---

## 1. Why Migrate?

| Current | Target |
|---|---|
| Hosted on Vercel (serverless) | Docker container on own server |
| Supabase managed Postgres + Auth | Self-hosted PostgreSQL 16 |
| Supabase Realtime (chat, notifications) | WebSocket server with `pg_notify` |
| Vendor lock-in (Supabase pricing, limits) | Full control, fixed cost |
| No Google sign-in | Google OAuth + email/password |

---

## 2. How We Avoid Data Loss & Disruption

### 2.1 Passwords — No Reset Needed

Supabase stores passwords as **bcrypt hashes** in `auth.users.encrypted_password`. We export these hashes directly and verify them with Node's `bcryptjs` library. Users keep their existing passwords — completely transparent.

### 2.2 Google Sign-In as Safety Net

Even if a password hash doesn't transfer correctly for some edge case, Google sign-in works as a fallback. Users match by email — same account, different auth method.

### 2.3 Data Export → Import

Every table is exported as CSV from Supabase, then imported into the new PostgreSQL **before** DNS is switched. Both systems can run in parallel during verification.

### 2.4 localStorage Fallback Preserved

Every client store already has a localStorage fallback for demo mode. This stays intact — if the API is unreachable, the app degrades gracefully rather than breaking.

---

## 3. Architecture Changes

### Current (Supabase)

```
Browser ──→ Supabase (Auth, DB, Realtime, Storage)
  │
  └── localStorage (demo fallback only)
```

### Target (Self-Hosted)

```
Browser ──→ nginx (port 80/443)
              │
              ├── /api/* ──→ Next.js API Routes ──→ PostgreSQL
              │                 │
              │                 └── bcrypt + Google OAuth + HMAC sessions
              │
              ├── /ws ────→ WebSocket Server ──→ PostgreSQL (pg_notify)
              │
              └── /* ─────→ Next.js SSR
              
Browser ──→ localStorage (fallback when API unreachable)
```

---

## 4. Files to Create / Modify

### 4.1 New Files

| File | Purpose |
|---|---|
| `db/init/01-schema.sql` | PostgreSQL schema — all tables, indexes |
| `lib/db.ts` | Shared `pg` Pool (server-only) |
| `lib/auth-server.ts` | bcrypt hashing, Google OAuth verification, HMAC session tokens |
| `app/api/auth/signin/route.ts` | Sign-in (email/password + Google) |
| `app/api/auth/signup/route.ts` | Sign-up (email/password) |
| `app/api/auth/signout/route.ts` | Clear session cookie |
| `app/api/auth/session/route.ts` | GET current user from session cookie |
| `app/api/auth/reset/route.ts` | Password reset flow |
| `app/api/profile/route.ts` | CRUD for user profiles |
| `app/api/notifications/route.ts` | CRUD for notifications |
| `app/api/members/route.ts` | CRUD for member allowlist (staff-only) |
| `app/api/course/route.ts` | CRUD for course content |
| `app/api/progress/route.ts` | CRUD for learner progress |
| `app/api/clients/route.ts` | CRUD for client directory |
| `app/api/programs/route.ts` | CRUD for programs |
| `app/api/pm/[type]/route.ts` | CRUD for tasks, financials, indicators, budget lines |
| `app/api/chat/route.ts` | Chat messages (polling or WebSocket) |
| `app/api/toc/route.ts` | Theory of Change documents |
| `ws-server/index.ts` | WebSocket server for realtime push |
| `ws-server/package.json` | WebSocket server dependencies |

### 4.2 Modified Files

| File | Change |
|---|---|
| `docker-compose.yml` | Add `db` service (PostgreSQL 16) + `DATABASE_URL` + `AUTH_SECRET` env vars |
| `Dockerfile` | Add `pg` native deps, WebSocket server build stage |
| `supervisord.conf` | Add `ws-server` program |
| `package.json` | Remove `@supabase/ssr`, `@supabase/supabase-js`; add `pg`, `bcryptjs`, `google-auth-library`, `ws` |
| `lib/supabase.ts` | **Delete** — replaced by `lib/db.ts` + `lib/auth-server.ts` |
| `lib/base-store.ts` | Replace `getSupabaseBrowserClient()` calls with `fetch("/api/...")` |
| `lib/store.ts` | Same — profiles, notifications, members via API routes |
| `lib/content.ts` | Same — course, progress via API routes |
| `lib/clients.ts` | Same — client directory via API routes |
| `lib/programs-store.ts` | Same — programs via API routes |
| `lib/pm-store.ts` | Same — tasks/financials/indicators via API routes |
| `lib/chat.ts` | Replace Supabase Realtime with polling or WebSocket |
| `components/auth.tsx` | Replace Supabase Auth with our session API + Google button |
| `app/login/page.tsx` | Add Google Sign-In button |
| `components/providers.tsx` | Remove Supabase provider wrappers |
| `app/layout.tsx` | Remove Supabase-related scripts |

---

## 5. Database Schema (Tables)

```
members             — Invitation allowlist + auth (email, name, role, status,
                      temp_password bcrypt, client, created_at)
profiles            — Per-user profiles (Know Our Members)
notifications       — In-app notifications
course              — Shared course content (single JSON doc, modules jsonb)
course_progress     — Per-learner completion + quiz scores + worksheets
clients             — Client directory (single JSON doc)
programs            — Row-per-program (TOC Dashboard)
program_tasks       — Per-program task tracking
program_financials  — Per-program financial entries
program_indicators  — Per-program M&E indicators
program_budget_lines
assumptions         — Assumption registry (TOC causal-link tracking)
evidence            — Evidence repository (files, URLs, documents)
toc                 — Per-learner Theory of Change (nodes + edges JSON)
messages            — Community chat per client organization
dms                 — Private 1:1 messages between users
uploads/            — Local directory for uploaded course files (PDFs, slides, images)
```

---

## 6. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application type)
3. Add authorized JavaScript origins:
   - `http://localhost:3000` (local dev)
   - `https://your-domain.com` (production)
4. Add authorized redirect URIs (not needed — we use the popup/one-tap flow with ID tokens)
5. Set `GOOGLE_CLIENT_ID` in `.env`
6. Load the Google Identity Services script in `app/layout.tsx`:
   ```html
   <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
   ```

---

## 7. Migration Execution Order

### Phase A: Infrastructure & Auth (Week 1)

```
□ 1.  Export all Supabase data (auth users + application tables) as CSV
□ 2.  Create Google Cloud OAuth client ID
□ 3.  Create db/init/01-schema.sql
□ 4.  Create lib/db.ts
□ 5.  Create lib/auth-server.ts
□ 6.  Create app/api/auth/* routes
□ 7.  Create all remaining API routes
□ 8.  Update components/auth.tsx (Supabase Auth → our session API + Google)
□ 9.  Add Google Sign-In button to app/login/page.tsx
□ 10. Update docker-compose.yml (add db service)
□ 11. Update Dockerfile (add ws-server build stage)
□ 12. Update supervisord.conf (add ws-server program)
□ 13. Update package.json (swap dependencies)
```

### Phase B: Data Layer (Week 1–2)

```
□ 14. Update lib/store.ts (profiles, notifications, members → API calls)
□ 15. Update lib/content.ts (course, progress → API calls)
□ 16. Update lib/clients.ts (clients → API calls)
□ 17. Update lib/programs-store.ts (programs → API calls)
□ 18. Update lib/base-store.ts (BaseStore → API calls)
□ 19. Update lib/pm-store.ts (PM data → API calls)
□ 20. Update lib/chat.ts (Supabase Realtime → WebSocket/polling)
□ 21. Create ws-server/ (WebSocket server)
□ 22. Remove lib/supabase.ts
□ 23. Clean up Supabase imports across all files
```

### Phase C: Test & Cutover (Week 2)

```
□ 24. docker compose up --build (local test)
□ 25. Import CSV data into local PostgreSQL
□ 26. Verify: sign in with existing email/password ✓
□ 27. Verify: sign in with Google ✓
□ 28. Verify: all data present and correct ✓
□ 29. Verify: localStorage fallback works when DB is down ✓
□ 30. Verify: WebSocket notifications ✓
□ 31. Deploy to production server
□ 32. Import production Supabase data (final sync)
□ 33. Update DNS → point domain to new server
□ 34. Wait 24h for DNS propagation
□ 35. Shut down Vercel deployment + Supabase project
```

---

## 8. Supabase Data Export Queries

Run these in Supabase SQL Editor before starting:

```sql
-- ═══════════════════════════════════════════════════════════════
-- AUTH USERS — COMPLETE EXPORT (every relevant column)
-- ═══════════════════════════════════════════════════════════════
SELECT
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  updated_at,
  raw_app_meta_data,          -- {"provider":"email","providers":["email"]}
  raw_user_meta_data,          -- {"name":"...","avatar_url":"..."}
  phone,
  banned_until,
  is_sso_user
FROM auth.users
WHERE email IS NOT NULL AND deleted_at IS NULL
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════
-- AUTH IDENTITIES — OAuth-linked accounts (Google, GitHub, etc.)
-- ═══════════════════════════════════════════════════════════════
SELECT
  id,
  user_id,          -- references auth.users.id
  provider,          -- "google", "github", "email", etc.
  email,
  identity_data,     -- {"sub":"...","email":"...","name":"...","picture":"..."}
  created_at,
  updated_at,
  last_sign_in_at
FROM auth.identities
ORDER BY created_at;

-- ═══════════════════════════════════════════════════════════════
-- APPLICATION TABLES (CSV export — 10 active tables)
-- ═══════════════════════════════════════════════════════════════

-- Core user data
COPY (SELECT * FROM public.members ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.profiles ORDER BY email) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.notifications ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);

-- Course & learning
COPY (SELECT * FROM public.course) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.course_progress ORDER BY email) TO STDOUT WITH (FORMAT csv, HEADER true);

-- Client directory
COPY (SELECT * FROM public.clients) TO STDOUT WITH (FORMAT csv, HEADER true);

-- Theory of Change (per-learner)
COPY (SELECT * FROM public.toc ORDER BY email) TO STDOUT WITH (FORMAT csv, HEADER true);

-- Program assignments (user ↔ program links)
COPY (SELECT * FROM public.program_assignments ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);

-- Chat & messaging
COPY (SELECT * FROM public.messages ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
COPY (SELECT * FROM public.dms ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true);
```

> **Note:** Tables `programs`, `program_budget_lines`, `program_financials`, `program_tasks`, `program_indicators`, `assumptions`, and `evidence` exist in `supabase/schema.sql` but have **not been deployed** to Supabase yet. Those features currently use localStorage. They get fresh PostgreSQL tables on the new server — no data to migrate.
```

### Supabase Storage — Course Files

Files uploaded to Supabase Storage must be downloaded separately:

```bash
# Via Supabase Dashboard: Storage → course-files → Download all
# Or via supabase CLI:
supabase storage download course-files --local-path ./course-files-export
```

These files will be served from `/public/uploads/course-files/` on the new server (nginx serves static files from `/app/public/`).

### Table Name Mapping (Supabase → New PostgreSQL)

All application tables map 1:1 — the same names, the same columns. Auth users'
bcrypt password hashes are copied into `members.temp_password` by the migration
script (`scripts/migrate-auth-users.mjs`).

| Supabase Source | New PostgreSQL | Notes |
|---|---|---|
| `auth.users` (email + encrypted_password) | `members.temp_password` | bcrypt hashes copied verbatim by migration script |
| `public.members` | `members` | Same columns (email, name, role, status, temp_password, client, created_at) |
| `public.profiles` | `profiles` | Same columns incl. `avatar_url` |
| `public.notifications` | `notifications` | `id` uuid → text; defaults to `gen_random_uuid()::text` |
| `public.course` | `course` | Identical single-row JSON doc |
| `public.course_progress` | `course_progress` | Identical (done text[], meta jsonb) |
| `public.clients` | `clients` | Identical single-row JSON doc |
| `public.toc` | `toc` | Identical per-learner JSON |
| `public.messages` | `messages` | `id` uuid → text; default generated |
| `public.dms` | `dms` | `id` uuid → text; default generated |

The full schema is in `db/init/01-schema.sql`. For the exact export/import
commands see `docs/data-export-import-runbook.md`. Tables for programs, PM
modules, assumptions, and evidence were not deployed to Supabase (the app used
localStorage for those) — they start fresh on the new server.

### RPC Functions to Reimplement (No Data to Export)

These are server-side SQL functions — their logic must be ported to API routes:

| Supabase RPC | New Location | Purpose |
|---|---|---|
| `check_access(p_email)` | `app/api/members/check/route.ts` | Verify if email is on the allowlist |
| `my_client()` | `app/api/chat/my-client/route.ts` | Get current user's client org |
| `org_people()` | `app/api/people/route.ts` | People directory for current user's org |
| `public_course()` | `app/api/public/course/route.ts` | Anon access to course content |
| `public_roster()` | `app/api/public/roster/route.ts` | Anon participant name list |
| `save_public_worksheet(...)` | `app/api/public/worksheet/route.ts` | Anon worksheet answer save |
| `reset_worksheet_responses(...)` | `app/api/worksheet/reset/route.ts` | Staff-only worksheet reset |

---

## 9. New Dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "google-auth-library": "^9.15.0",
    "pg": "^8.13.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/pg": "^8.11.0",
    "@types/ws": "^8.5.0"
  }
}
```

**Removed:**
```json
"@supabase/ssr": "^0.12.0",
"@supabase/supabase-js": "^2.108.1"
```

---

## 10. docker-compose.yml (Updated)

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: toc-portal-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: toc_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-toc_password_change_me}
      POSTGRES_DB: toc_db
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U toc_user -d toc_db"]
      interval: 5s
      timeout: 5s
      retries: 10

  portal:
    build:
      context: .
      dockerfile: Dockerfile
    image: toc-portal
    container_name: toc-portal
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://toc_user:${POSTGRES_PASSWORD:-toc_password_change_me}@db:5432/toc_db
      AUTH_SECRET: ${AUTH_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      BREVO_API_KEY: ${BREVO_API_KEY:-}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      EMAIL_FROM: ${EMAIL_FROM:-}
    ports:
      - "3000:80"

volumes:
  db-data:
```

---

## 11. Required Environment Variables

```bash
# .env (not committed)
POSTGRES_PASSWORD=strong_random_password_here
AUTH_SECRET=64_char_random_string_for_signing_sessions
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
ANTHROPIC_API_KEY=sk-ant-...
BREVO_API_KEY=xkeysib-...
RESEND_API_KEY=re_...
EMAIL_FROM=Amal & Company <portal@amalandcompany.com>
```

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Password hash mismatch (Supabase bcrypt variant) | Low | Medium | Test with a real export first. Google sign-in as fallback. |
| Supabase CSV export incomplete (large tables) | Low | High | Verify row counts before and after import. |
| DNS propagation delay during cutover | Medium | Low | Keep Vercel running 48h after DNS switch. |
| WebSocket connection issues behind nginx | Medium | Low | Already proven in sibling TOCPortal Docker setup. |
| Google OAuth config not ready in time | Low | Medium | Email/password works standalone — Google is additive. |
| User forgets password, no reset flow yet | Medium | Low | Google sign-in is the reset-free alternative. Password reset endpoint is Phase A item 8. |
| `pg` native module build issues in Docker | Low | Medium | Use `pg` (pure JS — no native deps); `bcryptjs` (pure JS, not `bcrypt`). |

---

## 13. Rollback Plan

If anything goes wrong during cutover:

1. Switch DNS back to Vercel (previous records)
2. Vercel deployment still points to Supabase — **unchanged**
3. Supabase project is **never deleted** during migration — only after 30+ days of stable operation
4. The Docker server can be debugged without affecting users

---

## 14. Open Questions for Coordinator

1. **Google OAuth branding:** Should we restrict Google sign-in to specific domains (e.g., only `@amalandcompany.com` and invited member emails), or leave it open to any Google account that passes the member allowlist check?

2. **Chat migration:** Current chat messages in Supabase — do we need to preserve chat history, or is the community chat new enough that we can start fresh?

3. **Supabase Storage:** Are there files in Supabase Storage (profile pictures, uploaded evidence) that need to be migrated? If so, we need a download → re-upload step.

4. **Timeline:** Is there a preferred window for the DNS cutover (e.g., weekend, low-usage period)?

5. **Server resources:** What's the target server specs? PostgreSQL 16 needs ~512MB RAM minimum for comfortable operation + the Next.js app.

6. **Backup strategy:** How often should we automate PostgreSQL dumps? (Recommendation: daily to an off-server location.)
