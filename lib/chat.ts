"use client";

// Community chat — one room per client (organization). Everything lives in
// Supabase (the `messages` table + realtime); there is no localStorage fallback
// because chat is inherently multi-user. When Supabase isn't configured the UI
// shows a "connect Supabase" notice instead.

import { getSupabaseBrowserClient } from "./supabase";

export interface ChatMessage {
  id: string;
  client: string;
  email: string;
  name: string;
  body: string;
  created_at: string;
}

export const isChatAvailable = () => !!getSupabaseBrowserClient();

// The current user's client (room key). Uses the my_client() RPC so it works
// without reading the staff-only members table directly.
export async function myClient(): Promise<string> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return "";
  const { data, error } = await sb.rpc("my_client");
  if (error) return "";
  return typeof data === "string" ? data : "";
}

export async function loadMessages(client: string, limit = 200): Promise<ChatMessage[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb || !client) return [];
  const { data } = await sb
    .from("messages")
    .select("*")
    .eq("client", client)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data as ChatMessage[] | null) ?? [];
}

export async function sendMessage(
  client: string,
  email: string,
  name: string,
  body: string,
): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return { error: "Chat needs the live database (Supabase)." };
  const text = body.trim();
  if (!text || !client) return {};
  const { error } = await sb
    .from("messages")
    .insert({ client, email: email.toLowerCase(), name, body: text });
  return error ? { error: error.message } : {};
}

// Live subscription to new messages in a room. Returns an unsubscribe fn.
export function subscribeMessages(client: string, onInsert: (m: ChatMessage) => void): () => void {
  const sb = getSupabaseBrowserClient();
  if (!sb || !client) return () => {};
  const channel = sb
    .channel(`messages:${client}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `client=eq.${client}` },
      (payload) => onInsert(payload.new as ChatMessage),
    )
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}

// ---------------- People directory (org-mates + progress) ----------------

export interface OrgPerson {
  email: string;
  name: string;
  member_role: string;
  client: string;
  role_type: string;   // their onboarding role, e.g. "Volunteer"
  department: string;  // their area of focus / team
  done_count: number;
  updated_at?: string;
}

// Everyone the signed-in user may see: their own organization (staff see all),
// with each person's completed-items count. Server-enforced via org_people().
export async function listOrgPeople(): Promise<OrgPerson[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("org_people");
  if (error) { console.error("[chat] org_people failed", error.message); return []; }
  return ((data as OrgPerson[] | null) ?? []).map((p) => ({
    ...p, role_type: p.role_type ?? "", department: p.department ?? "", done_count: p.done_count ?? 0,
  }));
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

// All DMs the user is part of (both directions), oldest first.
export async function listMyDms(me: string, limit = 500): Promise<DirectMessage[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return [];
  const e = me.toLowerCase();
  const { data, error } = await sb
    .from("dms")
    .select("*")
    .or(`from_email.eq.${e},to_email.eq.${e}`)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) { console.error("[chat] listMyDms failed", error.message); return []; }
  return (data as DirectMessage[] | null) ?? [];
}

export async function sendDm(from: string, fromName: string, to: string, body: string): Promise<{ error?: string }> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return { error: "Messaging needs the live database (Supabase)." };
  const text = body.trim();
  if (!text) return {};
  const { error } = await sb.from("dms").insert({
    from_email: from.toLowerCase(), to_email: to.toLowerCase(), from_name: fromName, body: text,
  });
  if (error) console.error("[chat] sendDm failed", error.message);
  return error ? { error: error.message } : {};
}

export async function markDmsRead(me: string, from: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  await sb.from("dms").update({ read: true })
    .eq("to_email", me.toLowerCase()).eq("from_email", from.toLowerCase()).eq("read", false);
}

// Live incoming DMs for me. (Own sends are appended locally by the caller.)
export function subscribeDms(me: string, onInsert: (m: DirectMessage) => void): () => void {
  const sb = getSupabaseBrowserClient();
  if (!sb) return () => {};
  const channel = sb
    .channel(`dms:${me.toLowerCase()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dms", filter: `to_email=eq.${me.toLowerCase()}` },
      (payload) => onInsert(payload.new as DirectMessage),
    )
    .subscribe();
  return () => { void sb.removeChannel(channel); };
}
