import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  verifyGoogleToken,
} from "@/lib/auth-server";
import { queryOne, execute } from "@/lib/db";
import { resolveAccess } from "@/lib/access";

// POST /api/auth/signin — Email/password or Google sign-in
export async function POST(req: Request) {
  let body: { email?: string; password?: string; googleToken?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Google sign-in
  if (body.googleToken) {
    const googleUser = await verifyGoogleToken(body.googleToken);
    if (!googleUser) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }
    // Check access
    const access = resolveAccess(googleUser.email);
    const member = await queryOne<{ role: string }>(
      `SELECT role FROM members WHERE LOWER(email) = LOWER($1)`,
      [googleUser.email],
    );
    if (!access.allowed && !member) {
      return NextResponse.json({ error: access.reason ?? "Not authorized" }, { status: 403 });
    }
    // Upsert users row (name) and members row (role) if not exists
    if (!member) {
      const role = access.role;
      await execute(
        `INSERT INTO users (email, name) VALUES (LOWER($1), $2)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
        [googleUser.email, googleUser.name],
      );
      await execute(
        `INSERT INTO members (email, role, status) VALUES (LOWER($1), $2, 'Active')
         ON CONFLICT (email) DO NOTHING`,
        [googleUser.email, role],
      );
    } else {
      // Update name in users for existing members
      await execute(
        `INSERT INTO users (email, name) VALUES (LOWER($1), $2)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
        [googleUser.email, googleUser.name],
      );
    }
    // Create/update profile
    await execute(
      `INSERT INTO profiles (email, name, avatar_url, updated_at)
       VALUES (LOWER($1), $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url)`,
      [googleUser.email, googleUser.name, googleUser.picture ?? ""],
    );
    await setSessionCookie(googleUser.email);
    // Role resolution matches getSessionUser: static allowlist wins, then the
    // members row.
    const role = access.allowed ? access.role : (member?.role ?? access.role);
    return NextResponse.json({
      user: { email: googleUser.email, name: googleUser.name, role },
    });
  }

  // Email/password sign-in
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Check if user exists (users table) and member exists (members table)
  const user = await queryOne<{ name: string; password_hash: string | null }>(
    `SELECT name, password_hash FROM users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const member = await queryOne<{ role: string; temp_password: string }>(
    `SELECT role, temp_password FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const displayName = user?.name || email.split("@")[0];

  if (!user && !member) {
    // First-time sign-in: must be on the allowlist (invited member or admin
    // domain). Auto-create both users and members rows.
    const access = resolveAccess(email);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? "Not authorized" }, { status: 403 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    const hashed = await hashPassword(password);
    const name = email.split("@")[0];
    await execute(
      `INSERT INTO users (email, name, password_hash) VALUES (LOWER($1), $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, name, hashed],
    );
    await execute(
      `INSERT INTO members (email, role, status) VALUES (LOWER($1), $2, 'Active')
       ON CONFLICT (email) DO NOTHING`,
      [email, access.role],
    );
    await setSessionCookie(email);
    return NextResponse.json({ user: { email, name, role: access.role } });
  }

  // Determine role: static allowlist wins, then members row.
  const staticAccess = resolveAccess(email);
  const role = staticAccess.allowed ? staticAccess.role : (member?.role ?? "participant");

  // Block returning users whose member row was removed and who are not on the
  // static admin allowlist. This mirrors the old client-side resolveWithMembers()
  // that checked the members table before every sign-in attempt.
  if (!staticAccess.allowed && !member) {
    return NextResponse.json({ error: "Access revoked — please contact your administrator." }, { status: 403 });
  }

  // Verify password: users.password_hash first (permanent), then
  // members.temp_password (invite password, plaintext or bcrypt).
  let pwValid = false;
  if (user?.password_hash) {
    pwValid = await verifyPassword(password, user.password_hash);
  } else if (member?.temp_password) {
    if (member.temp_password.startsWith("$2")) {
      pwValid = await verifyPassword(password, member.temp_password);
    } else {
      // Constant-time comparison for plaintext invite passwords.
      const a = Buffer.from(password);
      const b = Buffer.from(member.temp_password);
      pwValid = a.length === b.length && timingSafeEqual(a, b);
    }
  } else {
    // Neither a permanent password nor an invite password is set — this
    // user was created without credentials. Require a password reset.
    return NextResponse.json(
      { error: "No password is set for this account. Please use the password reset link or contact your administrator." },
      { status: 401 },
    );
  }
  if (!pwValid) {
    return NextResponse.json({ error: "Incorrect password. Please use the password from your invitation email." }, { status: 401 });
  }

  // Set/upgrade the permanent password hash in users.
  if (!user?.password_hash || !user.password_hash.startsWith("$2")) {
    const hashed = await hashPassword(password);
    await execute(
      `INSERT INTO users (email, name, password_hash) VALUES (LOWER($1), $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, displayName, hashed],
    );
  }
  // Clear the one-time invite password once the permanent one is set.
  if (member?.temp_password) {
    await execute(`UPDATE members SET temp_password = '' WHERE LOWER(email) = LOWER($1)`, [email]);
  }

  await setSessionCookie(email);
  return NextResponse.json({ user: { email, name: displayName, role } });
}
