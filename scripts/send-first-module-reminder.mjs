#!/usr/bin/env node
// First-module reminder — emails a cohort chapter to continue Module 1.
//
// The first module is finished and its video is uploaded on the LMS, so this
// automation nudges members to go back in and complete it. It reads the
// audience straight from Brevo (the same contacts the portal already uses),
// filters to a single chapter by their JOB_TITLE attribute (default "MAS GLA"),
// and sends each a personalised reminder via Brevo transactional email.
//
// It reuses the app's email posture from app/api/email/route.ts:
//   - Brevo is the sender (BREVO_API_KEY).
//   - Self-healing sender: if EMAIL_FROM isn't a verified Brevo sender, it
//     falls back to the first verified one (every Brevo account verifies its
//     signup email), so sends work as long as ANY sender is verified.
//
// SAFE BY DEFAULT: this is a dry run unless you pass --send. A dry run prints
// exactly who would be emailed (and who is skipped) and sends nothing.
//
// Usage:
//   node scripts/send-first-module-reminder.mjs            # dry run (default)
//   node scripts/send-first-module-reminder.mjs --send     # actually send
//   CHAPTER="MAS DC" node scripts/send-first-module-reminder.mjs --send
//   npm run reminder:first-module -- --send
//
// Config (env, or .env.local — read automatically):
//   BREVO_API_KEY   required to send (without it, always a simulated dry run)
//   EMAIL_FROM      "Name <verified@sender>"  (default Amal & Company Portal)
//   LMS_URL         "Continue" button link (default the portal /learning page)
//   BREVO_LIST_ID   contact list to read from (default 2 — the members list)
//   CHAPTER         JOB_TITLE to target (default "MAS GLA")

import { readFileSync } from "node:fs";

// ---- env (load .env.local like Next.js does, without overriding real env) ---
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const SEND = process.argv.includes("--send");
const KEY = process.env.BREVO_API_KEY;
const LIST_ID = Number(process.env.BREVO_LIST_ID || 2);
const CHAPTER = (process.env.CHAPTER || "MAS GLA").trim();
const LMS_URL = process.env.LMS_URL || "https://toc.amalandco.com/";
// Logos/photos live in the portal's /public, so derive their base from LMS_URL.
const ASSET_BASE = (() => { try { return new URL(LMS_URL).origin; } catch { return "https://toc.amalandco.com"; } })();

function parseFrom(raw) {
  const m = String(raw || "").match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "Amal & Company", email: m[2] };
  return { name: "Amal & Company", email: (raw || "").trim() };
}
const FROM = parseFrom(process.env.EMAIL_FROM || "Amal & Company Portal <noreply@amalandcompany.com>");
const REPLY_TO = { email: "programs@amalandcompany.com", name: "Amal & Company" };

// ---- email content ----------------------------------------------------------
const SUBJECT = "Thank you for attending Module 1 — your video & assignment are ready";

function greeting(firstName) {
  const name = (firstName || "").trim();
  // Contacts carry mixed data; only greet by name when it looks like a name.
  return name && name.toLowerCase() !== "there" ? `Hi ${name},` : "Hi there,";
}

function html(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Thank you for attending Module 1</title></head>
<body style="margin:0; padding:0; background-color:#f5f3ff; font-family:'Segoe UI', Helvetica, Arial, sans-serif; color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff; padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(91,33,182,0.08);">
        <tr><td background="${ASSET_BASE}/photo-gathering.jpg" valign="top" style="background-color:#6d28d9; background-image:linear-gradient(135deg, rgba(76,29,149,0.88) 0%, rgba(124,58,237,0.82) 55%, rgba(139,92,246,0.80) 100%), url('${ASSET_BASE}/photo-gathering.jpg'); background-size:cover; background-position:center; padding:44px 40px 52px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td align="left" style="vertical-align:middle;">
              <img src="${ASSET_BASE}/logo-white.png" alt="Amal &amp; Company" height="30" style="height:30px; width:auto; display:inline-block; vertical-align:middle;">
              <span style="display:inline-block; width:1px; height:26px; background:rgba(255,255,255,0.40); margin:0 14px; vertical-align:middle;"></span>
              <span style="display:inline-block; vertical-align:middle; color:#ffffff; font-size:18px; font-weight:800; letter-spacing:0.5px;">${CHAPTER}</span>
            </td>
          </tr></table>
          <p style="margin:26px 0 0; color:#ede9fe; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; font-weight:600;">Theory of Change · Module 1</p>
          <h1 style="margin:8px 0 0; color:#ffffff; font-size:27px; line-height:1.3; font-weight:700; text-shadow:0 1px 12px rgba(0,0,0,0.25);">Thank you for attending Module 1</h1>
        </td></tr>
        <tr><td style="padding:34px 40px 8px;">
          <p style="margin:0 0 18px; font-size:16px; line-height:1.6;">${greeting(firstName)}</p>
          <p style="margin:0 0 18px; font-size:16px; line-height:1.6;">Thank you for attending <strong>Module 1</strong> of the ${CHAPTER} <strong>Theory of Change</strong> program — it was a pleasure to have you with us.</p>
          <p style="margin:0 0 20px; font-size:16px; line-height:1.6;">We've now <strong>completed Module 1</strong>, and the full session <strong>video is uploaded to the portal</strong> so you can watch — or rewatch — it anytime.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px; width:100%; background-color:#f5f3ff; border-radius:12px; border-left:4px solid #8b5cf6;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 10px; font-size:15px; line-height:1.6; color:#5b21b6;">🎥 <strong>Module 1 video</strong> — now available on the portal to watch.</p>
              <p style="margin:0; font-size:15px; line-height:1.6; color:#5b21b6;">📝 <strong>Your assignment</strong> — please don't forget to complete your Module 1 assignment.</p>
            </td></tr>
          </table>
          <p style="margin:0 0 26px; font-size:16px; line-height:1.6;">Everything is on the portal — sign in anytime to watch the video and submit your assignment.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td align="center" style="border-radius:10px; background:linear-gradient(135deg,#6d28d9 0%,#8b5cf6 100%);">
              <a href="${LMS_URL}" target="_blank" style="display:inline-block; padding:14px 34px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none;">Watch &amp; Complete My Assignment →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 6px; font-size:14px; line-height:1.6; color:#6b7280;">Or sign in directly at <a href="${LMS_URL}" style="color:#6d28d9;">the portal</a>.</p>
        </td></tr>
        <tr><td style="padding:20px 40px 34px;">
          <p style="margin:22px 0 4px; font-size:16px; line-height:1.6;">Warm regards,</p>
          <p style="margin:0; font-size:16px; line-height:1.6; font-weight:600; color:#5b21b6;">The Amal &amp; Company Team</p>
        </td></tr>
        <tr><td style="background-color:#faf5ff; padding:22px 40px; border-top:1px solid #ede9fe;">
          <p style="margin:0; font-size:12px; line-height:1.6; color:#9ca3af;">You're receiving this as a participant in the ${CHAPTER} Theory of Change program, delivered by Amal &amp; Company.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---- Brevo helpers ----------------------------------------------------------
async function brevo(path, init = {}) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    ...init,
    headers: { "api-key": KEY, accept: "application/json", "Content-Type": "application/json", ...(init.headers || {}) },
  });
  return res;
}

