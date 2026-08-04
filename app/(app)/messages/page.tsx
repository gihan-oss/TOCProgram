"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";
import { Card, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import {
  isChatAvailable, listMyDms, sendDm, markDmsRead, subscribeDms, listOrgPeople,
  type DirectMessage, type OrgPerson,
} from "@/lib/chat";

// Private 1:1 messages. Left: conversations (one per person). Right: the open
// thread with a composer. Only the two people on a message can ever read it
// (enforced by row-level security), and new messages arrive live.
export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const { user } = useAuth();
  const params = useSearchParams();
  const available = isChatAvailable();
  const me = user?.email.toLowerCase() ?? "";
  const myName = user?.name ?? "";

  const [dms, setDms] = useState<DirectMessage[]>([]);
  const [people, setPeople] = useState<OrgPerson[]>([]);
  const [openWith, setOpenWith] = useState<string>((params.get("with") ?? "").toLowerCase());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  // initial load + live incoming
  useEffect(() => {
    if (!me || !available) { setLoading(false); return; }
    let active = true;
    (async () => {
      const [mine, folks] = await Promise.all([listMyDms(me), listOrgPeople()]);
      if (!active) return;
      setDms(mine);
      setPeople(folks);
      setLoading(false);
    })();
    const unsub = subscribeDms(me, (m) => {
      setDms((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    return () => { active = false; unsub(); };
  }, [me, available]);

  // group into conversations (partner email -> messages)
  const threads = useMemo(() => {
    const map = new Map<string, DirectMessage[]>();
    for (const m of dms) {
      const partner = m.from_email.toLowerCase() === me ? m.to_email.toLowerCase() : m.from_email.toLowerCase();
      const list = map.get(partner) ?? [];
      list.push(m);
      map.set(partner, list);
    }
    return map;
  }, [dms, me]);

  const nameOf = (email: string) => {
    const p = people.find((x) => x.email.toLowerCase() === email);
    if (p?.name) return p.name;
    const fromDm = dms.find((m) => m.from_email.toLowerCase() === email && m.from_name);
    return fromDm?.from_name || email.split("@")[0];
  };

  const partners = useMemo(() => {
    const list = Array.from(threads.entries()).map(([email, msgs]) => ({
      email,
      last: msgs[msgs.length - 1],
      unread: msgs.filter((m) => m.to_email.toLowerCase() === me && !m.read).length,
    }));
    list.sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
    return list;
  }, [threads, me]);

  const openThread = openWith ? threads.get(openWith) ?? [] : [];

  // opening a thread marks it read
  useEffect(() => {
    if (!openWith || !me) return;
    const hasUnread = openThread.some((m) => m.to_email.toLowerCase() === me && !m.read);
    if (hasUnread) {
      void markDmsRead(me, openWith);
      setDms((prev) => prev.map((m) => (m.from_email.toLowerCase() === openWith && m.to_email.toLowerCase() === me ? { ...m, read: true } : m)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWith, openThread.length, me]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [openThread.length, openWith]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !openWith || !text.trim()) return;
    setSending(true);
    const body = text;
    const res = await sendDm(me, myName, openWith, body);
    setSending(false);
    if (!res.error) {
      setText("");
      // append locally (subscription only delivers *incoming*)
      setDms((prev) => [...prev, {
        id: `local-${Date.now()}`, from_email: me, to_email: openWith, from_name: myName,
        body: body.trim(), read: false, created_at: new Date().toISOString(),
      }]);
    }
  }

  if (!available) {
    return (
      <div>
        <SectionTitle sub="Private one-to-one messages with the people in your group.">Messages</SectionTitle>
        <EmptyHint>Messaging needs the live database.</EmptyHint>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle sub="Private one-to-one messages. Find people to message in the People directory.">Messages</SectionTitle>
        <Link href="/people"><Button size="sm" variant="outline"><Icons.Users className="h-4 w-4" /> People</Button></Link>
      </div>

      <Card className="flex min-h-0 flex-1 overflow-hidden">
        {/* conversations rail */}
        <div className={`w-full shrink-0 overflow-y-auto border-r sm:w-64 ${openWith ? "hidden sm:block" : ""}`}>
          {loading ? (
            <div className="flex justify-center py-8"><Icons.Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : partners.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Icons.MessageCircle className="mx-auto h-6 w-6" />
              <p className="mt-2">No conversations yet.</p>
              <Link href="/people" className="mt-1 inline-block font-medium text-accent hover:underline">Find someone in People →</Link>
            </div>
          ) : (
            partners.map((p) => (
              <button key={p.email} onClick={() => setOpenWith(p.email)} className={`flex w-full items-center gap-2.5 border-b px-3.5 py-3 text-left transition-colors hover:bg-secondary/60 ${openWith === p.email ? "bg-secondary" : ""}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                  {nameOf(p.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{nameOf(p.email)}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.last?.body ?? ""}</p>
                </div>
                {p.unread > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{p.unread}</span>}
              </button>
            ))
          )}
        </div>

        {/* thread */}
        <div className={`flex min-w-0 flex-1 flex-col ${openWith ? "" : "hidden sm:flex"}`}>
          {!openWith ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
              <Icons.MessagesSquare className="h-8 w-8" />
              <p className="mt-2 text-sm">Pick a conversation, or message someone from <Link href="/people" className="font-medium text-accent hover:underline">People</Link>.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b bg-secondary/40 px-4 py-2.5">
                <button onClick={() => setOpenWith("")} className="rounded-md p-1 hover:bg-secondary sm:hidden" aria-label="Back"><Icons.ArrowLeft className="h-4 w-4" /></button>
                <p className="text-sm font-semibold">{nameOf(openWith)}</p>
                <span className="truncate text-xs text-muted-foreground">{openWith}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {openThread.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Say salaam — this is the start of your conversation.</p>
                ) : (
                  openThread.map((m) => {
                    const mine = m.from_email.toLowerCase() === me;
                    return (
                      <div key={m.id} className={`mb-2.5 flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={submit} className="border-t p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
                    placeholder={`Message ${nameOf(openWith)}…`}
                    rows={1}
                    className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="submit" size="md" disabled={sending || !text.trim()}>
                    {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
