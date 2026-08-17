import { NextResponse } from "next/server";

// Sends transactional email via Brevo (BREVO_API_KEY), with Resend
// (RESEND_API_KEY) as a fallback. Without a key, sends are simulated so product
// flows keep working before email is configured.
//
// Self-healing: Brevo rejects sends from an unverified sender. If the configured
// EMAIL_FROM isn't verified, we look up the account's verified senders and retry
// with the first valid one — so email works as long as ANY sender is verified
// (every Brevo account auto-verifies its signup email).

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

type Attachment = { name: string; content: string }; // content = base64 (no data: prefix)

async function brevoSend(key: string, sender: { name: string; email: string }, to: string, subject: string, html: string, replyTo?: { email: string; name?: string }, attachments?: Attachment[]) {
  return fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments && attachments.length ? { attachment: attachments } : {}),
    }),
  });
}

// GET — diagnostic. Returns config status (never the key itself) so failures are
// debuggable: is the key set? does it work? which senders are verified?
export async function GET() {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM || "(unset)";
  if (!key) {
    return NextResponse.json({ provider: "none", brevoKeyPresent: false, emailFrom: from, note: "No BREVO_API_KEY — emails are simulated." });
  }
  const acct = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, accept: "application/json" } });
  const keyWorks = acct.ok;
  const senders = keyWorks ? await brevoVerifiedSenders(key) : [];
  return NextResponse.json({
    provider: "brevo",
    brevoKeyPresent: true,
    keyWorks,
    keyError: keyWorks ? undefined : (await acct.text()).slice(0, 200),
    emailFrom: from,
    verifiedSenders: senders.map((s) => s.email),
    note: keyWorks
      ? senders.length === 0
        ? "Key works but NO verified senders — add & verify a sender in Brevo."
        : "Ready. Sends will use a verified sender automatically."
      : "Key rejected by Brevo — check the key / account activation.",
  });
}

export async function POST(req: Request) {
  let payload: { to?: string; subject?: string; html?: string; replyTo?: string; replyToName?: string; fromName?: string; attachments?: Attachment[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, subject, html, replyTo, replyToName, fromName, attachments } = payload;
  if (!to || !subject || !html) {
    return NextResponse.json({ ok: false, error: "Missing to/subject/html" }, { status: 400 });
  }

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
    let res = await brevoSend(brevoKey, from, to, subject, html, replyToObj, attachments);
    if (res.ok) return NextResponse.json({ ok: true, provider: "brevo" });

    const firstErr = (await res.text()).slice(0, 200);

    // Likely an unverified sender — fall back to a verified one and retry once.
    const verified = await brevoVerifiedSenders(brevoKey);
    if (verified.length > 0 && verified[0].email.toLowerCase() !== from.email.toLowerCase()) {
      res = await brevoSend(brevoKey, { name: from.name, email: verified[0].email }, to, subject, html, replyToObj, attachments);
      if (res.ok) return NextResponse.json({ ok: true, provider: "brevo", usedSender: verified[0].email, healed: true });
    }

    const detail = verified.length === 0
      ? "no verified senders in Brevo — add & verify one"
      : firstErr;
    console.error("[email] Brevo error:", detail);
    return NextResponse.json({ ok: false, error: `Brevo: ${detail}`.slice(0, 280) }, { status: 502 });
  }

  // ---- Resend (fallback) ----
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${from.name} <${from.email}>`, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Resend: ${(await res.text()).slice(0, 200)}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, provider: "resend" });
  }

  console.log(`[email simulated] to=${to} subject="${subject}"`);
  return NextResponse.json({ ok: true, demo: true });
}
