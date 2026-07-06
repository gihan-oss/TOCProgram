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
