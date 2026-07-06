// Cute, email-client-safe HTML templates for transactional mail.
// Inline styles + table layout so it renders in Gmail, Outlook, Apple Mail, etc.

import { MAS } from "./mas";

const BRAND = {
  primary: "#5b21b6", // purple
  accent: "#9333ea", // light purple
  ink: "#1f2937",
  soft: "#6b7280",
  bg: "#f5f3fb",
  card: "#ffffff",
  chip: "#f3ebff",
  chipInk: "#6d28d9",
};

// Friendly, memorable temporary password: Word-1234 (easy to read aloud).
export function genTempPassword(): string {
  const words = [
    "Cedar", "Harbor", "Lantern", "Compass", "Willow", "Summit",
    "Meadow", "Beacon", "Cobalt", "Saffron", "Juniper", "Marigold",
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

function numberedStep(n: number, label: string, valueHtml: string): string {
  return `
    <tr>
      <td valign="top" style="padding:10px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="34" valign="top">
            <div style="width:26px;height:26px;border-radius:50%;background:${BRAND.primary};color:#ffffff;font-weight:700;font-size:13px;line-height:26px;text-align:center;font-family:Arial,Helvetica,sans-serif;">${n}</div>
          </td>
          <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:${BRAND.soft};font-weight:700;">${label}</div>
            <div style="margin-top:3px;font-size:16px;color:${BRAND.ink};">${valueHtml}</div>
          </td>
        </tr></table>
      </td>
    </tr>`;
}

export function inviteEmail(opts: {
  name?: string;
  email: string;
  password: string;
  role: "admin" | "participant";
  loginUrl: string;
  client?: string;
}): { subject: string; html: string } {
  const { name, email, password, role, loginUrl, client } = opts;
  const roleLabel = role === "admin" ? "Administrator" : "Learner";
  const greetName = name && name.trim() ? name.trim().split(" ")[0] : "there";
  const subject = `🌱 You're invited to the ${MAS.partner} Impact Portal`;

  const chip = (text: string, mono = false) =>
    `<span style="display:inline-block;background:${BRAND.chip};color:${BRAND.chipInk};padding:5px 10px;border-radius:8px;font-weight:700;${mono ? "font-family:'SFMono-Regular',Consolas,Menlo,monospace;letter-spacing:.02em;" : ""}">${text}</span>`;

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">Your login details are inside — sign in and start building your theory of change.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.card};border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(31,41,55,.08);">

        <!-- header -->
        <tr><td style="background:${BRAND.primary};background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:34px 36px;">
          <div style="font-size:34px;line-height:1;">🌱✨</div>
          <div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:24px;font-weight:800;">You're in, ${greetName}!</div>
          <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;opacity:.9;font-size:14px;">Welcome to the ${MAS.partner} Impact Portal — invited as <b>${roleLabel}</b>${client ? ` for <b>${client}</b>` : ""}.</div>
        </td></tr>

        <!-- body -->
        <tr><td style="padding:28px 36px 8px 36px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};font-size:15px;line-height:1.6;">
          <p style="margin:0 0 6px;">Salaam ${greetName} 👋</p>
          <p style="margin:0;color:${BRAND.soft};">Here are your login details, in order — it takes about two minutes to get started.</p>
        </td></tr>

        <!-- credentials card -->
        <tr><td style="padding:14px 36px 8px 36px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf9ff;border:1px solid #ece9fb;border-radius:14px;padding:8px 18px;">
            ${numberedStep(1, "Your email", chip(email))}
            ${numberedStep(2, "Temporary password", chip(password, true))}
            ${numberedStep(3, "Open the portal & sign in", `<a href="${loginUrl}" style="display:inline-block;margin-top:4px;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:10px;">Sign in →</a>`)}
          </table>
        </td></tr>

        <!-- note -->
        <tr><td style="padding:10px 36px 4px 36px;font-family:Arial,Helvetica,sans-serif;">
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;color:#9a3412;font-size:13px;line-height:1.5;">
            🔒 Keep this private — it's just for you. You can change your password after your first sign-in.
          </div>
        </td></tr>

        <!-- north star -->
        <tr><td style="padding:18px 36px 6px 36px;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:13px;color:${BRAND.soft};font-style:italic;">"${MAS.northStar}"</div>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:18px 36px 30px 36px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #f0eefb;">
          <div style="font-size:12px;color:${BRAND.soft};">${MAS.partner} · ${MAS.orgFull}</div>
        </td></tr>

      </table>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b6b3c7;margin-top:14px;">If you weren't expecting this invitation, you can safely ignore this email.</div>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// Sent once, when a person finishes onboarding — however they joined (admin
// invite, their own email sign-up, or Google). No password (they're already
// in); just a warm confirmation with their role/department and a way back in.
export function welcomeEmail(opts: {
  name?: string;
  email: string;
  roleType?: string;
  department?: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const { name, roleType, department, portalUrl } = opts;
  const greetName = name && name.trim() ? name.trim().split(" ")[0] : "there";
  const subject = `🎉 Welcome to the ${MAS.partner} Impact Portal`;

  const chip = (text: string) =>
    `<span style="display:inline-block;background:${BRAND.chip};color:${BRAND.chipInk};padding:5px 10px;border-radius:8px;font-weight:700;margin:0 4px 4px 0;">${text}</span>`;

  const tags = [roleType ? chip(roleType) : "", department ? chip(department) : ""].join("");

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">You're all set — jump back in whenever you're ready.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.card};border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(31,41,55,.08);">

        <!-- header -->
        <tr><td style="background:${BRAND.primary};background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:34px 36px;">
          <div style="font-size:34px;line-height:1;">🎉</div>
          <div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:24px;font-weight:800;">You're all set, ${greetName}!</div>
          <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;opacity:.9;font-size:14px;">Your account is ready on the ${MAS.partner} Impact Portal.</div>
        </td></tr>

        <!-- body -->
        <tr><td style="padding:28px 36px 6px 36px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};font-size:15px;line-height:1.6;">
          <p style="margin:0 0 10px;">Salaam ${greetName} 👋</p>
          <p style="margin:0 0 14px;color:${BRAND.soft};">Thanks for setting up your profile — you only do this once, and it's saved. Here's how you're set up:</p>
          ${tags ? `<div style="margin:0 0 6px;">${tags}</div>` : ""}
        </td></tr>

        <!-- cta -->
        <tr><td style="padding:14px 36px 8px 36px;font-family:Arial,Helvetica,sans-serif;">
          <a href="${portalUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;">Open the portal →</a>
        </td></tr>

        <!-- north star -->
        <tr><td style="padding:18px 36px 6px 36px;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:13px;color:${BRAND.soft};font-style:italic;">"${MAS.northStar}"</div>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:18px 36px 30px 36px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #f0eefb;">
          <div style="font-size:12px;color:${BRAND.soft};">${MAS.partner} · ${MAS.orgFull}</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
