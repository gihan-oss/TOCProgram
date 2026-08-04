# Migrate-to-Server Branch Audit — Findings & Fix Plan

**Branch:** `migrate_to_server` vs `main`  
**Date:** 2026-08-04  
**Scope:** 96 files, +8047/-903 lines. Replaces Supabase with self-hosted Postgres + custom auth + Docker.

---

## CRITICAL

### F1 — SQL injection via unvalidated column names (pm route)

**Files:** `app/api/pm/[type]/route.ts`, `app/api/programs/route.ts`  
**Lines:** pm: GET scopeColumn/filterCol interpolation, POST/PUT body-key interpolation. programs: POST colNames, PUT setClauses keys.  
**Impact:** Attacker-crafted JSON key or query param becomes part of the SQL statement (identifier injection — values are parameterized OK).  
**Fix:** Whitelist allowed column names per table. In pm route, keep a `Map<string, Set<string>>` of valid columns per `type`. In programs route, define a `PROGRAMS_COLUMNS` set. Reject unknown keys with 400.

### F2 — Broken write authorization: PM tables + programs writable by any signed-in user

**Files:** `app/api/pm/[type]/route.ts`, `app/api/programs/route.ts`  
**Lines:** All POST/PUT/DELETE handlers call `requireUser()` only, no staff check.  
**Old behavior (Supabase RLS):** insert/update/delete on `program_tasks`, `program_financials`, `program_indicators`, `program_budget_lines`, `assumptions`, `evidence`, `programs` all gated behind `public.is_staff()`.  
**Impact:** Any participant can create/edit/delete any program, task, budget line, indicator, assumption, or evidence entry.  
**Fix:** Add `requireStaff()` check in POST/PUT/DELETE handlers of both routes. For pm route, call `if (!(await requireStaff(["admin", "facilitator", "coordinator"])))` after the table-allowlist check. For programs route, same before write operations.

### F3 — Legacy programs migration can delete source doc before confirming successful insert

**File:** `lib/programs-store.ts` lines 58-69  
**Impact:** `apiFetch` only throws on network/503 error. Individual POST responses are never checked for `res.ok`. `DELETE /api/programs/legacy` runs unconditionally after `Promise.all`. A single failed insert + successful delete = permanent loss of that program.  
**Fix:** Check each POST response. Only DELETE if all succeeded. On partial failure, log which programs failed and skip the DELETE (retry on next load).

### F4 — Access revocation bypass: removed members can still sign in

**File:** `app/api/auth/signin/route.ts` lines 89-148  
**Impact:** The `resolveAccess()` allowlist check only runs in the `if (!user && !member)` first-time-sign-in branch (line 90). For returning users, `users.password_hash` persists independently of `members`. Admin removing a member only deletes the `members` row (`DELETE` in `app/api/members/route.ts` line 82), but the `users` row survives, so `pwValid = await verifyPassword(...)` succeeds and the session is issued with no re-check.  
**Old behavior:** `components/auth.tsx` called `resolveWithMembers()` before every password attempt, blocking removed members immediately.  
**Fix:** In the email/password branch (after line 115, once user/member rows are fetched), if a `users` row exists but no active `members` row exists and the email is not on the static admin allowlist, return 403. Do the same in the Google OAuth branch.

---

## HIGH

### F5 — Bulk data endpoints lost row-level scoping from RLS

**Files:** `app/api/profiles/route.ts`, `app/api/toc/all/route.ts`  
**Old behavior:** `profiles`: self-read or `is_tracker()`(staff/coordinator). `toc`: self or `is_tracker()`.  
**New behavior:** Any `requireUser()` gets all profiles and all TOC documents.  
**Impact:** Private learner data (names, departments, skills, TOC content) exposed across roles.  
**Fix for profiles:** Pass `?email=` query param for self-read. If absent, require `requireStaff(["admin","facilitator","coordinator"])`. Same pattern as `app/api/toc/route.ts`.  
**Fix for toc/all:** Gate with `requireStaff(...)` or scope to coordinator+.

