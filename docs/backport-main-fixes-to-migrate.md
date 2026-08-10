# Backport: main fixes → migrate_to_server

Date: 2026-08-10
Commits ported from `origin/main` (post merge-base `d686ff2`):
`616202f`, `f9c5d57`, `caf4a09`, `5a7f5de`, `3d895a5`, `edea5ca`

---

## Fix 1 — Loading-screen failsafe in AuthProvider

**File:** `components/auth.tsx`

**Bug:** If `/api/auth/session` or the members-check API hangs (slow DB, network blip), the user is stuck on the loading spinner forever. No timeout existed.

**What was ported:**

- **8-second hard failsafe:** `setTimeout` forces `loading=false` so the spinner always stops, regardless of API state.
- **`active` flag for cleanup:** Prevents state updates after unmount.
- **`roleFor()` with `Promise.race`:** Role resolution via `resolveWithMembers` (which calls `checkMemberAccess`) races against a 6-second fallback to the static-allowlist `resolveAccess(email).role`. If the members API is slow, the user proceeds with allowlist-based access instead of hanging.

**Not ported (Supabase-specific, N/A):**
- Singleton `GoTrue` browser client (no Supabase client in migrate)
- `setTimeout(0)` deadlock avoidance in `onAuthStateChange` (migrate has no Supabase auth listener)
- `.catch` on `getSession()` (migrate uses `apiFetch` which already catches)

---

## Fix 2 — Password-input focus-loss on reset page

**File:** `app/reset/page.tsx`

**Bug:** The `Frame` helper component was defined **inside** `ResetPasswordPage`. On every React re-render (each keystroke), `Frame` got a new function identity, causing React to unmount/remount the entire subtree — stealing focus from the password input mid-typing. (PR #83)

**What was ported:**

- Moved `Frame` to **module scope** (outside the component). It now has a stable identity across renders and the input keeps focus.

**Not ported (Supabase-specific, N/A):**
- `token_hash` / `verifyOtp` / `exchangeCodeForSession` parsing (migrate uses custom JWT tokens via `?token=...`)
- `deadReason` / `linkDead` state (migrate already handles legacy Supabase hash links with a guidance message)

---

## Fix 3 — Branded password-reset email template

**Files:** `lib/email-templates.ts`, `app/api/auth/reset/route.ts`

**Bug:** The reset email was a bare inline HTML string with no Amal & Company branding — no logo, no colors, no "Assalamu Alaikum" greeting.

**What was ported:**

- Added `resetEmail()` function to `lib/email-templates.ts` using the existing `hero()`, `button()`, `shell()`, `BRAND` tokens, and `MAS` constants.
- Updated `app/api/auth/reset/route.ts` to import and use `resetEmail()` instead of the bare inline HTML.
- The reset email now matches the invite email's visual rhythm: navy brand, blue accents, logo bar, styled button, Islamic greeting, and fallback plain-text link.

**Not ported (Supabase-specific, N/A):**
- `app/api/auth/reset-link/route.ts` (migrate's token generation + email delivery is already consolidated in `/api/auth/reset`)
- `publicOrigin()` host-header derivation (migrate uses `new URL(req.url).origin` which is correct in Docker/nginx)

---

## Fix 4 — Admin password-reset endpoint

**Files:** `app/api/admin/reset-password/route.ts` (new), `app/(app)/admin/access/page.tsx`

**Bug:** Admins had no way to reset a locked-out user's password. "Resend" only worked for members still in "Invited" status.

**What was ported (adapted for `lib/db.ts` instead of Supabase):**

- **New endpoint:** `POST /api/admin/reset-password`
  - Verifies caller's JWT session via `getSessionEmail()`
  - Confirms admin status via static allowlist (`ADMIN_DOMAINS` / `ADMIN_EMAILS`) + `members` table query
  - Looks up the target user in the `users` table
  - Generates a temp password via `genTempPassword()`, hashes it with `hashPassword()`, and updates `encrypted_password`
  - Returns the plaintext password (for the admin to share)

- **Updated admin access page:**
  - Added "Reset password" button (KeyRound icon) for members who are NOT in "Invited" status
  - The flow: admin clicks → confirm dialog → server sets temp password → browser `prompt()` shows it for copying
  - "Resend" button still shows for "Invited" members (unchanged behavior)

**Key differences from main's Supabase implementation:**
- No `SUPABASE_SERVICE_ROLE_KEY` env var needed — auth is via the existing JWT session cookie
- No `findUserId` pagination — direct `SELECT email FROM users WHERE LOWER(email) = LOWER($1)` is sufficient
- No `email_confirm: true` — migrate doesn't track email confirmation

---

## Files changed summary

| File | Change |
|------|--------|
| `components/auth.tsx` | +`roleFor()`, +8s failsafe, +`active` flag, `buildUser` uses `roleFor` |
| `app/reset/page.tsx` | `Frame` moved to module scope |
| `lib/email-templates.ts` | +`resetEmail()` branded template |
| `app/api/auth/reset/route.ts` | Uses `resetEmail()` instead of inline HTML |
| `app/api/admin/reset-password/route.ts` | **New** — admin password reset endpoint |
| `app/(app)/admin/access/page.tsx` | +`resetPw()`, +"Reset password" button for active members |
