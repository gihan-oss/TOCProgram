"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, SectionTitle } from "@/components/ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
  hidden?: boolean; // kickoff turn, sent to the API but not displayed
}

const QUICK = [
  { label: "Start my Theory of Change", icon: "Sparkles", send: "I'm ready — let's build my program's Theory of Change." },
  { label: "Help me write Question Zero", icon: "HelpCircle", send: "Help me phrase my Question Zero correctly." },
  { label: "Outputs vs outcomes", icon: "GitCompare", send: "What's the difference between my output and my outcome?" },
  { label: "Pick my Area of Focus", icon: "Compass", send: "Help me choose the right MAS Area of Focus and sub-focus." },
];

// very small markdown-ish renderer (bold + line breaks)
function render(text: string) {
  return text.split("\n").map((line, i) => (
    <p key={i} className={line.trim() === "" ? "h-2" : ""}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>,
      )}
    </p>
  ));
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // kick off the coach's opening turn on first load
    void send("Let's begin.", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string, hidden = false) {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: text, hidden }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = (await res.json()) as { ok: boolean; reply?: string; demo?: boolean; error?: string };
      if (data.demo) setDemo(true);
      setMessages((m) => [...m, { role: "assistant", content: data.ok ? data.reply ?? "" : `⚠️ ${data.error ?? "Something went wrong."}` }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Network error — please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  const visible = messages.filter((m) => !m.hidden);

  return (
    <div>
      <SectionTitle sub="A MAS GLA Theory of Change Coach — powered by Claude. It coaches you to build your own program; it never fills it out for you.">
        AI Assistant
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="flex h-[620px] flex-col">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {visible.length === 0 && busy && (
              <p className="text-sm text-muted-foreground">Starting your coaching session…</p>
            )}
            {visible.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icons.Sparkles className="h-4 w-4" />
                  </div>
                )}
                <div className={`max-w-[82%] space-y-1 rounded-xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {render(m.content)}
                </div>
              </div>
            ))}
            {busy && visible.length > 0 && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Icons.Sparkles className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-secondary px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Answer the coach, or ask a question…"
                disabled={busy}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              <button onClick={() => send(input)} disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                <Icons.Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <p className="text-sm font-medium">Quick starts</p>
            <div className="mt-3 space-y-2">
              {QUICK.map((q) => {
                const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[q.icon] ?? Icons.Sparkles;
                return (
                  <button key={q.label} onClick={() => send(q.send)} disabled={busy} className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50">
                    <Cmp className="h-4 w-4 text-accent" /> {q.label}
                  </button>
                );
              })}
            </div>
          </Card>
          {demo && (
            <Card className="p-4">
              <Badge tone="warning"><Icons.Info className="h-3 w-3" /> Demo mode</Badge>
              <p className="mt-2 text-xs text-muted-foreground">Add an <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code> in your deployment to turn on the live Claude coach.</p>
            </Card>
          )}
          <Card className="p-4">
            <Badge tone="success"><Icons.ShieldCheck className="h-3 w-3" /> Safe by design</Badge>
            <p className="mt-2 text-xs text-muted-foreground">The coach guides you to build your own Theory of Change — it never auto-fills your work.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
