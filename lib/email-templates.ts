// Email-client-safe HTML templates for transactional mail (invite + welcome).
// Table layout + inline styles so it renders in Gmail, Outlook, Apple Mail, etc.
// Design matches the Amal & Company "TOC Dashboard" onboarding look: navy brand,
// soft blue background, white card, logo bar, numbered steps.

import { MAS, PORTAL_URL } from "./mas";

const BRAND = {
  navy: "#00243c",   // Amal deep navy (headings, buttons)
  blue: "#3f8fb0",   // Amal blue (eyebrow / accents)
  ink: "#404a55",    // body text
  soft: "#5c6b78",   // muted text
  bg: "#e8f0f8",     // page background
  card: "#ffffff",
  border: "#dbe6f0",
  panel: "#f4f9fd",  // soft info panel
};

const HEAD = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
<style>body{margin:0;padding:0;-webkit-text-size-adjust:100%;} table{border-collapse:collapse;} img{border:0;line-height:100%;outline:none;text-decoration:none;display:block;} a{text-decoration:none;} @media only screen and (max-width:620px){.container{width:100% !important;} .px{padding-left:26px !important;padding-right:26px !important;}}</style>`;

// Friendly, memorable temporary password: Word-1234 (easy to read aloud).
export function genTempPassword(): string {
  const words = ["Cedar", "Harbor", "Lantern", "Compass", "Willow", "Summit", "Meadow", "Beacon", "Cobalt", "Saffron", "Juniper", "Marigold"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

// ---- shared building blocks ----------------------------------------------
// The Amal & Company logo, with the client's own logo (or name) beside it when
// a client has uploaded one — a co-brand lockup, same as the portal header.
function logoBar(clientLogoUrl?: string, clientName?: string): string {
  const amal = `<img src="${PORTAL_URL}/logo.png" alt="${MAS.partner}" height="34" style="height:34px;">`;
  const hasClient = !!(clientLogoUrl || clientName);
  const clientCell = clientLogoUrl
    ? `<img src="${clientLogoUrl}" alt="${clientName ?? "Client"}" height="34" style="height:34px;max-width:170px;">`
    : `<span style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;color:${BRAND.navy};">${clientName ?? ""}</span>`;
  const inner = hasClient
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">${amal}</td>
        <td valign="middle" style="padding:0 14px;"><div style="width:1px;height:26px;background:${BRAND.border};font-size:1px;line-height:1px;">&nbsp;</div></td>
        <td valign="middle">${clientCell}</td>
      </tr></table>`
    : amal;
  return `<tr><td class="px" style="padding:22px 36px;border-bottom:1px solid ${BRAND.border};">${inner}</td></tr>`;
}

function hero(eyebrow: string, title: string, sub: string): string {
  return `<tr><td class="px" style="padding:30px 36px 6px 36px;font-family:Arial,Helvetica,sans-serif;">
    <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.blue};">${eyebrow}</div>
    <div style="margin-top:8px;font-size:30px;line-height:1.15;font-weight:800;color:${BRAND.navy};">${title}</div>
    <div style="margin-top:10px;font-size:15px;line-height:1.6;color:${BRAND.soft};">${sub}</div>
  </td></tr>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.navy};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;">${label}</a>`;
}

function step(n: string, title: string, body: string): string {
  return `<tr><td style="padding:0 0 16px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td width="46" valign="top">
        <div style="width:34px;height:34px;border-radius:50%;background:${BRAND.navy};color:#ffffff;font-weight:700;font-size:14px;line-height:34px;text-align:center;font-family:Arial,Helvetica,sans-serif;">${n}</div>
      </td>
      <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:15px;font-weight:700;color:${BRAND.navy};">${title}</div>
        <div style="margin-top:3px;font-size:14px;line-height:1.55;color:${BRAND.soft};">${body}</div>
      </td>
    </tr></table>
  </td></tr>`;
}

