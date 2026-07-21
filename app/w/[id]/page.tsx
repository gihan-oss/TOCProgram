"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Button, FloatingIcons } from "@/components/ui";
import { Logo } from "@/components/logo";
import { WorksheetPlayer } from "@/components/worksheet-player";
import { useToast } from "@/components/toast";
import { CLIENT, MAS } from "@/lib/mas";
import { effectiveModules } from "@/lib/starter-course";
import {
  loadModulesPublic, loadPublicRoster, savePublicWorksheet,
  type CourseModule, type Resource, type PublicParticipant,
} from "@/lib/content";

// Remembers who was last chosen on this device so a returning visitor doesn't
// re-pick (and a facilitator on a shared screen can switch people quickly).
const WHO_KEY = "toc-public-who";

function loadWho(): PublicParticipant | null {
  try {
    const raw = localStorage.getItem(WHO_KEY);
    return raw ? (JSON.parse(raw) as PublicParticipant) : null;
  } catch {
    return null;
  }
}

export default function PublicWorksheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [roster, setRoster] = useState<PublicParticipant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [who, setWho] = useState<PublicParticipant | null>(null);

  // Answers + completion the visitor has entered this session, per worksheet id.
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    (async () => {
      const [mods, ppl] = await Promise.all([loadModulesPublic(), loadPublicRoster()]);
      setModules(effectiveModules(mods));
      setRoster(ppl);
      // Restore the last-chosen person only if they're still on the roster.
      const remembered = loadWho();
      if (remembered && ppl.some((p) => p.key === remembered.key)) setWho(remembered);
      setLoaded(true);
    })();
  }, []);

  const module = modules.find((m) => m.id === id);
  const moduleIndex = module ? modules.findIndex((m) => m.id === id) : -1;
  const worksheets = useMemo<Resource[]>(
    () => (module ? module.resources.filter((r) => r.type === "Worksheet") : []),
    [module],
  );

  function setPerson(p: PublicParticipant) {
    try { localStorage.setItem(WHO_KEY, JSON.stringify(p)); } catch {}
    setWho(p);
    // A different person starts a fresh sheet on this device.
    setAnswers({});
    setDone(new Set());
    setStatus("idle");
  }

  async function handleSave(resourceId: string, vals: Record<string, string>, complete: boolean) {
    if (!who) return;
    setAnswers((prev) => ({ ...prev, [resourceId]: vals }));
    setDone((prev) => {
      const next = new Set(prev);
      complete ? next.add(resourceId) : next.delete(resourceId);
      return next;
    });
    setStatus("saving");
    const res = await savePublicWorksheet(who.key, { [resourceId]: vals }, complete ? [resourceId] : []);
    setStatus(res.ok ? "saved" : "error");
    if (!res.ok) toast(res.error || "Couldn't save — check your connection", "error");
  }

  // ---- Shared chrome ----
  const frame = (children: React.ReactNode) => (
    <div className="relative min-h-screen bg-secondary/30">
      <div className="fixed inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <FloatingIcons />
      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</div>
    </div>
  );

  if (!loaded) {
    return frame(
      <div className="flex justify-center py-24">
        <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>,
    );
  }

  if (!module || worksheets.length === 0) {
    return frame(
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <Icons.FileQuestion className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">Worksheet not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This link doesn&apos;t point to a module worksheet. Please check with whoever shared it.
        </p>
        <Link href="/" className="mt-5 inline-block"><Button size="sm" variant="outline">Go to the portal</Button></Link>
      </div>,
    );
  }

  // ---- Name gate (pick who you are) ----
  if (!who) {
    return frame(
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center"><Logo size="md" /></div>
        <NameGate module={module} moduleIndex={moduleIndex} roster={roster} onStart={setPerson} />
        <p className="mt-6 text-center text-xs text-muted-foreground">An Amal &amp; Company platform · {MAS.org}</p>
      </div>,
    );
  }

  // ---- The worksheet(s) ----
  return frame(
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Logo size="sm" />
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
            {who.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="font-medium">{who.name}</span>
          <button onClick={() => setWho(null)} className="text-muted-foreground hover:text-foreground" title="Not you? Switch person">
            <Icons.RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {CLIENT.tocTitle}{moduleIndex >= 0 ? ` · Module ${moduleIndex + 1}` : ""}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{module.title}</h1>
      {module.summary && <p className="mt-1 text-sm text-muted-foreground">{module.summary}</p>}

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
        <Icons.Sparkles className="h-4 w-4 shrink-0 text-accent" />
        <span className="text-muted-foreground">
          Filling this in as <span className="font-medium text-foreground">{who.name}</span>. It saves to your account —
          sign in anytime to find it in Module {moduleIndex + 1}.
        </span>
      </div>

      <div className="mt-6 space-y-6">
        {worksheets.map((ws) => (
          <div key={ws.id}>
            <div className="flex items-center gap-2">
              <Icons.PencilRuler className="h-4 w-4 shrink-0 text-accent" />
              <h2 className="text-sm font-semibold">{ws.title}</h2>
              {done.has(ws.id) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success)/0.15)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--success))]">
                  <Icons.Check className="h-3 w-3" /> Done
                </span>
              )}
            </div>
            <WorksheetPlayer
              r={ws}
              answers={answers[ws.id] ?? {}}
              done={done.has(ws.id)}
              onSave={(vals, complete) => handleSave(ws.id, vals, complete)}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {status === "saving" ? (
          <><Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
        ) : status === "error" ? (
          <span className="text-[hsl(var(--danger))]"><Icons.AlertCircle className="mr-1 inline h-3.5 w-3.5" /> Not saved — check your connection</span>
        ) : status === "saved" ? (
          <><Icons.CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Saved to your account</>
        ) : (
          <><Icons.ShieldCheck className="h-3.5 w-3.5" /> Your answers save automatically as you type</>
        )}
      </div>
    </div>,
  );
}

