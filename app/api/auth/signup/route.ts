import { NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth-server";
import { execute, queryOne } from "@/lib/db";
import { resolveAccess } from "@/lib/access";

// POST /api/auth/signup — Create a new account (invited members only)
export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Check if already a member (for role)
  const existingMember = await queryOne<{ role: string }>(
    `SELECT role FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );

  const access = resolveAccess(email);
  if (!existingMember) {
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? "Not authorized" }, { status: 403 });
    }
  }

  const hashed = await hashPassword(password);
  const displayName = name || email.split("@")[0];

  // Set the permanent password in users
  await execute(
    `INSERT INTO users (email, name, password_hash) VALUES (LOWER($1), $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
    [email, displayName, hashed],
  );

  // Ensure members row exists (for role tracking)
  if (!existingMember) {
    await execute(
      `INSERT INTO members (email, role, status) VALUES (LOWER($1), $2, 'Active')
       ON CONFLICT (email) DO NOTHING`,
      [email, access.role],
    );
  } else {
    // Clear the invite temp password — user now has a permanent one
    await execute(
      `UPDATE members SET temp_password = '', status = 'Active' WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
  }

  // Auto sign-in after signup
  await setSessionCookie(email);
  return NextResponse.json({ ok: true });
}
