"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, EmptyHint } from "@/components/ui";
import { Confetti } from "@/components/confetti";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { CLIENT } from "@/lib/mas";
import { loadModules, saveModules, loadDone, loadMeta, moduleComplete, type CourseModule, type LearnerMeta } from "@/lib/content";
import { computeGameState } from "@/lib/gamify";
import { MASGLA_STARTER, effectiveModules, courseIsEmpty } from "@/lib/starter-course";

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
  const [celebrate, setCelebrate] = useState(false);

  // Fire confetti once, the first time a learner completes every module.
  useEffect(() => {
    if (canEdit || modules.length === 0 || !user) return;
    const withContent = modules.filter((m) => m.resources.length > 0);
    const all = withContent.length > 0 && withContent.every((m) => moduleComplete(m, done));
    if (!all) return;
    const key = `toc-modules-celebrated:${user.email.toLowerCase()}`;
    try {
      if (localStorage.getItem(key) !== "1") {
        localStorage.setItem(key, "1");
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2200);
      }
    } catch {}
  }, [modules, done, canEdit, user?.email]);

  useEffect(() => {
    (async () => {
      const stored = await loadModules();
      const empty = courseIsEmpty(stored);
      // Always SHOW the MASGLA course when there's no real content — straight
      // from code, so it never depends on a database write succeeding.
      setModules(empty ? MASGLA_STARTER : stored);
      // Best-effort persist for admins so edits stick; display doesn't rely on it.
      if (empty && (user?.role === "admin" || user?.role === "facilitator")) void saveModules(MASGLA_STARTER);
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
                <Link href="/certificate">
                  <Button variant="secondary" size="sm"><Icons.Award className="h-4 w-4" /> Get your certificate</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {celebrate && <Confetti />}

      {/* All modules done → Build unlocked */}
      {!canEdit && total > 0 && activeIdx < 0 && (
        <Card className="mb-4 overflow-hidden border-[hsl(var(--success)/0.4)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-[hsl(var(--success)/0.12)] to-accent/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--success))] text-white"><Icons.Award className="h-6 w-6" /></div>
              <div>
                <p className="font-bold">You finished all {total} modules! 🎉</p>
                <p className="text-sm text-muted-foreground">The <b>Build</b> stage is now unlocked. Claim your certificate, then start your Theory of Change.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/certificate"><Button size="sm"><Icons.Award className="h-4 w-4" /> Get certificate</Button></Link>
              <Link href="/toc"><Button size="sm" variant="outline"><Icons.Workflow className="h-4 w-4" /> Start building</Button></Link>
            </div>
          </div>
        </Card>
      )}

      {!canEdit && total > 0 && (
        <Card className="mb-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-sm font-bold text-accent">Lv {game.levelIndex + 1}</div>
            <div>
              <p className="font-semibold">{game.levelName}</p>
              <p className="text-xs text-muted-foreground">{game.xp} XP{game.isMax ? " · max level reached 🎉" : ` · ${game.toNext} XP to next level`}</p>
            </div>
          </div>
          {!game.isMax && game.spanLevel > 0 && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.round((game.intoLevel / game.spanLevel) * 100)}%` }} /></div>
          )}
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
        <>
          <div className="space-y-3">
            {modules.map((m, i) => ({ m, i }))
              // Learners only see what they've reached: completed modules + the
              // current one. Future modules stay hidden until unlocked.
              .filter(({ i }) => canEdit || activeIdx < 0 || i <= activeIdx)
              .map(({ m, i }) => {
                const totalItems = m.resources.length;
                const completed = m.resources.filter((r) => done.has(r.id)).length;
                const pct = totalItems ? Math.round((completed / totalItems) * 100) : 0;
                const complete = moduleComplete(m, done);
                const isCurrent = !canEdit && i === activeIdx;
                const justUnlocked = isCurrent && i > 0 && completed === 0; // freshly opened

                const inner = (
                  <Card className={`p-5 transition-shadow hover:shadow-md ${isCurrent ? "ring-2 ring-accent/50" : ""}`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${complete ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : "bg-accent/15 text-accent"}`}>
                        {complete ? <Icons.Check className="h-5 w-5" /> : i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Module {i + 1}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{m.title}</h3>
                          {complete && <Badge tone="success">Complete</Badge>}
                          {justUnlocked && <Badge tone="accent"><Icons.Sparkles className="h-3 w-3" /> Just unlocked</Badge>}
                          {isCurrent && !justUnlocked && !complete && completed > 0 && <Badge tone="accent">In progress</Badge>}
                        </div>

                        {justUnlocked ? (
                          <div className="mt-2 flex items-start gap-2 rounded-lg bg-accent/10 p-2.5 text-sm text-accent">
                            <Icons.PartyPopper className="mt-0.5 h-4 w-4 shrink-0" />
                            <span><b>You've unlocked this!</b>{m.summary ? ` ${m.summary}` : " Open it to begin."}</span>
                          </div>
                        ) : (
                          m.summary && <p className="mt-0.5 text-sm text-muted-foreground">{m.summary}</p>
                        )}

                        {!canEdit && totalItems > 0 && (
                          <>
                            <p className="mt-2 text-xs text-muted-foreground">{totalItems} item{totalItems !== 1 ? "s" : ""} · {completed}/{totalItems} done</p>
                            <div className="mt-1.5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
                          </>
                        )}
                        {canEdit && <p className="mt-2 text-xs text-muted-foreground">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); move(i, -1); }} disabled={i === 0} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Move up"><Icons.ChevronUp className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); move(i, 1); }} disabled={i === modules.length - 1} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Move down"><Icons.ChevronDown className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeModule(m.id); }} className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]" aria-label="Remove"><Icons.Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                      <Icons.ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
                    </div>
                  </Card>
                );

                return <Link key={m.id} href={`/learning/${m.id}`}>{inner}</Link>;
              })}
          </div>
          {!canEdit && activeIdx >= 0 && modules.length - (activeIdx + 1) > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icons.Lock className="h-3.5 w-3.5" /> {modules.length - (activeIdx + 1)} more module{modules.length - (activeIdx + 1) !== 1 ? "s" : ""} unlock as you finish each one.
            </p>
          )}
        </>
      )}
    </div>
  );
}
