import { NextResponse } from "next/server";
import { getSessionEmail, hashPassword } from "@/lib/auth-server";
import { queryOne, execute } from "@/lib/db";
import { genTempPassword } from "@/lib/email-templates";
import { ADMIN_DOMAINS, ADMIN_EMAILS } from "@/lib/access";

// Admin-only: reset a user's password to a fresh temporary one, so an admin
// can hand it to someone who's locked out. The caller's JWT session is verified
// and admin status confirmed before touching any account.

export const maxDuration = 30;

async function callerIsAdmin(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const domain = e.split("@")[1] ?? "";
  if (ADMIN_DOMAINS.includes(domain) || ADMIN_EMAILS.includes(e)) return true;
  const row = await queryOne<{ role: string }>(
    `SELECT role FROM members WHERE LOWER(email) = LOWER($1)`,
    [e],
  );
  return row?.role === "admin";
}

export async function POST(req: Request) {
  // 1) Verify the caller is signed in.
  const callerEmail = await getSessionEmail();
  if (!callerEmail) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  // 2) Confirm the caller is actually an admin.
  if (!(await callerIsAdmin(callerEmail))) {
    return NextResponse.json(
      { ok: false, error: "Only administrators can reset passwords" },
      { status: 403 },
    );
  }

  // 3) Parse the target email.
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "No email provided" }, { status: 400 });

  // 4) Confirm the target account exists.
  const user = await queryOne<{ email: string }>(
    `SELECT email FROM users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "no_account", error: "No account exists for that email yet (they may not have signed in). Use Resend to send their invite instead." },
      { status: 404 },
    );
  }

  // 5) Set a fresh temporary password.
  const password = genTempPassword();
  const hashed = await hashPassword(password);
  const affected = await execute(
    `UPDATE users SET encrypted_password = $1, updated_at = now() WHERE LOWER(email) = LOWER($2)`,
    [hashed, email],
  );
  if (affected < 1) {
    return NextResponse.json({ ok: false, error: "Password reset failed — try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, password });
}
