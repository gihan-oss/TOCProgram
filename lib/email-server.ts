// Server-side transactional email (Brevo, with Resend fallback).
// Mirrors the logic of /api/email so server-only flows (e.g. password reset)
// can send without a client round-trip. Returns the same shape as the route.

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  replyToName?: string;
  fromName?: string;
}

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "Amal & Company", email: m[2] };
  return { name: "Amal & Company", email: raw.trim() };
}

async function brevoVerifiedSenders(key: string): Promise<{ name: string; email: string }[]> {
  try {
    const res = await fetch("https://api.brevo.com/v3/senders", {
      headers: { "api-key": key, accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { senders?: { name: string; email: string; active?: boolean }[] };
    return (data.senders ?? []).filter((s) => s.active !== false).map((s) => ({ name: s.name, email: s.email }));
  } catch {
    return [];
  }
}

async function brevoSend(
  key: string,
  sender: { name: string; email: string },
  to: string,
  subject: string,
  html: string,
  replyTo?: { email: string; name?: string },
) {
  return fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(replyTo ? { replyTo } : {}),
    }),
  });
}

export async function sendEmailServer({ to, subject, html, replyTo, replyToName, fromName }: EmailOptions) {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const envFrom = parseFrom(process.env.EMAIL_FROM || "Amal & Company Portal <noreply@amalandcompany.com>");
  // The verified sender address never changes (anti-spoofing), but the display
  // NAME can — so a Nuri question shows as "Asker's Name" in the team's inbox,
  // and Reply goes straight to them via reply-to.
  const from = { name: fromName || envFrom.name, email: envFrom.email };
  const replyToObj = replyTo ? { email: replyTo, ...(replyToName ? { name: replyToName } : {}) } : undefined;

  // ---- Brevo (preferred, self-healing sender) ----
  if (brevoKey) {
    let res = await brevoSend(brevoKey, from, to, subject, html, replyToObj);
    if (res.ok) return { ok: true, provider: "brevo" };

    const firstErr = (await res.text()).slice(0, 200);

    // Likely an unverified sender — fall back to a verified one and retry once.
    const verified = await brevoVerifiedSenders(brevoKey);
    if (verified.length > 0 && verified[0].email.toLowerCase() !== from.email.toLowerCase()) {
      res = await brevoSend(brevoKey, { name: from.name, email: verified[0].email }, to, subject, html, replyToObj);
      if (res.ok) return { ok: true, provider: "brevo", usedSender: verified[0].email, healed: true };
    }

    const detail = verified.length === 0
      ? "no verified senders in Brevo — add & verify one"
      : firstErr;
    console.error("[email] Brevo error:", detail);
    return { ok: false, error: `Brevo: ${detail}`.slice(0, 280) };
  }

  // ---- Resend (fallback) ----
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${from.name} <${from.email}>`, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (res.ok) return { ok: true, provider: "resend" };
    return { ok: false, error: `Resend: ${(await res.text()).slice(0, 200)}` };
  }

  console.log(`[email simulated] to=${to} subject="${subject}"`);
  return { ok: true, demo: true };
}
