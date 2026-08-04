// Access-control helpers for API routes — SERVER-ONLY (never imported in client code).
// Centralises the "is this a signed-in user / staff member / allowed to touch
// this email" checks so route handlers don't each repeat the same query.

import { getSessionEmail } from "./auth-server";
import { queryOne } from "./db";
import { resolveAccess } from "./access";

export interface ApiUser {
  email: string;
  role: string;
}

const STAFF_ROLES = ["admin", "facilitator", "coordinator"];

/** Resolve the current session to { email, role }. Null when not signed in.
 *  Role resolution matches getSessionUser and the client: the static
 *  allowlist (admin domains) wins, then the members row, then participant. */
export async function currentUser(): Promise<ApiUser | null> {
  const email = await getSessionEmail();
  if (!email) return null;
  const staticAccess = resolveAccess(email);
  const row = await queryOne<{ role: string }>(
    `SELECT role FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const role = staticAccess.allowed ? staticAccess.role : (row?.role ?? "participant");
  return { email, role };
}

/** Require a signed-in user. Returns the user, or null (caller returns 401). */
export async function requireUser(): Promise<ApiUser | null> {
  return currentUser();
}

/** Require a signed-in user with one of the given roles. Null otherwise. */
export async function requireStaff(roles: string[] = ["admin"]): Promise<ApiUser | null> {
  const u = await currentUser();
  if (!u) return null;
  return roles.includes(u.role) ? u : null;
}

/** True when the caller may act on behalf of `email` (their own, or staff). */
export async function canAccess(email: string): Promise<boolean> {
  const u = await currentUser();
  if (!u) return false;
  if (u.email.toLowerCase() === email.toLowerCase()) return true;
  return STAFF_ROLES.includes(u.role);
}
