import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ADMIN_DOMAINS, ADMIN_EMAILS } from "@/lib/access";
import { genTempPassword } from "@/lib/email-templates";

// Admin-only: reset a user's password to a fresh temporary one, so an admin can
// hand it to someone who's locked out (the same idea as the invite temp
// password, but for accounts that have already signed in).
//
// This needs the Supabase SERVICE ROLE key, which bypasses row-level security —
// so it lives ONLY here on the server, read from an env var, and every request
// is gated: we verify the caller's own session and confirm they're an admin
// before touching anyone's account. Without the key set, we return 501 so the
// client falls back to emailing a self-service reset link.

export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://evwzlgzticnblpdqphus.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function callerIsAdmin(sb: ReturnType<typeof admin>, email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const domain = e.split("@")[1] ?? "";
  if (ADMIN_DOMAINS.includes(domain) || ADMIN_EMAILS.includes(e)) return true;
  // Otherwise check the members table (service role bypasses RLS).
  const { data } = await sb.from("members").select("role").eq("email", e).maybeSingle();
  return (data as { role?: string } | null)?.role === "admin";
}

// Look up a user by email. The admin API has no direct getByEmail, so page
// through the user list (cohorts here are small; cap the scan for safety).
async function findUserId(sb: ReturnType<typeof admin>, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

export async function POST(req: Request) {
  if (!SERVICE_KEY) {
    return NextResponse.json(
      { ok: false, code: "not_configured", error: "Direct password reset isn't configured. Add SUPABASE_SERVICE_ROLE_KEY to the deployment." },
      { status: 501 },
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "No email provided" }, { status: 400 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const sb = admin();

  // 1) Verify the caller from their access token.
  const { data: callerData, error: callerErr } = await sb.auth.getUser(token);
  const callerEmail = callerData?.user?.email;
  if (callerErr || !callerEmail) return NextResponse.json({ ok: false, error: "Session invalid — sign in again" }, { status: 401 });

  // 2) Confirm the caller is actually an admin.
  if (!(await callerIsAdmin(sb, callerEmail))) {
    return NextResponse.json({ ok: false, error: "Only administrators can reset passwords" }, { status: 403 });
  }

  // 3) Find the target account.
  const userId = await findUserId(sb, email);
  if (!userId) {
    return NextResponse.json(
      { ok: false, code: "no_account", error: "No account exists for that email yet (they may not have signed in). Use Resend to send their invite instead." },
      { status: 404 },
    );
  }

  // 4) Set a fresh temporary password and confirm the email so they can sign in.
  const password = genTempPassword();
  const { error: updErr } = await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 502 });

  return NextResponse.json({ ok: true, password });
}
