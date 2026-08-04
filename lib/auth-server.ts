// Authentication helpers — SERVER-ONLY (never imported in client code).
// Handles bcrypt password hashing, HMAC session tokens, and Google OAuth.
//
// Sessions: HMAC-signed cookies (no database lookups needed per request).
// The cookie contains `email|timestamp|hmac` — stateless, tamper-proof.
// The AUTH_SECRET env var is REQUIRED for HMAC signing.

import { compare, hash } from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Role } from "./types";
import { resolveAccess } from "./access";

// ---- Configuration ---------------------------------------------------------

const SESSION_COOKIE = "toc_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const BCRYPT_ROUNDS = 12;

function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET environment variable is required");
  return s;
}

// ---- Password utilities ----------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

// ---- Session tokens --------------------------------------------------------

export interface SessionPayload {
  email: string;
  name: string;
  role: Role;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Create a session token string (email|timestamp|hmac). */
export function createSessionToken(email: string): string {
  const secret = getAuthSecret();
  const ts = Date.now().toString();
  const payload = `${email.toLowerCase()}|${ts}`;
  const hmac = sign(payload, secret);
  return `${payload}|${hmac}`;
}

/** Verify a session token. Returns the email if valid, null otherwise. */
export function verifySessionToken(token: string): string | null {
  const secret = getAuthSecret();
  const parts = token.split("|");
  if (parts.length !== 3) return null;
  const [email, ts, hmac] = parts;
  if (!email || !ts || !hmac) return null;
  const payload = `${email}|${ts}`;
  const expected = sign(payload, secret);
  // Constant-time comparison to prevent timing attacks
  try {
    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  // Check expiry (30 days)
  const age = Date.now() - parseInt(ts, 10);
  if (age < 0 || age > SESSION_MAX_AGE * 1000) return null;
  return email;
}

// ---- Password-reset tokens -------------------------------------------------
// Short-lived (1 hour), HMAC-signed, so a reset link can't be forged and
// expires naturally. Format: `reset|email|timestamp|hmac`.

const RESET_MAX_AGE = 60 * 60 * 1000; // 1 hour in ms

export function createResetToken(email: string): string {
  const secret = getAuthSecret();
  const payload = `reset|${email.toLowerCase()}|${Date.now()}`;
  return `${payload}|${sign(payload, secret)}`;
}

/** Verify a reset token. Returns the email if valid, null otherwise. */
export function verifyResetToken(token: string): string | null {
  const parts = token.split("|");
  if (parts.length !== 4) return null;
  const [, email, ts, hmac] = parts;
  if (!email || !ts || !hmac) return null;
  const payload = `reset|${email}|${ts}`;
  const expected = sign(payload, getAuthSecret());
  try {
    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const age = Date.now() - parseInt(ts, 10);
  if (age < 0 || age > RESET_MAX_AGE) return null;
  return email;
}

// ---- Cookie helpers --------------------------------------------------------

/** Set the session cookie on the response. */
export async function setSessionCookie(email: string): Promise<void> {
  const token = createSessionToken(email);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clear the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Read and verify the session cookie from an incoming request.
 *  Returns the email if the session is valid, null otherwise. */
export async function getSessionEmail(): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

// ---- Session → user lookup ------------------------------------------------

import { queryOne } from "./db";

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

/** Resolve the current session to a full user object.
 *  Returns null when not authenticated or the database is unavailable. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const email = await getSessionEmail();
  if (!email) return null;
  // Role resolution matches the client: the static allowlist (admin domains)
  // wins, then the members row, then participant.
  const staticAccess = resolveAccess(email);
  const member = await queryOne<{ name: string; role: string }>(
    `SELECT name, role FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const role: Role = staticAccess.allowed
    ? staticAccess.role
    : ((member?.role as Role) ?? "participant");
  return {
    email,
    name: member?.name || email.split("@")[0],
    role,
  };
}

// ---- Google OAuth ----------------------------------------------------------

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

/** Verify a Google ID token and return the user info. */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUser | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.email || !data.email_verified) return null;
    // Bind the token to OUR client ID so ID tokens minted for other Google
    // apps are rejected.
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && data.aud !== clientId) return null;
    return { email: data.email, name: data.name ?? "", picture: data.picture };
  } catch {
    return null;
  }
}
