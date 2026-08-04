# Code Changes: Supabase → Local PostgreSQL

> **Project:** `toc-portal` (Vercel + Supabase → Docker + PostgreSQL)  
> **Date:** 2026-08-03  
> **Summary:** Every file that currently calls Supabase directly from the browser must be changed to call our own API routes instead. The localStorage fallback pattern already in every store stays untouched.

---

## The Pattern (Same in Every File)

Every store follows this exact structure today:

```typescript
// CURRENT: Browser talks directly to Supabase
import { getSupabaseBrowserClient } from "./supabase";

export async function loadSomething(): Promise<Thing[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    // 👇 DIRECT Supabase call from the browser
    const { data } = await sb.from("table_name").select("*");
    return data ?? [];
  }
  // localStorage fallback for demo mode
  try { return JSON.parse(localStorage.getItem("key") || "[]"); } catch { return []; }
}
```

The change is to replace the Supabase branch with a `fetch()` to our own API:

```typescript
// TARGET: Browser talks to our API, which talks to PostgreSQL
// (no supabase import needed)

export async function loadSomething(): Promise<Thing[]> {
  // 👇 Call our own API route instead of Supabase
  try {
    const res = await fetch("/api/things");
    if (res.ok) {
      const data = await res.json();
      // Optional: cache to localStorage for offline resilience
      localStorage.setItem("key", JSON.stringify(data));
      return data;
    }
  } catch {}
  // localStorage fallback — UNCHANGED
  try { return JSON.parse(localStorage.getItem("key") || "[]"); } catch { return []; }
}
```

**What changes:**
- Remove `import { getSupabaseBrowserClient } from "./supabase"`
- Replace `sb.from("table").select/upsert/insert/update/delete` with `fetch("/api/...")`
- The localStorage fallback stays **exactly as-is**

**What doesn't change:**
- Function signatures (same params, same return types)
- localStorage keys and data format
- All UI components that call these functions — they don't know anything changed

---

## Files That Must Change (11 files)

### 1. `lib/supabase.ts` → **DELETE**

This file creates the Supabase browser client. It's the root import for every store. Once all stores call our API instead, this file is dead code.

```typescript
// ❌ DELETE THIS ENTIRE FILE
import { createBrowserClient } from "@supabase/ssr";
const DEFAULT_SUPABASE_URL = "https://evwzlgzticnblpdqphus.supabase.co";
// ...
export function getSupabaseBrowserClient() { ... }
```

Replaced by two new server-only files:
- `lib/db.ts` — PostgreSQL connection pool (used by API routes, never imported in client code)
- `lib/auth-server.ts` — bcrypt, Google OAuth, session tokens (server-only)

---

### 2. `lib/base-store.ts`

Abstract base class used by `pm-store.ts` for tasks, financials, indicators, and budget lines. Contains `list()`, `create()`, `update()`, `delete()` methods.

**Current imports:** `getSupabaseBrowserClient` from `./supabase`  
**Change:** Remove Supabase import. Replace `sb.from(this.table).select/insert/update/delete` with `fetch()` calls to `/api/pm/${this.table}`.

**Methods to change:**
| Method | Current (Supabase) | New (fetch API) |
|---|---|---|
| `list(scope?)` | `sb.from(table).select("*").eq(scopeColumn, scope)` | `fetch(\`/api/pm/${table}?scope=${scope}\`)` GET |
| `create(input)` | `sb.from(table).insert(row)` | `fetch(\`/api/pm/${table}\`, { method: "POST", body })` |
| `update(entity)` | `sb.from(table).update(row).eq("id", id)` | `fetch(\`/api/pm/${table}/${id}\`, { method: "PUT", body })` |
| `delete(id)` | `sb.from(table).delete().eq("id", id)` | `fetch(\`/api/pm/${table}/${id}\`, { method: "DELETE" })` |

The `lsRead`/`lsWrite` helpers, `genId`, `fromRow`/`toRow` mappers — all stay unchanged.

---

### 3. `lib/store.ts`

Three data domains, all using Supabase directly.

**Current imports:** `getSupabaseBrowserClient` from `./supabase`

**`getProfile(email)` / `saveProfile(profile)`:**
| Before | After |
|---|---|
| `sb.from("profiles").select("*").eq("email", email)` | `fetch(\`/api/profile?email=${email}\`)` GET |
| `sb.from("profiles").upsert(row)` | `fetch("/api/profile", { method: "PUT", body })` |

