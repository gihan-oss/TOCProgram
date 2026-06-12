import { NextResponse } from "next/server";

// Sends transactional email. Supports Brevo (BREVO_API_KEY) — and Resend
// (RESEND_API_KEY) as a fallback. Without either key the send is simulated so
// product flows keep working before email is configured.

function parseFrom(raw: string): { name: string; email: string } {
  // Accepts "Name <email@x>" or just "email@x"
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "Amal & Company", email: m[2] };
  return { name: "Amal & Company", email: raw.trim() };
}

export async function POST(req: Request) {
  let payload: { to?: string; subject?: string; html?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, subject, html } = payload;
  if (!to || !subject || !html) {
    return NextResponse.json({ ok: false, error: "Missing to/subject/html" }, { status: 400 });
  }

  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = parseFrom(process.env.EMAIL_FROM || "Amal & Company Portal <noreply@amalandcompany.com>");

  // ---- Brevo (preferred) ----
  if (brevoKey) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoKey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Brevo error:", err);
      return NextResponse.json({ ok: false, error: `Brevo: ${err}`.slice(0, 280) }, { status: 502 });
    }
    return NextResponse.json({ ok: true, provider: "brevo" });
  }

  // ---- Resend (fallback) ----
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${from.name} <${from.email}>`, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend error:", err);
      return NextResponse.json({ ok: false, error: "Email provider error (Resend)" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, provider: "resend" });
  }

  console.log(`[email simulated] to=${to} subject="${subject}"`);
  return NextResponse.json({ ok: true, demo: true });
}
