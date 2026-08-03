import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { resetEmail } from "@/lib/email-templates";
import { PORTAL_URL } from "@/lib/mas";

// Send a password-reset email that comes from the Amal & Company portal (via
// Brevo) instead of Supabase's plain default email. We use the service-role key
// to generate a real Supabase recovery link, then deliver it with our own
// branded template through /api/email.
//
// Needs SUPABASE_SERVICE_ROLE_KEY. Without it we return 501 so the caller falls
// back to Supabase's built-in reset email. To avoid leaking which addresses
// have accounts, we always return ok (never reveal existence) once configured.

export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://evwzlgzticnblpdqphus.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

// The public base URL for links. Next's `req.url` reports localhost on Vercel,
// which would send reset links to a machine that isn't there — so derive it from
// the forwarded host header, falling back to the configured portal URL.
function publicOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host && !/^(localhost|127\.0\.0\.1)/i.test(host)) return `${proto}://${host}`;
  return PORTAL_URL;
}

// Diagnostic (no secret): is the service-role key visible to this deployment?
export function GET() {
  return NextResponse.json({ configured: !!SERVICE_KEY });
}

export async function POST(req: Request) {
  if (!SERVICE_KEY) {
    return NextResponse.json({ ok: false, code: "not_configured" }, { status: 501 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "No email provided" }, { status: 400 });

  const origin = publicOrigin(req);
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data, error } = await sb.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/reset` },
    });
    // Prefer the hashed token: our /reset page verifies it client-side with
    // verifyOtp. That way an email link-scanner doing a plain GET can't burn
    // the one-time token (no JS runs), and there's no PKCE verifier to miss.
    const hashed = data?.properties?.hashed_token;
    const link = hashed
      ? `${origin}/reset?token_hash=${encodeURIComponent(hashed)}&type=recovery`
      : data?.properties?.action_link;
    // No account (or any error) → say ok anyway so we don't reveal who exists.
    if (error || !link) return NextResponse.json({ ok: true });

    const { subject, html } = resetEmail({ name: body.name, email, resetUrl: link });
    // Deliver through the existing Brevo-backed email route (same-origin).
    await fetch(`${origin}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, html }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
