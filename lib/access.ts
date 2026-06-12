import type { Role } from "./types";

// ---- Access control -------------------------------------------------------
// The portal is RESTRICTED. Only people listed here (or on an admin domain)
// can sign in. Everyone else is denied with a clear message.
//
// To add people: drop their email in ADMIN_EMAILS or LEARNER_EMAILS below.
// (With Supabase you'd manage this in the database; this list is the single
// source of truth for the demo / allowlist.)

export const ADMIN_DOMAINS = ["amalandcompany.com"];

export const ADMIN_EMAILS = [
  "hmaki@amalandcompany.com",
];

export const LEARNER_EMAILS = [
  "grace@hopecollective.org",
  "samuel@brightfutures.org",
  "fatima@crescentaid.org",
  "learner@example.org",
];

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

// Accounts surfaced on the login screen in demo mode so stakeholders can try
// both experiences.
export const DEMO_ACCOUNTS = [
  { label: "Administrator", email: "hmaki@amalandcompany.com" },
  { label: "Learner", email: "learner@example.org" },
];
