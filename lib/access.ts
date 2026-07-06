import type { Role } from "./types";

// ---- Access control -------------------------------------------------------
// The portal is RESTRICTED and invite-only. Who may sign in:
//   1. anyone on an admin domain below (staff), or
//   2. anyone an admin has invited (the members table / People & Access).
// There are NO hardcoded sample accounts — every person you see in the portal
// is a real user (invited by an admin, or self-signed-up with an invited
// email / Google). Everyone else is denied with a clear message.

export const ADMIN_DOMAINS = ["amalandcompany.com"];

// Extra admin emails outside the admin domain(s). Normally empty — anyone on an
// ADMIN_DOMAINS address is already an admin, and real people are added by invite.
export const ADMIN_EMAILS: string[] = [];

// Real learners are added by an admin (or sign up with an invited email). No
// placeholder accounts — keep this empty so only real users appear.
export const LEARNER_EMAILS: string[] = [];

export interface Access {
  allowed: boolean;
  role: Role; // resolved role for the portal
  reason?: string;
}

export function resolveAccess(email: string): Access {
  const e = email.trim().toLowerCase();
  const domain = e.split("@")[1] ?? "";

  if (ADMIN_EMAILS.includes(e) || ADMIN_DOMAINS.includes(domain)) {
    return { allowed: true, role: "admin" };
  }
  if (LEARNER_EMAILS.includes(e)) {
    return { allowed: true, role: "participant" };
  }
  return {
    allowed: false,
    role: "participant",
    reason: "Access is restricted. Your email isn't on the approved list — please contact your administrator for an invitation.",
  };
}
