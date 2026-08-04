import { NextResponse } from "next/server";
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
    // Upsert member if not exists
    if (!member) {
      const role = access.role;
      await execute(
        `INSERT INTO members (email, name, role, status) VALUES (LOWER($1), $2, $3, 'Active')
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
        [googleUser.email, googleUser.name, role],
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

  // Check if member exists in the allowlist
  const member = await queryOne<{ email: string; name: string; role: string; temp_password: string }>(
    `SELECT email, name, role, temp_password FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );

  if (!member) {
    // First-time sign-in: must be on the allowlist (invited member or admin
    // domain). Auto-create the account with the password they enter — same
    // behaviour as the old Supabase invitee auto-approve, so nobody is locked
    // out and nobody can sign in without a password.
    const access = resolveAccess(email);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? "Not authorized" }, { status: 403 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    const hashed = await hashPassword(password);
    await execute(
      `INSERT INTO members (email, name, role, status, temp_password)
       VALUES (LOWER($1), $2, $3, 'Active', $4)
       ON CONFLICT (email) DO UPDATE SET temp_password = EXCLUDED.temp_password, role = EXCLUDED.role`,
      [email, email.split("@")[0], access.role, hashed],
    );
    await setSessionCookie(email);
    return NextResponse.json({ user: { email, name: email.split("@")[0], role: access.role } });
  }

  // Verify: bcrypt hash (migrated Supabase password or one set by the user),
  // then legacy plaintext temp password, then first-sign-in (no password yet).
  let pwValid = false;
  if (member.temp_password.startsWith("$2")) {
    pwValid = await verifyPassword(password, member.temp_password);
  } else if (member.temp_password) {
    pwValid = password === member.temp_password;
  } else {
    pwValid = true; // no temp password yet — first sign-in adopts this one
  }
  if (!pwValid) {
    return NextResponse.json({ error: "Incorrect password. Please use the password from your invitation email." }, { status: 401 });
  }
  // Upgrade plaintext / missing temp passwords to a bcrypt hash.
  if (!member.temp_password || !member.temp_password.startsWith("$2")) {
    const hashed = await hashPassword(password);
    await execute(`UPDATE members SET temp_password = $1 WHERE LOWER(email) = LOWER($2)`, [hashed, member.email]);
  }

  await setSessionCookie(member.email);
  return NextResponse.json({ user: { email: member.email, name: member.name, role: member.role } });
}
