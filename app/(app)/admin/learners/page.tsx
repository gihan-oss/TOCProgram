"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Progress, Stat, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { listMembers, listProfiles, listLearnerProgress, listTocs, isSupabaseConfigured, type Member, type MemberProfile, type ProgressRow, type TocRow } from "@/lib/store";
import { loadModules, moduleComplete, QUIZ_PASS, type CourseModule, type LearnerMeta } from "@/lib/content";
import { effectiveModules } from "@/lib/starter-course";
import { computeGameState } from "@/lib/gamify";

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
          tocNodes: 0, lastActive: null, doneSet: new Set() };
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
    tocs.forEach((t) => { const r = ensure(t.email); r.tocNodes = t.data?.nodes?.length ?? 0; r.lastActive = newer(r.lastActive, t.updated_at); });
    progress.forEach((p) => {
      const r = ensure(p.email);
      const done = new Set(p.done ?? []);
      const meta: LearnerMeta = p.meta ?? { scores: {}, worksheets: {} };
      r.doneSet = done;
      r.itemsDone = allResources.filter((res) => done.has(res.id)).length;
      r.modulesDone = modules.filter((m) => moduleComplete(m, done)).length;
      r.worksheetsDone = allResources.filter((res) => res.type === "Worksheet" && done.has(res.id)).length;
      r.quizzesPassed = allResources.filter((res) => {
        const s = res.type === "Quiz" ? meta.scores[res.id] : undefined;
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

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Icons.Users className="h-5 w-5 text-accent" />
        <h1 className="text-2xl font-semibold tracking-tight">Learner Tracking</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Everyone in the portal and exactly where they are — sign-up, modules, worksheets, quizzes and their Theory of Change.</p>

      {!configured && (
        <Card className="mb-4 flex items-start gap-2 border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.08)] p-3 text-sm">
          <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <span>Live cross-learner tracking needs Supabase connected. Until then this shows only data saved on this browser. (Add your Supabase keys and run <code className="rounded bg-secondary px-1">supabase/schema.sql</code>.)</span>
        </Card>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Learners" value={summary.total} /></Card>
        <Card className="p-4"><Stat label="Onboarded" value={summary.onboarded} hint={`${summary.total - summary.onboarded} pending`} /></Card>
        <Card className="p-4"><Stat label="Started learning" value={summary.started} /></Card>
        <Card className="p-4"><Stat label="Avg. completion" value={`${summary.avg}%`} /></Card>
      </div>

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
