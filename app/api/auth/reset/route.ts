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
      `INSERT INTO users (email, name, encrypted_password) VALUES (LOWER($1), '', $2)
       ON CONFLICT (email) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password`,
      [email, hashed],
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
      `INSERT INTO users (email, name, encrypted_password) VALUES (LOWER($1), '', $2)
       ON CONFLICT (email) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password`,
      [email, hashed],
    );
    // Ensure a members row exists so the user can sign in (static-allowlist
    // users may not have one yet).
    const staticAccess = resolveAccess(email);
    if (staticAccess.allowed) {
      await execute(
        `INSERT INTO members (email, role, status) VALUES (LOWER($1), $2, 'Active')
         ON CONFLICT (email) DO NOTHING`,
        [email, staticAccess.role],
      );
    }
    await setSessionCookie(email);
    return NextResponse.json({ ok: true });
  }

  // Forgot-password request — never reveal whether the email exists
  if (body.email) {
    const user = await queryOne<{ email: string; name: string }>(
      `SELECT email, name FROM users WHERE LOWER(email) = LOWER($1)`,
      [body.email],
    );
    // Also send for static-allowlist users (admin domain) with no row yet.
    const staticAccess = resolveAccess(body.email);
    if (user || staticAccess.allowed) {
      const token = createResetToken(user?.email ?? body.email);
      const origin = new URL(req.url).origin;
      const link = `${origin}/reset?token=${encodeURIComponent(token)}`;
      const html = `<p>Hi${user?.name ? ` ${user.name}` : ""},</p>
        <p>You asked to reset your password for the Impact Portal.</p>
        <p><a href="${link}">Choose a new password</a></p>
        <p>This link expires in 1 hour. If you didn't ask for it, you can safely ignore this email.</p>`;
      await sendEmailServer({
        to: user?.email ?? body.email,
        subject: "Reset your Impact Portal password",
        html,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide password (to change), token + password (to reset), or email (to reset)" }, { status: 400 });
}
