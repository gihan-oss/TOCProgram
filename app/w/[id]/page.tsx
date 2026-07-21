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
import { loadModulesPublic, savePublicWorksheet, type CourseModule, type Resource } from "@/lib/content";

// Remembers the person on this device so a returning visitor doesn't retype
// their details (and so a facilitator sharing one screen can switch people).
const WHO_KEY = "toc-public-who";
type Who = { name: string; email: string };

function loadWho(): Who | null {
  try {
    const raw = localStorage.getItem(WHO_KEY);
    return raw ? (JSON.parse(raw) as Who) : null;
  } catch {
    return null;
  }
}

export default function PublicWorksheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [who, setWho] = useState<Who | null>(null);

  // Answers + completion the visitor has entered this session, per worksheet id.
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    (async () => {
      setModules(effectiveModules(await loadModulesPublic()));
      setWho(loadWho());
      setLoaded(true);
    })();
  }, []);

  const module = modules.find((m) => m.id === id);
  const moduleIndex = module ? modules.findIndex((m) => m.id === id) : -1;
  const worksheets = useMemo<Resource[]>(
    () => (module ? module.resources.filter((r) => r.type === "Worksheet") : []),
    [module],
  );

  function setPerson(w: Who) {
    try { localStorage.setItem(WHO_KEY, JSON.stringify(w)); } catch {}
    setWho(w);
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
    const res = await savePublicWorksheet(who.email, { [resourceId]: vals }, complete ? [resourceId] : []);
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

  // ---- Name gate (Mentimeter-style) ----
  if (!who) {
    return frame(
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center"><Logo size="md" /></div>
        <NameGate module={module} moduleIndex={moduleIndex} onStart={setPerson} />
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
          Fill this in as <span className="font-medium text-foreground">{who.name}</span>. It saves to
          {" "}<span className="font-medium text-foreground">{who.email}</span> — sign in anytime to find it in Module {moduleIndex + 1}.
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
          <><Icons.CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Saved to {who.email}</>
        ) : (
          <><Icons.ShieldCheck className="h-3.5 w-3.5" /> Your answers save automatically as you type</>
        )}
      </div>
    </div>,
  );
}

// The first screen: choose your name + email before filling the sheet.
function NameGate({ module, moduleIndex, onStart }: {
  module: CourseModule;
  moduleIndex: number;
  onStart: (w: Who) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const em = email.trim().toLowerCase();
    if (!n) { setError("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Please enter a valid email address."); return; }
    onStart({ name: n, email: em });
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
        {CLIENT.tocTitle}{moduleIndex >= 0 ? ` · Module ${moduleIndex + 1}` : ""}
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{module.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill in this module&apos;s worksheet. Add your name and email so your answers are saved to your account —
        they&apos;ll be waiting for you when you sign in.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Your name</span>
          <span className="relative block">
            <Icons.User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hannah Maki" autoFocus className="auth-input" />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Your email</span>
          <span className="relative block">
            <Icons.Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.org" className="auth-input" />
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">Use the same email you sign in to the portal with.</span>
        </label>

        {error && <p className="rounded-lg bg-[hsl(var(--danger)/0.12)] px-3 py-2 text-sm text-[hsl(var(--danger))]">{error}</p>}

        <Button type="submit" size="md" className="w-full">
          Start worksheet <Icons.ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
