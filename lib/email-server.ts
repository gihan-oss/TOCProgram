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
    // Resolve to an AUTHORIZED sender BEFORE sending. Brevo will accept a send
    // over the API (HTTP 201 → res.ok) from an address that is not an authorized
    // sender, then block delivery downstream with status "Blocked – unauthorized".
    // So res.ok alone is not proof of delivery. If EMAIL_FROM isn't an authorized
    // sender, send from the first authorized one instead (keeping the display
    // name), which prevents the unauthorized-sender block entirely.
    const verified = await brevoVerifiedSenders(brevoKey);
    if (verified.length === 0) {
      console.error("[email] Brevo error: no authorized senders — add & verify one");
      return { ok: false, error: "Brevo: no authorized senders in Brevo — add & verify one" };
    }
    const fromAuthorized = verified.some((v) => v.email.toLowerCase() === from.email.toLowerCase());
    const sender = fromAuthorized ? from : { name: from.name, email: verified[0].email };

    const res = await brevoSend(brevoKey, sender, to, subject, html, replyToObj);
    if (res.ok) {
      return {
        ok: true,
        provider: "brevo",
        usedSender: sender.email,
        healed: sender.email.toLowerCase() !== from.email.toLowerCase(),
      };
    }
    const detail = (await res.text()).slice(0, 200);
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
