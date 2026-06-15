"use client";

// Lifetime data layer. With Supabase env vars set, everything persists to the
// database (forever, across devices). Without them, it falls back to
// localStorage so the app still works end-to-end in demo mode.

import { getSupabaseBrowserClient } from "./supabase";

export interface MemberProfile {
  email: string;
  name: string;
  role_type: string;
  department: string;
  commitment: string;
  tenure: string;
  skills: string[];
  onboarded: boolean;
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