// The first screen: pick who you are from the enrolled roster, or — if you're
// not on it (or no one is enrolled yet) — type your name + email. Either way the
// worksheet can always be started and saved.
function NameGate({ module, moduleIndex, roster, onStart }: {
  module: CourseModule;
  moduleIndex: number;
  roster: PublicParticipant[];
  onStart: (p: PublicParticipant) => void;
}) {
  // Default to typing when there's no roster to pick from.
  const [typing, setTyping] = useState(roster.length === 0);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (typing) {
      const n = name.trim();
      const em = email.trim().toLowerCase();
      if (!n) { setError("Please enter your name."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Please enter a valid email address."); return; }
      // The email itself is the save key when you're not on the roster.
      onStart({ key: em, name: n });
      return;
    }
    const picked = roster.find((p) => p.key === key);
    if (!picked) { setError("Please choose your name from the list."); return; }
    onStart(picked);
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
        {CLIENT.tocTitle}{moduleIndex >= 0 ? ` · Module ${moduleIndex + 1}` : ""}
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{module.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill in this module&apos;s worksheet. Tell us who you are so your answers are saved to your account —
        they&apos;ll be waiting for you when you sign in.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {typing ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Your name</span>
              <span className="relative block">
                <Icons.User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Hannah Maki" autoFocus className="auth-input" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Your email</span>
              <span className="relative block">
                <Icons.Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="you@organization.org" className="auth-input" />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">Use the same email you sign in to the portal with.</span>
            </label>
            {roster.length > 0 && (
              <button type="button" onClick={() => { setTyping(false); setError(null); }} className="text-xs font-medium text-accent hover:underline">
                ← Pick my name from the list instead
              </button>
            )}
          </>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Your name</span>
            <span className="relative block">
              <Icons.User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(null); }}
                className="auth-input appearance-none pr-9"
              >
                <option value="">Choose your name…</option>
                {roster.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
              <Icons.ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </span>
            <button type="button" onClick={() => { setTyping(true); setError(null); }} className="mt-1.5 text-xs font-medium text-accent hover:underline">
              Don&apos;t see your name? Enter it manually
            </button>
          </label>
        )}

        {error && <p className="rounded-lg bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">{error}</p>}

        <Button type="submit" size="md" className="w-full" disabled={typing ? (!name.trim() || !email.trim()) : !key}>
          Start worksheet <Icons.ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
