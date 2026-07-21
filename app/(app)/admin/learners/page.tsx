"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, Progress, Stat, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { listMembers, listProfiles, listLearnerProgress, listTocs, isSupabaseConfigured, type Member, type MemberProfile, type ProgressRow, type TocRow } from "@/lib/store";
import { loadModules, moduleComplete, QUIZ_PASS, type CourseModule, type LearnerMeta } from "@/lib/content";
import { effectiveModules } from "@/lib/starter-course";
import { computeGameState } from "@/lib/gamify";
import { CLIENT } from "@/lib/mas";

interface Row {
  email: string;
  name: string;
  role: string;
  department: string;
  roleType: string;
  onboarded: boolean;
  modulesDone: number;
  modulesTotal: number;
  itemsDone: number;
  itemsTotal: number;
  worksheetsDone: number;
  worksheetsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  level: string;
  xp: number;
  tocNodes: number;
  lastActive: string | null;
  doneSet: Set<string>;
  worksheets: Record<string, Record<string, string>>; // answers per worksheet resource id
}

function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }
function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(+d) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LearnersPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [tocs, setTocs] = useState<TocRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    (async () => {
      const [mods, mem, prof, prog, toc] = await Promise.all([
        loadModules(), listMembers(), listProfiles(), listLearnerProgress(), listTocs(),
      ]);
      setModules(effectiveModules(mods));
      setMembers(mem); setProfiles(prof); setProgress(prog); setTocs(toc);
      setLoaded(true);
    })();
  }, [user?.email]);

  const allResources = useMemo(() => modules.flatMap((m) => m.resources), [modules]);
  const worksheetsTotal = allResources.filter((r) => r.type === "Worksheet").length;
  const quizzesTotal = allResources.filter((r) => r.type === "Quiz").length;

  const rows = useMemo<Row[]>(() => {
    const byEmail = new Map<string, Row>();
    const ensure = (email: string): Row => {
      const e = email.toLowerCase();
      let r = byEmail.get(e);
      if (!r) {
        r = { email: e, name: "", role: "participant", department: "", roleType: "", onboarded: false,
          modulesDone: 0, modulesTotal: modules.length, itemsDone: 0, itemsTotal: allResources.length,
          worksheetsDone: 0, worksheetsTotal, quizzesPassed: 0, quizzesTotal, level: "—", xp: 0,
          tocNodes: 0, lastActive: null, doneSet: new Set(), worksheets: {} };
        byEmail.set(e, r);
      }
      return r;
    };
    const newer = (a: string | null, b?: string) => (!b ? a : !a ? b : new Date(b) > new Date(a) ? b : a);

    members.forEach((m) => { const r = ensure(m.email); r.name = m.name || r.name; r.role = m.role; r.lastActive = newer(r.lastActive, m.created_at); });
    profiles.forEach((p) => {
      const r = ensure(p.email);
      r.name = r.name || p.name; r.department = p.department || r.department; r.roleType = p.role_type || r.roleType;
      r.onboarded = r.onboarded || p.onboarded; r.lastActive = newer(r.lastActive, p.updated_at);
    });
    tocs.forEach((t) => {
      const r = ensure(t.email);
      const d = t.data as { programs?: { nodes?: unknown[] }[]; nodes?: unknown[] } | undefined;
      r.tocNodes = Array.isArray(d?.programs)
        ? d!.programs.reduce((s, p) => s + (p.nodes?.length ?? 0), 0)
        : (d?.nodes?.length ?? 0);
      r.lastActive = newer(r.lastActive, t.updated_at);
    });
    progress.forEach((p) => {
      const r = ensure(p.email);
      const done = new Set(p.done ?? []);
      const meta: LearnerMeta = p.meta ?? { scores: {}, worksheets: {} };
      const scores = meta.scores ?? {};
      r.doneSet = done;
      r.worksheets = meta.worksheets ?? {};
      r.itemsDone = allResources.filter((res) => done.has(res.id)).length;
      r.modulesDone = modules.filter((m) => moduleComplete(m, done)).length;
      r.worksheetsDone = allResources.filter((res) => res.type === "Worksheet" && done.has(res.id)).length;
      r.quizzesPassed = allResources.filter((res) => {
        const s = res.type === "Quiz" ? scores[res.id] : undefined;
        return s && s.total > 0 && s.correct / s.total >= QUIZ_PASS;
      }).length;
      const g = computeGameState(modules, done, meta);
      r.level = g.levelName; r.xp = g.xp;
      r.lastActive = newer(r.lastActive, p.updated_at);
    });

    let list = [...byEmail.values()];
    // hide pure-staff rows (admins) so the list is learners; keep anyone with progress.
    list = list.filter((r) => r.role !== "admin" || r.itemsDone > 0 || r.tocNodes > 0);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((r) => r.email.includes(needle) || r.name.toLowerCase().includes(needle) || r.department.toLowerCase().includes(needle));
    return list.sort((a, b) => pct(b.itemsDone, b.itemsTotal) - pct(a.itemsDone, a.itemsTotal) || a.name.localeCompare(b.name));
  }, [members, profiles, progress, tocs, modules, allResources, worksheetsTotal, quizzesTotal, q]);

  const summary = useMemo(() => {
    const total = rows.length;
    const onboarded = rows.filter((r) => r.onboarded).length;
    const started = rows.filter((r) => r.itemsDone > 0).length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + pct(r.itemsDone, r.itemsTotal), 0) / total) : 0;
    return { total, onboarded, started, avg };
  }, [rows]);

  // How many people are in each Area of Focus, and how many hold each role —
  // "how many volunteers, how many in Islam to Muslims", at a glance.
  const breakdowns = useMemo(() => {
    const tally = (pick: (r: Row) => string) => {
      const m = new Map<string, number>();
      for (const r of rows) { const k = pick(r).trim(); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return { byDept: tally((r) => r.department), byRole: tally((r) => r.roleType) };
  }, [rows]);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icons.Users className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight">Learner Tracking</h1>
        </div>
        {modules.length > 0 && rows.length > 0 && (
          <Button size="sm" onClick={() => setPresenting(true)}>
            <Icons.Presentation className="h-4 w-4" /> Kickoff slide
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Everyone in the portal and exactly where they are — sign-up, modules, worksheets, quizzes and their Theory of Change.</p>

      {presenting && <KickoffSlide modules={modules} rows={rows} onClose={() => setPresenting(false)} />}

      {!configured && (
        <Card className="mb-4 flex items-start gap-2 border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.08)] p-3 text-sm">
          <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <span>Live cross-learner tracking needs Supabase connected. Until then this shows only data saved on this browser. (Add your Supabase keys and run <code className="rounded bg-secondary px-1">supabase/schema.sql</code>.)</span>
        </Card>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="People" value={summary.total} /></Card>
        <Card className="p-4"><Stat label="Onboarded" value={summary.onboarded} hint={`${summary.total - summary.onboarded} pending`} /></Card>
        <Card className="p-4"><Stat label="Started learning" value={summary.started} /></Card>
        <Card className="p-4"><Stat label="Avg. completion" value={`${summary.avg}%`} /></Card>
      </div>

      {/* Breakdowns: how many per Area of Focus, and per role */}
      {(breakdowns.byDept.length > 0 || breakdowns.byRole.length > 0) && (
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          <Breakdown title="By Area of Focus" icon="LayoutGrid" items={breakdowns.byDept} total={summary.total} />
          <Breakdown title="By role" icon="UserCheck" items={breakdowns.byRole} total={summary.total} />
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, department…" className="modal-input pl-9" />
        </div>
      </div>

      {!loaded ? (
        <div className="flex h-40 items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : rows.length === 0 ? (
        <EmptyHint>No learners yet. As people sign up and start, they'll appear here automatically.</EmptyHint>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Learner</th>
                  <th className="px-3 py-2.5 font-semibold">Role · Dept</th>
                  <th className="px-3 py-2.5 font-semibold">Modules</th>
                  <th className="px-3 py-2.5 font-semibold">Worksheets</th>
                  <th className="px-3 py-2.5 font-semibold">Quizzes</th>
                  <th className="px-3 py-2.5 font-semibold">TOC</th>
                  <th className="px-3 py-2.5 font-semibold">Level</th>
                  <th className="px-3 py-2.5 font-semibold">Last active</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = open === r.email;
                  return (
                    <Fragment key={r.email}>
                      <tr className="border-b last:border-0 hover:bg-secondary/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.name || r.email.split("@")[0]}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                          {!r.onboarded && <Badge tone="warning" className="mt-1">Not onboarded</Badge>}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <span className="font-medium capitalize">{r.role}</span>
                          {r.department && <span className="block text-muted-foreground">{r.department}</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={pct(r.itemsDone, r.itemsTotal)} className="w-16" />
                            <span className="text-xs text-muted-foreground">{r.modulesDone}/{r.modulesTotal}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">{r.worksheetsDone}/{r.worksheetsTotal}</td>
                        <td className="px-3 py-3 text-xs">{r.quizzesPassed}/{r.quizzesTotal}</td>
                        <td className="px-3 py-3 text-xs">{r.tocNodes ? <span className="inline-flex items-center gap-1 text-foreground"><Icons.Workflow className="h-3.5 w-3.5 text-accent" />{r.tocNodes}</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-3 text-xs">{r.xp ? <span className="font-medium">{r.level}</span> : <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(r.lastActive)}</td>
                        <td className="px-2 py-3">
                          <button onClick={() => setOpen(isOpen ? null : r.email)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Details">
                            <Icons.ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b bg-secondary/20">
                          <td colSpan={9} className="px-4 py-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module-by-module</p>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {modules.map((m, i) => {
                                const done = m.resources.filter((res) => r.doneSet.has(res.id)).length;
                                const complete = moduleComplete(m, r.doneSet);
                                return (
                                  <div key={m.id} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${complete ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : "bg-secondary text-muted-foreground"}`}>{complete ? <Icons.Check className="h-4 w-4" /> : i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium">{m.title}</p>
                                      <p className="text-[11px] text-muted-foreground">{done}/{m.resources.length} items</p>
                                    </div>
                                  </div>
                                );
                              })}
                              {modules.length === 0 && <p className="text-xs text-muted-foreground">No modules published yet.</p>}
                            </div>

                            {/* The learner's actual worksheet answers — saved to the database as they go. */}
                            {allResources.some((res) => res.type === "Worksheet") && (
                              <div className="mt-5">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Worksheet responses</p>
                                <div className="space-y-3">
                                  {allResources.filter((res) => res.type === "Worksheet").map((ws) => {
                                    const ans = r.worksheets[ws.id] ?? {};
                                    const fields = ws.fields ?? [];
                                    const answered = fields.filter((f) => (ans[f.id] ?? "").trim()).length;
                                    return (
                                      <div key={ws.id} className="rounded-lg border bg-card p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          <p className="text-sm font-semibold">{ws.title}</p>
                                          <Badge tone={answered > 0 ? "accent" : "muted"}>{answered}/{fields.length} answered</Badge>
                                        </div>
                                        {answered === 0 ? (
                                          <p className="text-xs text-muted-foreground">No answers yet.</p>
                                        ) : (
                                          <div className="space-y-2.5">
                                            {fields.map((f) => {
                                              const v = (ans[f.id] ?? "").trim();
                                              return (
                                                <div key={f.id}>
                                                  <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                                                  {v ? (
                                                    <p className="mt-0.5 whitespace-pre-wrap rounded-md border bg-secondary/30 px-2.5 py-1.5 text-sm">{v}</p>
                                                  ) : (
                                                    <p className="mt-0.5 text-sm text-muted-foreground/60">—</p>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: learners' progress saves automatically as they go. Manage who can sign in under <Link href="/admin/access" className="text-accent hover:underline">People &amp; Access</Link>.
      </p>
    </div>
  );
}

// ---------------- Module kickoff slide ----------------
// A full-screen, projector-friendly slide to open a session with: for the
// chosen module it groups everyone into Done / In progress / Not started, so
// the room gets an instant "where we all are" heads-up. Arrow keys (or the
// on-screen arrows) flip between modules like slides; Esc closes.
function KickoffSlide({ modules, rows, onClose }: { modules: CourseModule[]; rows: Row[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const module = modules[idx];
  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(modules.length - 1, i + d)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setIdx((i) => Math.min(modules.length - 1, i + 1)); }
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modules.length, onClose]);

  const groups = useMemo(() => {
    const done: Row[] = [], progress: Row[] = [], notStarted: Row[] = [];
    for (const r of rows) {
      const items = module.resources.length;
      const complete = items > 0 && module.resources.every((res) => r.doneSet.has(res.id));
      const some = module.resources.some((res) => r.doneSet.has(res.id));
      if (complete) done.push(r);
      else if (some) progress.push(r);
      else notStarted.push(r);
    }
    return { done, progress, notStarted };
  }, [module, rows]);

  // Mentimeter-style: bars grow in from zero each time the slide changes.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    const t = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(t);
  }, [idx]);

  const total = rows.length || 1;
  const bars: { key: string; label: string; color: string; people: Row[] }[] = [
    { key: "done", label: "Completed", color: "hsl(var(--success))", people: groups.done },
    { key: "prog", label: "In progress", color: "hsl(var(--warning))", people: groups.progress },
    { key: "not", label: "Not started", color: "hsl(var(--muted-foreground))", people: groups.notStarted },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{CLIENT.tocTitle} · Kickoff</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Slide {idx + 1} / {modules.length}</span>
          <button onClick={onClose} className="ml-2 inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 font-medium hover:bg-secondary" title="Close (Esc)">
            <Icons.X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>

      {/* slide body — big bold title, then bars that grow in (Mentimeter style) */}
      <div className="relative flex flex-1 flex-col overflow-y-auto px-6 py-8 sm:px-16 sm:py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center">
          <p className="text-base font-bold uppercase tracking-wider text-accent">Module {idx + 1} · {rows.length} {rows.length === 1 ? "participant" : "participants"}</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{module.title}</h1>

          <div className="mt-10 space-y-8">
            {bars.map((b) => {
              const count = b.people.length;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={b.key}>
                  <div className="mb-2 flex items-baseline justify-between gap-4">
                    <span className="text-xl font-bold sm:text-2xl">{b.label}</span>
                    <span className="shrink-0 text-2xl font-extrabold tabular-nums sm:text-3xl" style={{ color: b.color }}>
                      {count}<span className="ml-2 text-lg font-semibold text-muted-foreground sm:text-xl">{pct}%</span>
                    </span>
                  </div>
                  {/* the growing bar */}
                  <div className="h-12 w-full overflow-hidden rounded-2xl bg-secondary sm:h-16">
                    <div
                      className="h-full rounded-2xl transition-[width] duration-[900ms] ease-out"
                      style={{ width: grown ? `${Math.max(count > 0 ? 4 : 0, pct)}%` : "0%", backgroundColor: b.color }}
                    />
                  </div>
                  {/* names sit under each bar so it's still a real heads-up */}
                  {count > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {b.people.map((p) => (
                        <span key={p.email} className="rounded-full border bg-card px-2.5 py-1 text-sm font-medium">
                          {p.name || p.email.split("@")[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* bottom nav */}
      <div className="flex items-center justify-between gap-3 border-t px-6 py-3">
        <button onClick={() => go(-1)} disabled={idx === 0} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-30 disabled:hover:bg-card">
          <Icons.ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <div className="flex items-center gap-1.5">
          {modules.map((m, i) => (
            <button key={m.id} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-accent" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`} />
          ))}
        </div>
        <button onClick={() => go(1)} disabled={idx === modules.length - 1} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-30 disabled:hover:bg-card">
          Next <Icons.ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// A simple counted breakdown (e.g. how many people per Area of Focus / role).
function Breakdown({ title, icon, items, total }: { title: string; icon: string; items: [string, number][]; total: number }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] ?? Icons.List;
  const max = items.reduce((m, [, n]) => Math.max(m, n), 0) || 1;
  return (
    <Card className="p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Cmp className="h-4 w-4 text-accent" /> {title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet — this fills in as people complete their profile.</p>
      ) : (
        <div className="space-y-2">
          {items.map(([name, n]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm" title={name}>{name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((n / max) * 100)}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                {n}<span className="ml-1 text-xs font-normal text-muted-foreground">{total ? `${Math.round((n / total) * 100)}%` : ""}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
