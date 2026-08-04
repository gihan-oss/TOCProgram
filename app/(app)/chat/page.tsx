"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { CLIENT } from "@/lib/mas";
import { loadClients, primaryClient } from "@/lib/clients";
import {
  isChatAvailable, myClient, loadMessages, sendMessage, subscribeMessages, type ChatMessage,
} from "@/lib/chat";

export default function ChatPage() {
  const { user } = useAuth();
  const isStaff = !!user && user.role !== "participant";

  const [room, setRoom] = useState<string>("");
  const [rooms, setRooms] = useState<string[]>([]); // staff room picker
  const [resolving, setResolving] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = isChatAvailable();
  const endRef = useRef<HTMLDivElement | null>(null);

  // ---- resolve which room to open ----
  useEffect(() => {
    if (!user || !available) { setResolving(false); return; }
    let active = true;
    (async () => {
      if (isStaff) {
        // Staff pick a client room; default to the primary (Active) client.
        const cs = await loadClients();
        const names = cs.map((c) => c.name);
        const def = primaryClient(cs)?.name ?? CLIENT.name;
        if (!active) return;
        setRooms(names.length ? names : [CLIENT.name]);
        setRoom((r) => r || def);
      } else {
        const c = await myClient();
        if (!active) return;
        setRoom(c);
      }
      setResolving(false);
    })();
    return () => { active = false; };
  }, [user?.email, isStaff, available]);

  // ---- load history + subscribe to live inserts for the active room ----
  useEffect(() => {
    if (!room || !available) return;
    let active = true;
    setLoading(true);
    setMessages([]);
    loadMessages(room).then((initial) => {
      if (active) { setMessages(initial); setLoading(false); }
    });
    const unsub = subscribeMessages(room, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    return () => { active = false; unsub(); };
  }, [room, available]);

  // keep the view pinned to the newest message
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const myEmail = user?.email.toLowerCase() ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || !room) return;
    setSending(true);
    setError(null);
    const res = await sendMessage(room, user.email, user.name, text);
    setSending(false);
    if (res.error) { setError(res.error); return; }
    setText("");
  }

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  // ---- states where we can't render a room ----
  if (!available) {
    return (
      <div>
        <SectionTitle sub="Talk with the others in your program — everyone from your organization shares this room.">Community Chat</SectionTitle>
        <Card className="p-6 text-center">
          <Icons.MessagesSquare className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-2 font-semibold">Chat needs the live database</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Community chat needs the live database. Once your administrator sets it up, this room goes live for everyone in your organization.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub="Everyone from your organization shares this room. Be kind — messages are visible to your whole group.">
          Community Chat
        </SectionTitle>
        {isStaff && rooms.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <Icons.Building2 className="h-4 w-4 text-muted-foreground" />
            <select value={room} onChange={(e) => setRoom(e.target.value)} className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none">
              {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        )}
      </div>

      {resolving ? (
        <div className="flex flex-1 items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !room ? (
        <EmptyHint>You aren&apos;t assigned to a client organization yet, so there&apos;s no room to join. Ask your administrator to add you to a client.</EmptyHint>
      ) : (
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* room header */}
          <div className="flex items-center gap-2 border-b bg-secondary/40 px-4 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent"><Icons.Users className="h-4 w-4" /></span>
            <p className="text-sm font-semibold">{room}</p>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" /> Live
            </span>
          </div>

          {/* messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex h-full items-center justify-center"><Icons.Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <Icons.MessagesSquare className="h-8 w-8" />
                <p className="mt-2 text-sm">No messages yet — say salaam and start the conversation.</p>
              </div>
            ) : (
              grouped.map(([day, msgs]) => (
                <div key={day}>
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{day}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  {msgs.map((m) => {
                    const mine = m.email.toLowerCase() === myEmail;
                    return (
                      <div key={m.id} className={`mb-2.5 flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          {!mine && <p className="mb-0.5 text-xs font-semibold text-accent">{m.name || m.email.split("@")[0]}</p>}
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{timeOf(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* composer */}
          <form onSubmit={submit} className="border-t p-3">
            {error && <p className="mb-2 rounded-lg bg-[hsl(var(--danger)/0.12)] px-3 py-1.5 text-xs text-[hsl(var(--danger))]">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
                placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
                rows={1}
                className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" size="md" disabled={sending || !text.trim()}>
                {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

// ---- helpers ----
function timeOf(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function dayOf(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
function groupByDay(messages: ChatMessage[]): [string, ChatMessage[]][] {
  const out: [string, ChatMessage[]][] = [];
  for (const m of messages) {
    const day = dayOf(m.created_at);
    const last = out[out.length - 1];
    if (last && last[0] === day) last[1].push(m);
    else out.push([day, [m]]);
  }
  return out;
}
