import { NextResponse } from "next/server";
import {
  hashPassword,
  getSessionEmail,
  setSessionCookie,
  createResetToken,
  verifyResetToken,
} from "@/lib/auth-server";
import { queryOne, execute } from "@/lib/db";
import { sendEmailServer } from "@/lib/email-server";
import { resolveAccess } from "@/lib/access";

// POST /api/auth/reset
//   { password }        — change own password (signed in)
//   { token, password } — set a new password from a reset link
//   { email }           — email a "forgot password" reset link
export async function POST(req: Request) {
  let body: { password?: string; email?: string; token?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Password change (user is signed in)
  if (body.password && !body.token) {
    const email = await getSessionEmail();
    if (!email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const hashed = await hashPassword(body.password);
    await execute(
      `UPDATE members SET temp_password = $1 WHERE LOWER(email) = LOWER($2)`,
      [hashed, email],
    );
    return NextResponse.json({ ok: true });
  }

  // Reset link → set a new password
  if (body.token && body.password) {
    const email = verifyResetToken(body.token);
    if (!email) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
    }
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const hashed = await hashPassword(body.password);
    await execute(
      `INSERT INTO members (email, name, role, status, temp_password)
       VALUES (LOWER($1), '', 'participant', 'Active', $2)
       ON CONFLICT (email) DO UPDATE SET temp_password = EXCLUDED.temp_password, status = 'Active'`,
      [email, hashed],
    );
    await setSessionCookie(email);
    return NextResponse.json({ ok: true });
  }

  // Forgot-password request — never reveal whether the email exists
  if (body.email) {
    const member = await queryOne<{ email: string; name: string }>(
      `SELECT email, name FROM members WHERE LOWER(email) = LOWER($1)`,
      [body.email],
    );
    // Also send for static-allowlist users (admin domain) with no row yet; the
    // token branch below creates the member row when the new password is set.
    const staticAccess = resolveAccess(body.email);
    if (member || staticAccess.allowed) {
      const token = createResetToken(member?.email ?? body.email);
      const origin = new URL(req.url).origin;
      const link = `${origin}/reset?token=${encodeURIComponent(token)}`;
      const html = `<p>Hi${member?.name ? ` ${member.name}` : ""},</p>
        <p>You asked to reset your password for the Impact Portal.</p>
        <p><a href="${link}">Choose a new password</a></p>
        <p>This link expires in 1 hour. If you didn't ask for it, you can safely ignore this email.</p>`;
      await sendEmailServer({
        to: member?.email ?? body.email,
        subject: "Reset your Impact Portal password",
        html,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide password (to change), token + password (to reset), or email (to reset)" }, { status: 400 });
}