### F6 — Google OAuth audience check bypassable if env var is unset

**File:** `lib/auth-server.ts` lines 217-219  
**Impact:** `if (clientId && data.aud !== clientId)` — if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is missing from the deployment env, any valid Google ID token (from any OAuth client) is accepted.  
**Fix:** Make the audience check unconditional: throw or reject if the env var is not configured in production.

### F7 — Silent password adoption when neither permanent nor temp password is set

**File:** `app/api/auth/signin/route.ts` lines 129-131  
**Impact:** If `users` row exists with no `password_hash` AND `members.temp_password` is empty/absent, `pwValid` defaults to `true` and any entered password is adopted as the permanent one. Narrow window (requires invite without a temp password), but worth hardening.  
**Fix:** Instead of `pwValid = true`, return a 401 with a clear message — "No password is set for this account. Please use the password reset link or contact your administrator."

---

## MEDIUM

### F8 — 5xx server errors bypass localStorage cache fallback

**File:** `lib/api-fetch.ts` + `lib/base-store.ts` `list()`/`listAll()`/`listBy()`  
**Impact:** Only 503 ("DB not configured") is converted to a network-style throw that triggers localStorage fallback. A genuine 500 (transient pool exhaustion, query error) returns `[]` directly, making the UI briefly empty.  
**Fix:** In `apiFetch`, also convert status >= 500 to a network-style throw, so any server error falls back to cached data rather than returning empty.

### F9 — Migration script: naive CSV parsing + loose bcrypt format check

**File:** `scripts/migrate-auth-users.mjs` line 33, lines 36-41  
**Impact:** `line.split(",")` breaks if any email/hash field contains a comma (rare but possible). Only checks `hash.startsWith("$2")`, not length/format (bcrypt is always 60 chars).  
**Fix:** Use a proper CSV parser or at minimum validate `hash.length === 60`. Reject malformed rows with an error, don't import truncated hashes.

### F10 — Members POST doesn't validate role/status values

**File:** `app/api/members/route.ts` line ~54-65  
**Impact:** Any string is accepted for `role` and `status`. A typo like `"adimn"` or `"Activee"` gets written to the DB and breaks downstream role checks.  
**Fix:** Validate `role` against allowed members roles and `status` against `["Active","Invited","Suspended"]`.

### F11 — Non-constant-time plaintext temp_password comparison

**File:** `app/api/auth/signin/route.ts` line 126  
**Impact:** `password === member.temp_password` is string equality — timing-sensitive. Low real-world risk (short-lived invite passwords) but inconsistent with the bcrypt `verifyPassword` and HMAC `timingSafeEqual` used everywhere else in the same file.  
**Fix:** Use `timingSafeEqual(Buffer.from(password), Buffer.from(member.temp_password))` with length check.

---

## LOW / DOCUMENTATION

### F12 — Stale Dockerfile comment

**File:** `Dockerfile` line ~9  
**Fix:** Update to reflect PostgreSQL architecture.

### F13 — Missing env vars in .env.example

**File:** `.env.example`  
**Fix:** Add `RESEND_API_KEY` and `POSTGRES_PASSWORD` entries.

### F14 — Stale Supabase references in README

**File:** `README.md` lines ~54-55  
**Fix:** Remove `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` references.

---

## Execution Order

| Phase | Finding | Area |
|-------|---------|------|
| 1 | F1 | SQL injection — column whitelist |
| 2 | F2 | Write authorization — staff check |
| 3 | F3 | Legacy migration — confirm before delete |
| 4 | F4 | Access revocation — check members on every sign-in |
| 5 | F5 | Bulk endpoint scoping — role-gate profiles + toc/all |
| 6 | F6 | Google OAuth — unconditional audience check |
| 7 | F7 | Silent password adoption — reject instead |
| 8 | F8 | 5xx cache fallback — treat as network error |
| 9 | F9 | Migration script — stricter CSV + hash validation |
| 10 | F10 | Members POST — validate role/status |
| 11 | F11 | Timing-safe temp_password comparison |
| 12 | F12-F14 | Documentation fixes |
