"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { CLIENT } from "@/lib/mas";
import { loadModules, saveModules, loadDone, loadMeta, moduleComplete, type CourseModule, type LearnerMeta } from "@/lib/content";
import { computeGameState } from "@/lib/gamify";
import { MASGLA_STARTER } from "@/lib/starter-course";

export default function LearningPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "facilitator";
  const toast = useToast();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<LearnerMeta>({ scores: {}, worksheets: {} });
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    (async () => {
      let mods = await loadModules();
      // Auto-load the MASGLA course whenever the portal has no real content —
      // either no modules at all, OR only empty module shells left from before.
      // Admins/facilitators trigger the (persisted) fill, so it's simply there
      // with zero manual steps.
      const isAdminish = user?.role === "admin" || user?.role === "facilitator";
      const needsContent = mods.length === 0 || mods.every((m) => m.resources.length === 0);
      if (isAdminish && needsContent) {
        if (await saveModules(MASGLA_STARTER)) mods = MASGLA_STARTER;
      }
      setModules(mods);
      if (user) {
        setDone(await loadDone(user.email));
        setMeta(await loadMeta(user.email));
      }
    })();
  }, [user?.email]);

  async function persist(next: CourseModule[]) {
    setModules(next);
    const ok = await saveModules(next);
    if (!ok) { toast("Couldn't save — please try again.", "error"); setModules(await loadModules()); }
  }
  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await persist([...modules, { id: `m-${Date.now()}`, title: title.trim(), summary: summary.trim(), resources: [] }]);
    setTitle(""); setSummary(""); setAdding(false);
    toast("Module created — open it to add content");
  }
  async function removeModule(id: string) {
    await persist(modules.filter((m) => m.id !== id));
    toast("Module removed");
  }
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    const next = [...modules];
    [next[i], next[j]] = [next[j], next[i]];
    await persist(next);
  }
  async function loadStarter() {
    setSeeding(true);
    await persist(MASGLA_STARTER);
    setSeeding(false);
    toast("MASGLA TOC starter loaded — 5 modules with worksheets and quizzes");
  }
  async function reloadStarter() {
    if (!window.confirm("Replace ALL current modules with the latest MASGLA starter content? This can't be undone.")) return;
    await loadStarter();
  }

  // ---- learner progress / gamification ----
  const firstName = user?.name?.split(" ")[0] ?? "";
  const game = computeGameState(modules, done, meta);
  const total = modules.length;
  const completedCount = modules.filter((m) => moduleComplete(m, done)).length;
  const activeIdx = modules.findIndex((m) => !moduleComplete(m, done)); // next level to open
  const totalRes = modules.reduce((s, m) => s + m.resources.length, 0);
  const doneRes = modules.reduce((s, m) => s + m.resources.filter((r) => done.has(r.id)).length, 0);
  const overall = totalRes ? Math.round((doneRes / totalRes) * 100) : total ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div>
      {canEdit ? (
        // ---------- Admin / facilitator: course builder ----------
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              <Icons.Building2 className="h-3.5 w-3.5" /> {CLIENT.name}
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Course Builder — Theory of Change</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Build the {CLIENT.name} course as ordered modules, then add videos, PDFs, text and tests. Each module opens the next level — learners unlock them one at a time, in order.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {modules.length > 0 && (
              <Button size="sm" variant="outline" onClick={reloadStarter} disabled={seeding}>
                {seeding ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.RefreshCw className="h-4 w-4" />} Reload starter
              </Button>
            )}
            <Button size="sm" onClick={() => setAdding((v) => !v)}><Icons.Plus className="h-4 w-4" /> Add module</Button>
          </div>
        </div>
      ) : (
        // ---------- Learner: branded welcome + onboarding into the modules ----------
        <div className="relative mb-6 overflow-hidden rounded-3xl border bg-primary p-7 text-primary-foreground sm:p-9">
          <div className="mesh absolute inset-0 opacity-30" />
          <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Icons.GraduationCap className="h-3.5 w-3.5" /> Learning Portal
          </span>
          <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome to {CLIENT.tocTitle}
          </h1>
          <p className="relative mt-3 max-w-xl text-sm text-primary-foreground/85">
            {firstName ? `${firstName}, this` : "This"} is your guided path. The course is built as modules, and each module opens the next level. Finish one to unlock the next — so you understand it one step at a time.
          </p>

          {total > 0 && (
            <div className="relative mt-6 flex flex-wrap items-center gap-4">
              <div className="min-w-[200px] flex-1">
                <div className="flex justify-between text-xs text-primary-foreground/80">
                  <span>{completedCount} of {total} module{total !== 1 ? "s" : ""} complete</span>
                  <span>{overall}%</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${overall}%` }} />
                </div>
              </div>
              {activeIdx >= 0 ? (
                <Link href={`/learning/${modules[activeIdx].id}`}>
                  <Button variant="secondary" size="sm">
                    {completedCount === 0 ? "Start Module 1" : `Resume Module ${activeIdx + 1}`} <Icons.ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
                  <Icons.PartyPopper className="h-4 w-4" /> All modules complete
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!canEdit && total > 0 && (
        <Card className="mb-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-sm font-bold text-accent">Lv {game.levelIndex + 1}</div>
              <div>
                <p className="font-semibold">{game.levelName}</p>
                <p className="text-xs text-muted-foreground">{game.xp} XP{game.isMax ? " · max level reached 🎉" : ` · ${game.toNext} XP to next level`}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">{game.earnedBadges}/{game.badges.length} badges</p>
            </div>
          </div>
          {!game.isMax && game.spanLevel > 0 && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.round((game.intoLevel / game.spanLevel) * 100)}%` }} /></div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {game.badges.map((b) => {
              const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[b.icon] ?? Icons.Award;
              return (
                <div key={b.id} title={`${b.name} — ${b.desc}`} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${b.earned ? "animate-pop-in bg-accent/15 text-accent" : "bg-muted text-muted-foreground/70"}`}>
                  {b.earned ? <Icon className="h-3.5 w-3.5" /> : <Icons.Lock className="h-3 w-3" />} {b.name}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {canEdit && modules.length > 0 && modules.every((m) => m.resources.length === 0) && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-accent/40 bg-accent/5 p-4">
          <p className="text-sm">Your modules don't have any content yet. Load the full MASGLA course into them?</p>
          <Button size="sm" onClick={reloadStarter} disabled={seeding}>
            {seeding ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Sparkles className="h-4 w-4" />} Fill with MASGLA content
          </Button>
        </Card>
      )}

      {canEdit && adding && (
        <Card className="mb-4 p-5">
          <form onSubmit={addModule} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module title (e.g. Module 1 — Getting Started)" className="modal-input" autoFocus />
            <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description (optional)" className="modal-input" />
            <div className="flex gap-2"><Button size="sm" type="submit">Create module</Button><Button size="sm" variant="outline" type="button" onClick={() => setAdding(false)}>Cancel</Button></div>
          </form>
        </Card>
      )}

      {modules.length === 0 ? (
        canEdit ? (
          <Card className="p-6 text-center">
            <Icons.BookMarked className="mx-auto h-8 w-8 text-accent" />
            <p className="mt-2 font-semibold">No modules yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Start from scratch with “Add module”, or load the ready-made MASGLA Theory of Change course — 5 modules, each with reading, a worksheet and a knowledge check.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={loadStarter} disabled={seeding}>
                {seeding ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Sparkles className="h-4 w-4" />} Load MASGLA TOC starter
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Icons.Plus className="h-4 w-4" /> Add module</Button>
            </div>
          </Card>
        ) : (
          <EmptyHint>No modules have been published yet — check back soon.</EmptyHint>
        )
      ) : (
        <div className="space-y-3">
          {modules.map((m, i) => {
            const totalItems = m.resources.length;
            const completed = m.resources.filter((r) => done.has(r.id)).length;
            const pct = totalItems ? Math.round((completed / totalItems) * 100) : 0;
            // gradual unlock for learners — each module opens the next level
            const locked = !canEdit && i > 0 && !moduleComplete(modules[i - 1], done);
            const complete = moduleComplete(m, done);

            const inner = (
              <Card className={`p-5 ${locked ? "opacity-60" : "transition-shadow hover:shadow-md"}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${complete ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : locked ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"}`}>
                    {complete ? <Icons.Check className="h-5 w-5" /> : locked ? <Icons.Lock className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Module {i + 1}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{m.title}</h3>
                      {complete && <Badge tone="success">Complete</Badge>}
                      {locked && <Badge tone="muted"><Icons.Lock className="h-3 w-3" /> Locked</Badge>}
                    </div>
                    {m.summary && <p className="mt-0.5 text-sm text-muted-foreground">{m.summary}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {totalItems} item{totalItems !== 1 ? "s" : ""}{!canEdit && totalItems > 0 ? ` · ${completed}/${totalItems} done` : ""}
                      {locked && i > 0 ? ` · finish “${modules[i - 1].title}” to unlock` : ""}
                    </p>
                    {!canEdit && totalItems > 0 && (
                      <div className="mt-1.5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Move up"><Icons.ChevronUp className="h-4 w-4" /></button>
                      <button onClick={() => move(i, 1)} disabled={i === modules.length - 1} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Move down"><Icons.ChevronDown className="h-4 w-4" /></button>
                      <button onClick={() => removeModule(m.id)} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove"><Icons.Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                  {!locked && <Icons.ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />}
                </div>
              </Card>
            );

            return locked ? (
              <div key={m.id} title="Finish the previous module to unlock">{inner}</div>
            ) : (
              <Link key={m.id} href={`/learning/${m.id}`}>{inner}</Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