function shell(preheader: string, inner: string, brand?: { clientLogoUrl?: string; clientName?: string }): string {
  return `<!doctype html><html lang="en"><head>${HEAD}<title>${MAS.partner}</title></head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.bg};">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};"><tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${BRAND.card};border-radius:14px;overflow:hidden;border:1px solid ${BRAND.border};">
      ${logoBar(brand?.clientLogoUrl, brand?.clientName)}
      ${inner}
      <tr><td class="px" style="padding:22px 36px 30px 36px;border-top:1px solid ${BRAND.border};font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:12px;color:${BRAND.soft};">${MAS.partner} · ${MAS.orgFull}</div>
        <div style="margin-top:4px;font-size:12px;color:${BRAND.soft};font-style:italic;">"${MAS.northStar}"</div>
      </td></tr>
    </table>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9fb0c0;margin-top:14px;">If you weren't expecting this, you can safely ignore this email.</div>
  </td></tr></table>
</body></html>`;
}

// ---- Invite (with sign-in credentials) -----------------------------------
export function inviteEmail(opts: {
  name?: string;
  email: string;
  password: string;
  role: "admin" | "participant" | "coordinator";
  loginUrl: string;
  client?: string;
  clientLogoUrl?: string;
}): { subject: string; html: string } {
  const { name, email, password, role, loginUrl, client, clientLogoUrl } = opts;
  const roleLabel = role === "admin" ? "Administrator" : role === "coordinator" ? "Program Coordinator" : "Learner";
  const greetName = name && name.trim() ? name.trim().split(" ")[0] : "there";
  const subject = `You're invited to the ${MAS.partner} Impact Portal`;
  // The Sign-in link carries the email + temp password so they're pre-filled.
  const signInHref = `${loginUrl}?email=${encodeURIComponent(email)}&pw=${encodeURIComponent(password)}`;

  const inner = `
    ${hero("You're invited", `Welcome to the<br>${MAS.partner} Impact Portal`, `Your home base for the Theory of Change program — invited as <b style="color:${BRAND.ink};">${roleLabel}</b>${client ? ` for <b style="color:${BRAND.ink};">${client}</b>` : ""}.`)}

    <tr><td class="px" style="padding:18px 36px 4px 36px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};font-size:15px;line-height:1.6;">
      <p style="margin:0 0 6px;">Assalamu Alaikum ${greetName},</p>
      <p style="margin:0;color:${BRAND.soft};">Your account is ready. Here are your sign-in details — it takes about two minutes to get started.</p>
    </td></tr>

    <!-- credentials panel -->
    <tr><td class="px" style="padding:16px 36px 4px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.panel};border:1px solid ${BRAND.border};border-radius:12px;"><tr><td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${BRAND.soft};font-weight:700;">Your email</div>
        <div style="margin-top:2px;font-size:15px;color:${BRAND.ink};">${email}</div>
        <div style="height:12px;line-height:12px;">&nbsp;</div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${BRAND.soft};font-weight:700;">Temporary password</div>
        <div style="margin-top:2px;font-size:15px;color:${BRAND.ink};font-family:'SFMono-Regular',Consolas,Menlo,monospace;">${password}</div>
      </td></tr></table>
    </td></tr>

    <!-- CTA -->
    <tr><td class="px" style="padding:18px 36px 6px 36px;font-family:Arial,Helvetica,sans-serif;">
      ${button(signInHref, "Open your dashboard →")}
      <div style="margin-top:8px;font-size:13px;color:${BRAND.soft};">Your email and password are filled in for you — just click and sign in. ${PORTAL_URL.replace(/^https?:\/\//, "")}</div>
    </td></tr>

    <!-- steps -->
    <tr><td class="px" style="padding:22px 36px 4px 36px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:17px;font-weight:800;color:${BRAND.navy};margin-bottom:14px;">Get set up in three steps</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${step("01", "Open your dashboard", "Click the button above (or paste the link into your browser). Bookmark it so it's easy to return to each week.")}
        ${step("02", "Sign in & set your password", "Use the email this was sent to. On your first visit you'll be prompted to set your own password — then you're in.")}
        ${role === "coordinator"
          ? step("03", "Open your tracking dashboards", "Head to Learner Tracking and the dashboards to see who's progressing and who needs a nudge.")
          : step("03", "Start your first module", "Begin with Module 1. Each module unlocks the next as you complete it.")}
      </table>
    </td></tr>`;

  return { subject, html: shell("Your Impact Portal account is ready — sign in and get started.", inner, { clientLogoUrl, clientName: client }) };
}

