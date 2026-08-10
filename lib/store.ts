"use client";

// Lifetime data layer. With the database configured, everything persists to
// PostgreSQL (forever, across devices). Without it, it falls back to
// localStorage so the app still works end-to-end in demo mode.

import { apiFetch } from "./api-fetch";
import type { TocDoc, TocSet } from "./toc-templates";
import { toTocSet } from "./toc-templates";
import { normalizeMeta, type LearnerMeta } from "./content";

export interface MemberProfile {
  email: string;
  name: string;
  role_type: string;
  department: string;
  commitment: string;
  tenure: string;
  skills: string[];
  onboarded: boolean;
  avatar_url?: string; // profile picture (Supabase Storage URL or data URL)
  updated_at?: string;
}

export interface AppNotification {
  id: string;
  email: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

const PKEY = (e: string) => `toc-profile:${e.toLowerCase()}`;
const NKEY = (e: string) => `toc-notifications:${e.toLowerCase()}`;
const AVKEY = (e: string) => `toc-avatar:${e.toLowerCase()}`;

// ---------------- Profiles ----------------

export async function getProfile(email: string): Promise<MemberProfile | null> {
  try {
    const res = await apiFetch(`/api/profile?email=${encodeURIComponent(email.toLowerCase())}`);
    if (res.ok) {
      const p = await res.json() as MemberProfile | null;
      if (p && !p.avatar_url) {
        try { const a = localStorage.getItem(AVKEY(email)); if (a) p.avatar_url = a; } catch {}
      }
      return p;
    }
    return null; // server reachable, response not OK — don't use cache
  } catch {}
  try {
    const raw = localStorage.getItem(PKEY(email));
    return raw ? (JSON.parse(raw) as MemberProfile) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: MemberProfile): Promise<{ ok: boolean; error?: string }> {
  const row = { ...profile, email: profile.email.toLowerCase(), updated_at: new Date().toISOString() };
  try {
    if (row.avatar_url) localStorage.setItem(AVKEY(row.email), row.avatar_url);
    const res = await apiFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      console.error("[store] saveProfile failed", err.error ?? res.statusText);
      return { ok: false, error: err.error ?? res.statusText };
    }
    return { ok: true };
  } catch {
    try { localStorage.setItem(PKEY(profile.email), JSON.stringify(row)); } catch {}
    return { ok: true };
  }
}

// ---------------- Notifications ----------------

export async function listNotifications(email: string): Promise<AppNotification[]> {
  try {
    const res = await apiFetch(`/api/notifications?email=${encodeURIComponent(email.toLowerCase())}`);
    if (res.ok) return (await res.json() as AppNotification[]) ?? [];
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  try {
    const raw = localStorage.getItem(NKEY(email));
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

export async function addNotification(email: string, title: string, body = ""): Promise<void> {
  const note: AppNotification = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    email: email.toLowerCase(),
    title,
    body,
    read: false,
    created_at: new Date().toISOString(),
  };
  try {
    await apiFetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: note.email, title, body }),
    });
    return;
  } catch {}
  try {
    const list = await listNotifications(email);
    localStorage.setItem(NKEY(email), JSON.stringify([note, ...list].slice(0, 50)));
  } catch {}
}

export async function markAllRead(email: string): Promise<void> {
  try {
    await apiFetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase() }),
    });
    return;
  } catch {}
  try {
    const list = await listNotifications(email);
    localStorage.setItem(NKEY(email), JSON.stringify(list.map((n) => ({ ...n, read: true }))));
  } catch {}
}

// ---------------- Members / invitations ----------------
// The access allowlist. Persisted so invited people survive sign-out & reload
// (Supabase when configured, otherwise localStorage on this browser).

// "coordinator" is a read-only oversight access level (Program Coordinator):
// they track everyone's progress across the portal but cannot edit content or
// manage the member allowlist. Everyone else is a learner or a full admin.
export type MemberRole = "admin" | "participant" | "coordinator";

export interface Member {
  email: string;
  name: string;       // display name, joined from users table
  role: MemberRole;
  status: "Active" | "Invited";
  temp_password: string; // admin-set invite password, cleared after first sign-in
  client?: string;       // which client (organization) they belong to
  created_at?: string;
  last_sign_in_at?: string; // joined from users table — the real last-seen signal
}

const MKEY = "toc-members";

