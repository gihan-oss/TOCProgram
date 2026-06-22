"use client";

import { useState } from "react";
import Image from "next/image";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { addNotification, sendEmail } from "@/lib/store";
import { MAS, NAVIGATOR } from "@/lib/mas";

// Nuri — the in-portal navigator. A friendly floating character anyone can open
// to ask a question (name, email, message). Submissions email the team and drop
// an in-app confirmation for the asker. Designed to grow into a full guide later.

export function Navigator() {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [question, setQuestion] = useState("");

  const firstName = (name || user?.name || "there").split(" ")[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !email.trim() || !question.trim()) {
      toast("Please add your name, email and question.", "error");
      return;
    }
    setBusy(true);
    try {
      const html =
        `<p><b>New question via ${NAVIGATOR.name} (portal navigator)</b></p>` +
        `<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p>` +
        `<p><b>Question:</b><br>${question.replace(/\n/g, "<br>")}</p>`;
      // Notify the team. Simulated until an email key is configured — never blocks.
      await sendEmail(MAS.contactEmail, `Portal question from ${name}`, html);
      // Confirmation the asker can see inside the portal.
      if (user) {
        await addNotification(
          user.email,
          `${NAVIGATOR.name} received your question 🌿`,
          "The team will get back to you by email. You can ask anytime.",
        );
      }
      setSent(true);
      setQuestion("");
    } catch {
      toast("Couldn't send just now — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSent(false);
    setOpen(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden">
      {/* Panel */}
      {open && (
        <div className="animate-fade-up w-[min(92vw,22rem)] overflow-hidden rounded-2xl border bg-card shadow-2xl">
          {/* header */}
          <div className="relative flex items-center gap-3 bg-primary p-4 text-primary-foreground">
            <div className="mesh pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
              <Image src={NAVIGATOR.image} alt={NAVIGATOR.name} width={44} height={44} className="h-11 w-11 object-contain" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="font-bold leading-tight">Hi, I'm {NAVIGATOR.name} 👋</p>
              <p className="text-xs text-primary-foreground/80">{NAVIGATOR.tagline}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="relative rounded-full p-1.5 text-primary-foreground/80 hover:bg-white/15 hover:text-white">
              <Icons.X className="h-4 w-4" />
            </button>
          </div>

          {/* body */}
          {sent ? (
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]">
                <Icons.Check className="h-7 w-7" />
              </div>
              <p className="mt-3 font-semibold">Thanks, {firstName}!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                I've passed your question to the team — we'll reply by email. Ask me anything, anytime.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSent(false)}>Ask another</Button>
                <Button size="sm" onClick={reset}>Done</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3 p-4">
              <p className="text-sm text-muted-foreground">
                New here or stuck on something? Ask me — I'll make sure the right person gets back to you.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Your name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="modal-input" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="modal-input" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Your question</span>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="What can I help you with?" className="modal-input resize-none" />
              </label>
              <Button type="submit" size="sm" className="w-full" disabled={busy}>
                {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <><Icons.Send className="h-4 w-4" /> Send to the team</>}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Floating character button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? `Close ${NAVIGATOR.name}` : `Ask ${NAVIGATOR.name}`}
        className="group flex items-center gap-2 rounded-full border bg-card py-1.5 pl-1.5 pr-3 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
      >
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <Image src={NAVIGATOR.image} alt={NAVIGATOR.name} width={44} height={44} className="h-11 w-11 object-contain transition-transform group-hover:scale-105" priority />
          {!open && <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-card bg-[hsl(var(--success))]" />}
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-bold">{NAVIGATOR.name}</span>
          <span className="block text-[11px] text-muted-foreground">{open ? "Close" : "Ask me anything"}</span>
        </span>
      </button>
    </div>
  );
}