async function verifiedSenders() {
  const res = await brevo("/senders");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.senders ?? []).filter((s) => s.active !== false).map((s) => ({ name: s.name, email: s.email }));
}

// Read the whole list (paginated), keep only the target chapter, drop
// blacklisted addresses — Brevo would reject those anyway.
async function audience() {
  const wanted = CHAPTER.toLowerCase();
  const members = [];
  let offset = 0;
  for (;;) {
    const res = await brevo(`/contacts?listIds=${LIST_ID}&limit=500&offset=${offset}`, { method: "GET" });
    if (!res.ok) throw new Error(`Brevo contacts read failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
    const { contacts = [] } = await res.json();
    if (contacts.length === 0) break;
    for (const c of contacts) {
      const chapter = String(c.attributes?.JOB_TITLE || "").trim().toLowerCase();
      if (chapter !== wanted) continue;
      if (c.emailBlacklisted) { members.push({ ...norm(c), skipped: "blacklisted" }); continue; }
      members.push(norm(c));
    }
    offset += contacts.length;
  }
  return members;
}
const norm = (c) => ({ email: c.email, firstName: c.attributes?.FIRSTNAME || "" });

async function sendOne(to, subject, body, sender) {
  const res = await brevo("/smtp/email", {
    method: "POST",
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: body, replyTo: REPLY_TO }),
  });
  return res;
}

// ---- run --------------------------------------------------------------------
async function main() {
  console.log(`\n📣 First-module reminder → chapter "${CHAPTER}" (list ${LIST_ID})`);
  console.log(`   Mode: ${SEND ? "SEND" : "DRY RUN (no email sent — pass --send to send)"}\n`);

  if (!KEY) {
    console.log("⚠️  No BREVO_API_KEY set — cannot reach Brevo. Nothing sent.");
    console.log("   Set BREVO_API_KEY (and EMAIL_FROM) in .env.local or the environment, then re-run.\n");
    process.exit(SEND ? 1 : 0);
  }

  const people = await audience();
  const recipients = people.filter((p) => !p.skipped);
  const skipped = people.filter((p) => p.skipped);

  if (people.length === 0) {
    console.log(`No contacts found with JOB_TITLE = "${CHAPTER}". Check the chapter name / list id.\n`);
    process.exit(0);
  }

  console.log(`Found ${people.length} in "${CHAPTER}" — ${recipients.length} to email, ${skipped.length} skipped:\n`);
  recipients.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2)}. ${p.email}${p.firstName ? `  (${p.firstName})` : ""}`));
  skipped.forEach((p) => console.log(`   –  ${p.email}  (skipped: ${p.skipped})`));
  console.log("");

  if (!SEND) {
    console.log("Dry run complete. Re-run with --send to email the recipients above.\n");
    return;
  }

  // Resolve a usable sender once (self-healing, mirrors app/api/email).
  const verified = await verifiedSenders();
  let sender = FROM;
  if (verified.length && !verified.some((v) => v.email.toLowerCase() === FROM.email.toLowerCase())) {
    sender = { name: FROM.name, email: verified[0].email };
    console.log(`ℹ️  EMAIL_FROM (${FROM.email}) isn't a verified Brevo sender — using ${sender.email}.\n`);
  }

  let sent = 0;
  const failed = [];
  for (const p of recipients) {
    const res = await sendOne(p.email, SUBJECT, html(p.firstName), sender);
    if (res.ok) { sent++; console.log(`  ✅ ${p.email}`); }
    else { const detail = (await res.text()).slice(0, 160); failed.push({ email: p.email, detail }); console.log(`  ❌ ${p.email} — ${res.status} ${detail}`); }
  }

  console.log(`\nDone. Sent ${sent}/${recipients.length}. ${failed.length ? `Failed: ${failed.length}.` : "No failures."}\n`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(`\n💥 ${e.message}\n`); process.exit(1); });