**`listNotifications(email)` / `addNotification()` / `markAllRead()`:**
| Before | After |
|---|---|
| `sb.from("notifications").select("*").eq("email", email)` | `fetch(\`/api/notifications?email=${email}\`)` GET |
| `sb.from("notifications").insert(...)` | `fetch("/api/notifications", { method: "POST", body })` |
| `sb.from("notifications").update({ read: true })` | `fetch("/api/notifications/read", { method: "POST" })` |

**`listMembers()` / `saveMember()` / `deleteMember()` / `checkMemberAccess()`:**
| Before | After |
|---|---|
| `sb.from("members").select("*")` | `fetch("/api/members")` GET |
| `sb.from("members").upsert(...)` | `fetch("/api/members", { method: "POST", body })` |
| `sb.from("members").delete().eq("email", email)` | `fetch(\`/api/members?email=${email}\`, { method: "DELETE" })` |
| `sb.rpc("check_access", { p_email: email })` | `fetch(\`/api/members/check?email=${email}\`)` GET |

**`loadToc(email)` / `saveToc(email, doc)` / `listProfiles()` (staff):**
| Before | After |
|---|---|
| `sb.from("toc").select("data").eq("email", email)` | `fetch(\`/api/toc?email=${email}\`)` GET |
| `sb.from("toc").upsert(...)` | `fetch("/api/toc", { method: "PUT", body })` |
| `sb.from("profiles").select("*")` (staff list) | `fetch("/api/profiles")` GET (staff-only) |

---

### 4. `lib/content.ts`

Course content and learner progress.

**Current imports:** `getSupabaseBrowserClient` from `./supabase`

| Function | Before (Supabase) | After (fetch API) |
|---|---|---|
| `loadModules()` | `sb.from("course").select("modules").eq("id", "default")` | `fetch("/api/course")` GET |
| `saveModules(modules)` | `sb.from("course").upsert({ id: "default", modules })` | `fetch("/api/course", { method: "PUT", body })` |
| `loadDone(email)` | `sb.from("course_progress").select("done").eq("email", email)` | `fetch(\`/api/progress?email=${email}\`)` GET |
| `saveDone(email, done)` | `sb.from("course_progress").upsert(...)` | `fetch("/api/progress", { method: "PUT", body })` |
| `loadMeta(email)` | `sb.from("course_progress").select("meta")...` | Same endpoint, different field in response |
| `saveMeta(email, meta)` | `sb.from("course_progress").upsert(...)` | `fetch("/api/progress", { method: "PUT", body })` |
| All public worksheet functions | `sb.rpc("public_course")`, `sb.rpc("public_roster")`, `sb.rpc("save_public_worksheet")` | Own API routes: `/api/public/course`, `/api/public/roster`, `/api/public/worksheet` |

---

### 5. `lib/clients.ts`

Client directory.

**Current imports:** `getSupabaseBrowserClient` from `./supabase`

| Before | After |
|---|---|
| `sb.from("clients").select("data").eq("id", "default")` | `fetch("/api/clients")` GET |
| `sb.from("clients").upsert({ id: "default", data })` | `fetch("/api/clients", { method: "PUT", body })` |

---

### 6. `lib/programs-store.ts`

Programs CRUD. Extends `BaseStore`.

**Current state:** `programs` table exists in `supabase/schema.sql` but was **never deployed** to Supabase — this store currently runs entirely on localStorage via `BaseStore`'s fallback. When `BaseStore` is updated (file #2), this store automatically inherits API-backed persistence for the new PostgreSQL `programs` table.

**Current imports:** `getSupabaseBrowserClient` from `./supabase` (for `migrateLegacy()` only)  
**Change:** The `migrateLegacy()` function reads the legacy single-JSON-doc format via `sb.from("programs").select("data")` — replace with `fetch("/api/programs/legacy")`. After migration, this function can be removed since it only handles the old Supabase-only format.

---

### 7. `lib/assumptions-store.ts`

Assumption registry. Extends `BaseStore` with `table = "assumptions"`.

