"use client";

// Lifetime data layer. With Supabase env vars set, everything persists to the
// database (forever, across devices). Without them, it falls back to
// localStorage so the app still works end-to-end in demo mode.

import { getSupabaseBrowserClient } from "./supabase";
import type { TocDoc, TocSet } from "./toc-templates";
import { toTocSet } from "./toc-templates";
import type { LearnerMeta } from "./content";

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

// ---------------- Profiles ----------------

export async function getProfile(email: string): Promise<MemberProfile | null> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
    return (data as MemberProfile | null) ?? null;
  }
  try {
    const raw = localStorage.getItem(PKEY(email));
    return raw ? (JSON.parse(raw) as MemberProfile) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: MemberProfile): Promise<void> {
  const row = { ...profile, email: profile.email.toLowerCase(), updated_at: new Date().toISOString() };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    await sb.from("profiles").upsert(row, { onConflict: "email" });
    return;
  }
  try {
    localStorage.setItem(PKEY(profile.email), JSON.stringify(row));
  } catch {}
}

// ---------------- Notifications ----------------

export async function listNotifications(email: string): Promise<AppNotification[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb
      .from("notifications")
      .select("*")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as AppNotification[] | null) ?? [];
  }
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
  const sb = getSupabaseBrowserClient();
  if (sb) {
    await sb.from("notifications").insert({ email: note.email, title, body });
    return;
  }
  try {
    const list = await listNotifications(email);
    localStorage.setItem(NKEY(email), JSON.stringify([note, ...list].slice(0, 50)));
  } catch {}
}

export async function markAllRead(email: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    await sb.from("notifications").update({ read: true }).eq("email", email.toLowerCase()).eq("read", false);
    return;
  }
  try {
    const list = await listNotifications(email);
    localStorage.setItem(NKEY(email), JSON.stringify(list.map((n) => ({ ...n, read: true }))));
  } catch {}
}

// ---------------- Members / invitations ----------------
// The access allowlist. Persisted so invited people survive sign-out & reload
// (Supabase when configured, otherwise localStorage on this browser).

export interface Member {
  email: string;
  name: string;
  role: "admin" | "participant";
  status: "Active" | "Invited";
  temp_password: string;
  client?: string; // which client (organization) they belong to
  created_at?: string;
}

const MKEY = "toc-members";

export async function listMembers(): Promise<Member[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("members").select("*").order("created_at", { ascending: false });
    return (data as Member[] | null) ?? [];
  }
  try {
    const raw = localStorage.getItem(MKEY);
    return raw ? (JSON.parse(raw) as Member[]) : [];
  } catch {
    return [];
  }
}

export async function saveMember(member: Member): Promise<void> {
  const row = { ...member, email: member.email.toLowerCase() };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    await sb.from("members").upsert(row, { onConflict: "email" });
    return;
  }
  try {
    const rest = (await listMembers()).filter((m) => m.email !== row.email);
    localStorage.setItem(MKEY, JSON.stringify([{ ...row, created_at: new Date().toISOString() }, ...rest]));
  } catch {}
}

// Pre-auth allowlist check. With Supabase it calls the `check_access` RPC —
// the members table itself is staff-only (it holds temp passwords), so the
// login screen learns only allowed/role and nothing else. In demo mode it
// falls back to the locally stored members list.
export interface MemberAccess { allowed: boolean; role: "admin" | "participant" }

export async function checkMemberAccess(email: string): Promise<MemberAccess | null> {
  const e = email.trim().toLowerCase();
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data, error } = await sb.rpc("check_access", { p_email: e });
    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean; member_role?: string } | null;
      if (row?.allowed) return { allowed: true, role: row.member_role === "admin" ? "admin" : "participant" };
      return null;
    }
    // RPC missing → schema.sql hasn't been re-run yet; fall through to the
    // direct read below, which the old open policies still allow.
  }
  const m = (await listMembers()).find((x) => x.email.trim().toLowerCase() === e);
  return m ? { allowed: true, role: m.role === "admin" ? "admin" : "participant" } : null;
}

export async function removeMember(email: string): Promise<void> {
  const e = email.toLowerCase();
  const sb = getSupabaseBrowserClient();
  if (sb) {
    await sb.from("members").delete().eq("email", e);
    return;
  }
  try {
    const rest = (await listMembers()).filter((m) => m.email !== e);
    localStorage.setItem(MKEY, JSON.stringify(rest));
  } catch {}
}

// ---------------- Theory of Change (per-learner, saved canvas) ----------------

const TOC_KEY = (e: string) => `toc-doc:${e.toLowerCase()}`;

export async function loadToc(email: string): Promise<TocDoc | null> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("toc").select("data").eq("email", email.toLowerCase()).maybeSingle();
    return (data?.data as TocDoc) ?? null;
  }
  try {
    const raw = localStorage.getItem(TOC_KEY(email));
    return raw ? (JSON.parse(raw) as TocDoc) : null;
  } catch {
    return null;
  }
}

export async function saveToc(email: string, doc: TocDoc): Promise<void> {
  const data = { ...doc, updatedAt: new Date().toISOString() };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    await sb.from("toc").upsert({ email: email.toLowerCase(), data, updated_at: data.updatedAt }, { onConflict: "email" });
    return;
  }
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
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("profiles").select("*");
    return (data as MemberProfile[] | null) ?? [];
  }
  return [];
}

export async function listLearnerProgress(): Promise<ProgressRow[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("course_progress").select("email, done, meta, updated_at");
    return ((data as ProgressRow[] | null) ?? []).map((r) => ({
      ...r,
      done: r.done ?? [],
      meta: (r.meta as LearnerMeta) ?? { scores: {}, worksheets: {} },
    }));
  }
  return [];
}

export async function listTocs(): Promise<TocRow[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    const { data } = await sb.from("toc").select("email, data, updated_at");
    return (data as TocRow[] | null) ?? [];
  }
  return [];
}

export const isSupabaseConfigured = () => !!getSupabaseBrowserClient();

// ---------------- Email ----------------

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; demo?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
    return (await res.json()) as { ok: boolean; demo?: boolean; error?: string };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
