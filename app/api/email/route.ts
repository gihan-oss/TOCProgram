import { NextResponse } from "next/server";
import { sendEmailServer } from "@/lib/email-server";

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
  let payload: { to?: string; subject?: string; html?: string; replyTo?: string; replyToName?: string; fromName?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, subject, html, replyTo, replyToName, fromName } = payload;
  if (!to || !subject || !html) {
    return NextResponse.json({ ok: false, error: "Missing to/subject/html" }, { status: 400 });
  }

  const result = await sendEmailServer({ to, subject, html, replyTo, replyToName, fromName });
  if (!result.ok) return NextResponse.json(result, { status: 502 });
  return NextResponse.json(result);
}