export async function listMembers(): Promise<Member[]> {
  try {
    const res = await apiFetch("/api/members");
    if (res.ok) return (await res.json() as Member[]) ?? [];
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  try {
    const raw = localStorage.getItem(MKEY);
    return raw ? (JSON.parse(raw) as Member[]) : [];
  } catch {
    return [];
  }
}

export async function saveMember(member: Member): Promise<void> {
  const row = { ...member, email: member.email.toLowerCase() };
  try {
    await apiFetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    return;
  } catch {}
  try {
    const rest = (await listMembers()).filter((m) => m.email !== row.email);
    localStorage.setItem(MKEY, JSON.stringify([{ ...row, created_at: new Date().toISOString() }, ...rest]));
  } catch {}
}

// Pre-auth allowlist check. With Supabase it calls the `check_access` RPC —
// the members table itself is staff-only (it holds temp passwords), so the
// login screen learns only allowed/role and nothing else. In demo mode it
// falls back to the locally stored members list.
export interface MemberAccess { allowed: boolean; role: MemberRole }

// Normalise a stored role string to a known MemberRole (defaults to learner).
function asMemberRole(r?: string | null): MemberRole {
  return r === "admin" ? "admin" : r === "coordinator" ? "coordinator" : "participant";
}

export async function checkMemberAccess(email: string): Promise<MemberAccess | null> {
  const e = email.trim().toLowerCase();
  try {
    const res = await apiFetch(`/api/members/check?email=${encodeURIComponent(e)}`);
    if (res.ok) {
      const row = await res.json() as { allowed?: boolean; member_role?: string } | null;
      if (row?.allowed) return { allowed: true, role: asMemberRole(row.member_role) };
      return null;
    }
    return null; // server reachable, response not OK — don't use cache
  } catch {}
  const m = (await listMembers()).find((x) => x.email.trim().toLowerCase() === e);
  return m ? { allowed: true, role: asMemberRole(m.role) } : null;
}

export async function removeMember(email: string): Promise<void> {
  const e = email.toLowerCase();
  try {
    await apiFetch(`/api/members?email=${encodeURIComponent(e)}`, { method: "DELETE" });
    return;
  } catch {}
  try {
    const rest = (await listMembers()).filter((m) => m.email !== e);
    localStorage.setItem(MKEY, JSON.stringify(rest));
  } catch {}
}

// ---------------- Theory of Change (per-learner, saved canvas) ----------------

const TOC_KEY = (e: string) => `toc-doc:${e.toLowerCase()}`;

export async function loadToc(email: string): Promise<TocDoc | null> {
  try {
    const res = await apiFetch(`/api/toc?email=${encodeURIComponent(email.toLowerCase())}`);
    if (res.ok) {
      const data = await res.json();
      return (data?.data as TocDoc) ?? null;
    }
    return null; // server reachable, response not OK — don't use cache
  } catch {}
  try {
    const raw = localStorage.getItem(TOC_KEY(email));
    return raw ? (JSON.parse(raw) as TocDoc) : null;
  } catch {
    return null;
  }
}

export async function saveToc(email: string, doc: TocDoc): Promise<void> {
  const data = { ...doc, updatedAt: new Date().toISOString() };
  try {
    await apiFetch("/api/toc", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), data, updated_at: data.updatedAt }),
    });
    return;
  } catch {}
  try {
    localStorage.setItem(TOC_KEY(email), JSON.stringify(data));
  } catch {}
}

// Multi-program set (the builder uses these). Reads tolerate the old single-doc
// shape via toTocSet, so previously saved work migrates automatically.
export async function loadTocSet(email: string): Promise<TocSet> {
  return toTocSet(await loadToc(email));
}

export async function saveTocSet(email: string, set: TocSet): Promise<void> {
  await saveToc(email, set as unknown as TocDoc);
}

// ---------------- Admin / staff: read EVERYONE's data ----------------
// These return the full set for staff (admins/facilitators/coordinators) when
// Supabase is configured. In demo (localStorage) mode cross-learner data can't
// exist, so they return only what this browser holds — callers show a notice.

export interface ProgressRow { email: string; done: string[]; meta: LearnerMeta; updated_at?: string }
export interface TocRow { email: string; data: TocDoc; updated_at?: string }

export async function listProfiles(): Promise<MemberProfile[]> {
  try {
    const res = await apiFetch("/api/profiles");
    if (res.ok) return (await res.json() as MemberProfile[]) ?? [];
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  return [];
}

export async function listLearnerProgress(): Promise<ProgressRow[]> {
  try {
    const res = await apiFetch("/api/progress/all");
    if (res.ok) {
      return ((await res.json() as ProgressRow[]) ?? []).map((r) => ({
        ...r,
        done: r.done ?? [],
        meta: normalizeMeta(r.meta),
      }));
    }
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  return [];
}

export async function listTocs(): Promise<TocRow[]> {
  try {
    const res = await apiFetch("/api/toc/all");
    if (res.ok) return (await res.json() as TocRow[]) ?? [];
    return []; // server reachable, response not OK — don't use cache
  } catch {}
  return [];
}

// ---------------- Email ----------------

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts?: { replyTo?: string; replyToName?: string; fromName?: string },
): Promise<{ ok: boolean; demo?: boolean; error?: string }> {
  try {
    const res = await apiFetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, replyTo: opts?.replyTo, replyToName: opts?.replyToName, fromName: opts?.fromName }),
    });
    return (await res.json()) as { ok: boolean; demo?: boolean; error?: string };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
