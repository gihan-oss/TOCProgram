import { NextResponse } from "next/server";

// Sends email via Resend (https://resend.com — free tier, 1 env var).
// Without RESEND_API_KEY the request is acknowledged but simulated, so the
// product flows keep working before email is configured.

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

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Amal & Company Portal <onboarding@resend.dev>";

  if (!key) {
    console.log(`[email simulated] to=${to} subject="${subject}"`);
    return NextResponse.json({ ok: true, demo: true });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
    return NextResponse.json({ ok: false, error: "Email provider error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