// ---- Password reset (branded, sent via Brevo instead of Supabase's default) -
export function resetEmail(opts: { name?: string; email: string; resetUrl: string }): { subject: string; html: string } {
  const { name, resetUrl } = opts;
  const greetName = name && name.trim() ? name.trim().split(" ")[0] : "there";
  const subject = `Reset your ${MAS.partner} Impact Portal password`;
  const inner = `
    ${hero("Password reset", `Reset your<br>portal password`, `Set a new password for your ${MAS.partner} Impact Portal account.`)}

    <tr><td class="px" style="padding:18px 36px 4px 36px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};font-size:15px;line-height:1.6;">
      <p style="margin:0 0 6px;">Assalamu Alaikum ${greetName},</p>
      <p style="margin:0;color:${BRAND.soft};">We received a request to reset your password. Click below to choose a new one.</p>
    </td></tr>

    <tr><td class="px" style="padding:18px 36px 6px 36px;font-family:Arial,Helvetica,sans-serif;">
      ${button(resetUrl, "Reset your password →")}
      <div style="margin-top:10px;font-size:13px;color:${BRAND.soft};">If the button doesn't work, copy and paste this link into your browser:<br><span style="color:${BRAND.blue};word-break:break-all;">${resetUrl}</span></div>
    </td></tr>

    <tr><td class="px" style="padding:14px 36px 4px 36px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:13px;color:${BRAND.soft};">Didn't request this? You can safely ignore this email — your password won't change.</div>
    </td></tr>`;
  return { subject, html: shell("Reset your Impact Portal password", inner) };
}

// ---- Welcome (once onboarding is done) ------------------------------------
export function welcomeEmail(opts: {
  name?: string;
  email: string;
  roleType?: string;
  department?: string;
  portalUrl: string;
  clientLogoUrl?: string;
  clientName?: string;
}): { subject: string; html: string } {
  const { name, roleType, department, portalUrl, clientLogoUrl, clientName } = opts;
  const greetName = name && name.trim() ? name.trim().split(" ")[0] : "there";
  const subject = `You're all set — welcome to the ${MAS.partner} Impact Portal`;
  const tag = [roleType, department].filter(Boolean).join(" · ");

  const inner = `
    ${hero("You're all set", `Welcome aboard,<br>${greetName}!`, "Your profile is saved — you only do that once. Everything for your Theory of Change journey lives in your dashboard.")}

    <tr><td class="px" style="padding:18px 36px 4px 36px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};font-size:15px;line-height:1.6;">
      <p style="margin:0 0 10px;">Assalamu Alaikum ${greetName},</p>
      ${tag ? `<p style="margin:0 0 10px;color:${BRAND.soft};">You're set up as <b style="color:${BRAND.ink};">${tag}</b>.</p>` : ""}
      <p style="margin:0;color:${BRAND.soft};">Jump back in whenever you're ready — pick up where you left off, message your group, and track your progress.</p>
    </td></tr>

    <tr><td class="px" style="padding:18px 36px 8px 36px;font-family:Arial,Helvetica,sans-serif;">
      ${button(portalUrl, "Open your dashboard →")}
    </td></tr>`;

  return { subject, html: shell("You're all set — jump back into your dashboard whenever you're ready.", inner, { clientLogoUrl, clientName }) };
}
