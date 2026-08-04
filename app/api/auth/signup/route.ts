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

  // Check if already a member
  const existing = await queryOne<{ email: string }>(
    `SELECT email FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );

  const access = resolveAccess(email);
  if (!existing) {
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? "Not authorized" }, { status: 403 });
    }
  }

  const hashed = await hashPassword(password);

  if (existing) {
    // Update existing member's password (first-time invitee setting their own)
    await execute(
      `UPDATE members SET temp_password = $1 WHERE LOWER(email) = LOWER($2)`,
      [hashed, email],
    );
  } else {
    await execute(
      `INSERT INTO members (email, name, role, status, temp_password)
       VALUES (LOWER($1), $2, $3, 'Active', $4)
       ON CONFLICT (email) DO UPDATE SET temp_password = EXCLUDED.temp_password`,
      [email, name || email.split("@")[0], access.role, hashed],
    );
  }

  // Auto sign-in after signup
  await setSessionCookie(email);
  return NextResponse.json({ ok: true });
}
