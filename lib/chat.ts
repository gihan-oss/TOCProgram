"use client";

// Community chat — one room per client (organization). Messages are stored in
// PostgreSQL and served through our API. There is no localStorage fallback
// because chat is inherently multi-user. When the database isn't available the
// UI shows a notice instead.

// Chat is always available — the API handles the database being offline by
// returning empty arrays, and the UI shows an appropriate notice.

import { apiFetch } from "./api-fetch";

export const isChatAvailable = () => true;

export interface ChatMessage {
  id: string;
  client: string;
  email: string;
  name: string;
  body: string;
  created_at: string;
}

// The current user's client (room key).
export async function myClient(): Promise<string> {
  try {
    const res = await apiFetch("/api/chat/my-client");
    if (res.ok) {
      const data = await res.json();
      return typeof data.client === "string" ? data.client : "";
    }
  } catch {}
  return "";
}

export async function loadMessages(client: string, limit = 200): Promise<ChatMessage[]> {
  if (!client) return [];
  try {
    const res = await apiFetch(`/api/chat?client=${encodeURIComponent(client)}&limit=${limit}`);
    if (res.ok) return (await res.json() as ChatMessage[]) ?? [];
  } catch {}
  return [];
}

export async function sendMessage(
  client: string,
  email: string,
  name: string,
  body: string,
): Promise<{ error?: string }> {
  const text = body.trim();
  if (!text || !client) return {};
  try {
    const res = await apiFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client, email: email.toLowerCase(), name, body: text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Send failed" }));
      return { error: err.error ?? "Send failed" };
    }
    return {};
  } catch {
    return { error: "Chat needs the live database." };
  }
}

// ---- Poll-based "realtime" (replaces Supabase Realtime subscriptions) -----
// Polls GET /api/chat?client=X&since=timestamp every 3s for new messages.

let pollIntervals = new Map<string, ReturnType<typeof setInterval>>();

export function subscribeMessages(client: string, onInsert: (m: ChatMessage) => void): () => void {
  if (!client) return () => {};
  const key = `msg:${client}`;
  // Clear any existing interval for this client (React StrictMode / HMR).
  const prev = pollIntervals.get(key);
  if (prev) clearInterval(prev);
  // Track the latest created_at we've seen.
  let latest = new Date().toISOString();
  // Do an initial load to get the latest timestamp.
  loadMessages(client, 1).then((msgs) => {
    if (msgs.length > 0) latest = msgs[msgs.length - 1].created_at;
  });
  const id = setInterval(async () => {
    try {
      const res = await apiFetch(`/api/chat?client=${encodeURIComponent(client)}&since=${encodeURIComponent(latest)}`);
      if (res.ok) {
        const msgs = (await res.json() as ChatMessage[]) ?? [];
        for (const m of msgs) {
          if (m.created_at > latest) latest = m.created_at;
          onInsert(m);
        }
      }
    } catch {}
  }, 3000);
  pollIntervals.set(key, id);
  return () => {
    clearInterval(id);
    pollIntervals.delete(key);
  };
}

// ---------------- People directory (org-mates + progress) ----------------

export interface OrgPerson {
  email: string;
  name: string;
  member_role: string;
  client: string;
  role_type: string;
  department: string;
  avatar_url: string;
  done_count: number;
  updated_at?: string;
}

export async function listOrgPeople(): Promise<OrgPerson[]> {
  try {
    const res = await apiFetch("/api/chat/people");
    if (res.ok) {
      return ((await res.json() as OrgPerson[]) ?? []).map((p) => ({
        ...p, role_type: p.role_type ?? "", department: p.department ?? "", avatar_url: p.avatar_url ?? "", done_count: p.done_count ?? 0,
      }));
    }
  } catch {}
  return [];
}

// ---------------- Direct messages (1:1, private) ----------------

export interface DirectMessage {
  id: string;
  from_email: string;
  to_email: string;
  from_name: string;
  body: string;
  read: boolean;
  created_at: string;
}

export async function listMyDms(me: string, limit = 500): Promise<DirectMessage[]> {
  try {
    const res = await apiFetch(`/api/chat/dms?me=${encodeURIComponent(me.toLowerCase())}&limit=${limit}`);
    if (res.ok) return (await res.json() as DirectMessage[]) ?? [];
  } catch {}
  return [];
}

export async function sendDm(from: string, fromName: string, to: string, body: string): Promise<{ error?: string }> {
  const text = body.trim();
  if (!text) return {};
  try {
    const res = await apiFetch("/api/chat/dms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_email: from.toLowerCase(), to_email: to.toLowerCase(), from_name: fromName, body: text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Send failed" }));
      return { error: err.error ?? "Send failed" };
    }
    return {};
  } catch {
    return { error: "Messaging needs the live database." };
  }
}

export async function markDmsRead(me: string, from: string): Promise<void> {
  try {
    await apiFetch("/api/chat/dms/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ me: me.toLowerCase(), from: from.toLowerCase() }),
    });
  } catch {}
}

// Poll-based incoming DMs for me.
export function subscribeDms(me: string, onInsert: (m: DirectMessage) => void): () => void {
  if (!me) return () => {};
  const key = `dms:${me.toLowerCase()}`;
  // Clear any existing interval for this client (React StrictMode / HMR).
  const prev = pollIntervals.get(key);
  if (prev) clearInterval(prev);
  let latest = new Date().toISOString();
  listMyDms(me, 1).then((msgs) => {
    if (msgs.length > 0) latest = msgs[msgs.length - 1].created_at;
  });
  const id = setInterval(async () => {
    try {
      const res = await apiFetch(`/api/chat/dms?me=${encodeURIComponent(me.toLowerCase())}&since=${encodeURIComponent(latest)}`);
      if (res.ok) {
        const msgs = (await res.json() as DirectMessage[]) ?? [];
        for (const m of msgs) {
          if (m.created_at > latest) latest = m.created_at;
          onInsert(m);
        }
      }
    } catch {}
  }, 3000);
  pollIntervals.set(key, id);
  return () => {
    clearInterval(id);
    pollIntervals.delete(key);
  };
}