**Current state:** `assumptions` table not deployed to Supabase — runs on localStorage only. After `BaseStore` is updated (file #2), it automatically gains API-backed persistence for the new PostgreSQL table. **No code changes needed in this file** — it inherits everything from `BaseStore`.

---

### 8. `lib/evidence-store.ts`

Evidence repository. Extends `BaseStore` with `table = "evidence"`.

**Current state:** Same as assumptions — localStorage only today. After `BaseStore` update, automatically gains API persistence. **No code changes needed.**

---

### 9. `lib/pm-store.ts`

Task, financial, indicator, and budget line stores. All extend `BaseStore` from file #2 — so after #2 is changed, these inherit the new API-calling behavior automatically.

**No direct Supabase calls** — only through `BaseStore`. However:
- `addMeasurement()`, `saveBudgetLine()` contain custom Supabase calls that need individual `fetch()` conversion.

---

### 10. `lib/chat.ts`

Chat messages + direct messages + realtime subscription.

**Current:** Uses `sb.from("messages").select/insert` + `sb.channel(...).subscribe()` for Supabase Realtime.

| Feature | Before (Supabase) | After |
|---|---|---|
| Load messages | `sb.from("messages").select("*").eq("client", client)` | `fetch(\`/api/chat?client=${client}\`)` GET |
| Send message | `sb.from("messages").insert(...)` | `fetch("/api/chat", { method: "POST", body })` |
| Realtime (new messages) | `sb.channel("messages").on("INSERT", ...)` | Poll `GET /api/chat?client=X&since=timestamp` every 3s, OR WebSocket with `pg_notify` |
| `myClient()` | `sb.rpc("my_client")` | `fetch("/api/chat/my-client")` GET |
| `orgPeople()` | `sb.rpc("org_people")` | `fetch("/api/people")` GET |
| Load DMs | `sb.from("dms").select("*")...` | `fetch(\`/api/chat/dms?with=${email}\`)` GET |
| Send DM | `sb.from("dms").insert(...)` | `fetch("/api/chat/dms", { method: "POST", body })` |

**Note:** Chat and DMs have NO localStorage fallback today (they require multi-user). After migration, the API replaces Supabase directly — still no localStorage fallback needed.

---

### 11. `components/auth.tsx`

Authentication — the biggest conceptual change.

**Current:** Uses Supabase Auth (`signInWithPassword`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`, `updateUser`, `resetPasswordForEmail`).

**After:** Uses our own session API + Google OAuth.

| Feature | Before (Supabase Auth) | After (Our API) |
|---|---|---|
| Check session on load | `sb.auth.getSession()` | `fetch("/api/auth/session")` GET |
| Listen for changes | `sb.auth.onAuthStateChange(...)` | Not needed — session is stateless (HMAC cookie), check on mount and after sign-in |
| Sign in (email/pw) | `sb.auth.signInWithPassword({ email, password })` | `fetch("/api/auth/signin", { method: "POST", body: { email, password } })` |
| Sign up | `sb.auth.signUp({ email, password })` | `fetch("/api/auth/signup", { method: "POST", body: { name, email, password } })` |
| Sign out | `sb.auth.signOut()` | `fetch("/api/auth/signout", { method: "POST" })` |
| Update password | `sb.auth.updateUser({ password })` | `fetch("/api/auth/reset", { method: "POST", body: { password } })` |
| Reset password | `sb.auth.resetPasswordForEmail(email)` | `fetch("/api/auth/reset", { method: "POST", body: { email } })` |
| Google sign-in | *Not supported by Supabase in this project* | `fetch("/api/auth/signin", { method: "POST", body: { googleToken } })` |
| Demo mode | `isSupabaseConfigured` flag | `isDemo` stays — triggered when `/api/auth/session` returns no user and no cookie |

**What stays the same:**
- The `AuthProvider` context shape (user, loading, signIn, signUp, signOut, etc.)
- The demo mode pattern (localStorage `toc-demo-auth`)
- The access control check (`resolveWithMembers`)
- All components that call `useAuth()` — they don't change

---

## Summary: What Each File Loses and Gains

| File | Loses | Gains |
|---|---|---|
| `lib/supabase.ts` | Entire file | — (deleted) |
| `lib/db.ts` | — | New: pg Pool for API routes |
| `lib/auth-server.ts` | — | New: bcrypt, Google OAuth, HMAC sessions |
| `lib/base-store.ts` | `getSupabaseBrowserClient` import, `sb.from()` calls | `fetch("/api/pm/...")` calls |
| `lib/store.ts` | `getSupabaseBrowserClient` import, all `sb.from()` / `sb.rpc()` calls | `fetch("/api/profile")`, `/api/notifications`, `/api/members` |
| `lib/content.ts` | `getSupabaseBrowserClient` import, all `sb.from()` / `sb.rpc()` calls | `fetch("/api/course")`, `/api/progress`, `/api/public/...` |
| `lib/clients.ts` | `getSupabaseBrowserClient` import, `sb.from()` calls | `fetch("/api/clients")` |
| `lib/programs-store.ts` | `getSupabaseBrowserClient` import (legacy migration) | Inherits new `BaseStore` behavior; migrateLegacy() → `fetch("/api/programs/legacy")` |
| `lib/assumptions-store.ts` | — (no Supabase calls — localStorage via BaseStore) | Inherits new `BaseStore` behavior automatically |
| `lib/evidence-store.ts` | — (no Supabase calls — localStorage via BaseStore) | Inherits new `BaseStore` behavior automatically |
| `lib/pm-store.ts` | Custom `sb.from()` calls in helper methods | `fetch()` in helpers, inherits new `BaseStore` |
| `lib/chat.ts` | `getSupabaseBrowserClient`, `sb.from()`, `sb.channel()` (Realtime), `sb.rpc()` | `fetch("/api/chat")`, `/api/people`, polling or WebSocket |
| `components/auth.tsx` | Supabase Auth (`signInWithPassword`, `signUp`, `getSession`, `onAuthStateChange`, etc.) | `fetch("/api/auth/*")`, Google sign-in handler |
| `app/login/page.tsx` | — | Google Sign-In button (additive, not replacement) |

---

## New API Routes (All Server-Side)

These are the routes that the changed client code calls. Each uses `lib/db.ts` (pg Pool) for PostgreSQL queries and `lib/auth-server.ts` (verifySession) for access control.

| Route | Handles | Called By |
|---|---|---|
| `app/api/auth/signin/route.ts` | Email/password + Google sign-in | `components/auth.tsx` |
| `app/api/auth/signup/route.ts` | Create account | `components/auth.tsx` |
| `app/api/auth/signout/route.ts` | Clear session cookie | `components/auth.tsx` |
| `app/api/auth/session/route.ts` | GET current user | `components/auth.tsx` |
| `app/api/auth/reset/route.ts` | Password change + forgot-password | `components/auth.tsx`, `app/reset/page.tsx` |
| `app/api/profile/route.ts` | User profiles CRUD | `lib/store.ts` |
| `app/api/notifications/route.ts` | Notifications CRUD | `lib/store.ts` |
| `app/api/members/route.ts` | Member allowlist (staff-only) + `check_access` | `lib/store.ts` |
| `app/api/members/check/route.ts` | `check_access` RPC replacement | `lib/store.ts` |
| `app/api/course/route.ts` | Course content | `lib/content.ts` |
| `app/api/progress/route.ts` | Learner progress + meta | `lib/content.ts` |
| `app/api/public/...` | Public worksheet (anon access) — `public_course`, `public_roster`, `save_public_worksheet` | `lib/content.ts` |
| `app/api/worksheet/reset/route.ts` | `reset_worksheet_responses` RPC replacement (staff-only) | `lib/content.ts` |
| `app/api/clients/route.ts` | Client directory | `lib/clients.ts` |
| `app/api/programs/route.ts` | Programs CRUD + legacy migration | `lib/programs-store.ts` |
| `app/api/pm/[type]/route.ts` | Tasks, financials, indicators, budget lines, assumptions, evidence | `lib/base-store.ts`, `lib/pm-store.ts`, `lib/assumptions-store.ts`, `lib/evidence-store.ts` |
| `app/api/toc/route.ts` | Theory of Change documents (per-learner) | `lib/store.ts` |
| `app/api/chat/route.ts` | Community chat messages | `lib/chat.ts` |
| `app/api/chat/dms/route.ts` | Direct messages | `lib/chat.ts` |
| `app/api/chat/my-client/route.ts` | `my_client` RPC replacement | `lib/chat.ts` |
| `app/api/people/route.ts` | `org_people` RPC replacement — people directory | `lib/chat.ts` |

---

## What Does NOT Change

- **All UI components** — they call the same functions with the same signatures
- **All page routes** — `app/(app)/*/page.tsx` files are untouched
- **All localStorage keys and formats** — the fallback data stays identical
- **The `isDemo` pattern** — instead of `!isSupabaseConfigured`, it becomes `!session` (no auth cookie)
- **API routes for AI** (`/api/coach`, `/api/analysis`) and **email** (`/api/email`) — these already use server-side env vars (Anthropic, Brevo) and don't touch Supabase
