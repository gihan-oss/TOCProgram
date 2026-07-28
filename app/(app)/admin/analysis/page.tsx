"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Button, Badge, EmptyHint } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { useToast } from "@/components/toast";
import { Markdown } from "@/components/markdown";
import { listMembers, listProfiles, listLearnerProgress, isSupabaseConfigured } from "@/lib/store";
import { loadModules, type CourseModule, type LearnerMeta } from "@/lib/content";
import { effectiveModules } from "@/lib/starter-course";
import {
  compileGroup, buildAnalysisPayload, printGroupAnalysis,
  type PersonRow, type GroupWorksheet,
} from "@/lib/worksheet-report";

export default function GroupAnalysisPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canView = user?.role === "admin" || user?.role === "facilitator" || user?.role === "coordinator";
  const configured = isSupabaseConfigured();

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openWs, setOpenWs] = useState<Set<string>>(new Set());

  const [synthesis, setSynthesis] = useState<string>("");
  const [demo, setDemo] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!canView) { setLoaded(true); return; }
    (async () => {
      const [mods, members, profiles, progress] = await Promise.all([
        loadModules(), listMembers(), listProfiles(), listLearnerProgress(),
      ]);
      setModules(effectiveModules(mods));

      // email -> best display name
      const names: Record<string, string> = {};
      members.forEach((m) => { if (m.name) names[m.email.toLowerCase()] = m.name; });
      profiles.forEach((p) => { if (p.name) names[p.email.toLowerCase()] = p.name; });

      const staff = new Set(members.filter((m) => m.role === "admin").map((m) => m.email.toLowerCase()));
      const list: PersonRow[] = progress
        .filter((p) => !staff.has(p.email.toLowerCase()))
        .map((p) => {
          const meta: LearnerMeta = p.meta ?? { scores: {}, worksheets: {} };
          const email = p.email.toLowerCase();
          return { email, name: names[email] || email.split("@")[0], worksheets: meta.worksheets ?? {} };
        });
      setRows(list);
      setLoaded(true);
    })();
  }, [canView, user?.email]);

  const group = useMemo<GroupWorksheet[]>(() => compileGroup(modules, rows), [modules, rows]);

  const stats = useMemo(() => {
    const responded = rows.filter((r) => Object.values(r.worksheets).some((ws) => Object.values(ws).some((v) => (v ?? "").trim()))).length;
    const answers = group.reduce((s, w) => s + w.prompts.reduce((t, p) => t + p.answers.length, 0), 0);
    const worksheetsCovered = group.filter((w) => w.prompts.some((p) => p.answers.length > 0)).length;
    return { participants: rows.length, responded, answers, worksheetsCovered };
  }, [rows, group]);

  const hasAnswers = stats.answers > 0;

  async function runAnalysis() {
    setRunning(true);
    try {
      const payload = buildAnalysisPayload(group, stats.participants);
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; reply?: string; demo?: boolean; error?: string };
      if (data.ok) {
        setSynthesis(data.reply ?? "");
        setDemo(!!data.demo);
      } else {
        toast(data.error ?? "Couldn't generate the analysis", "error");
      }
    } catch {
      toast("Couldn't reach the analysis service", "error");
    } finally {
      setRunning(false);
    }
  }

  function print() {
    const ok = printGroupAnalysis(
      group,
      { participants: stats.participants, responded: stats.responded, synthesis: synthesis || undefined },
      () => toast("Allow pop-ups to print the analysis", "error"),
    );
    if (!ok) return;
  }

  if (!canView) {
    return <div className="mx-auto max-w-2xl"><EmptyHint>Group analysis is for facilitators, coordinators and admins.</EmptyHint></div>;
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icons.ChartColumnBig className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight">Group Analysis</h1>
        </div>
        {hasAnswers && (
          <Button size="sm" variant="outline" onClick={print}><Icons.Printer className="h-4 w-4" /> Print / PDF</Button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        An AI read of the patterns across the whole cohort — with the raw answers a click away.
      </p>

      {!configured && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.08)] px-3 py-2 text-xs">
          <Icons.Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" />
          <span>Cross-participant data needs Supabase connected. Until then this shows only what&apos;s saved on this browser.</span>
        </div>
      )}

      {/* Compact stat strip */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border bg-card px-4 py-2.5 text-sm">
        <span><b className="tabular-nums">{stats.responded}</b><span className="text-muted-foreground">/{stats.participants} responded</span></span>
        <span className="h-3.5 w-px bg-border" />
        <span><b className="tabular-nums">{stats.answers}</b> <span className="text-muted-foreground">answers</span></span>
        <span className="h-3.5 w-px bg-border" />
        <span><b className="tabular-nums">{stats.worksheetsCovered}</b> <span className="text-muted-foreground">worksheets</span></span>
      </div>

      {/* AI analysis — the hero */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gradient-to-r from-accent/10 to-transparent px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Icons.Sparkles className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold">AI group analysis</p>
            {demo && <Badge tone="warning">Demo</Badge>}
          </div>
          <Button size="sm" onClick={runAnalysis} disabled={running || !hasAnswers}>
            {running ? <><Icons.Loader2 className="h-4 w-4 animate-spin" /> Analysing…</> : <><Icons.Sparkles className="h-4 w-4" /> {synthesis ? "Regenerate" : "Generate"}</>}
          </Button>
        </div>
        <div className="px-4 py-3">
          {!hasAnswers ? (
            <p className="text-sm text-muted-foreground">No answers yet — once participants fill their worksheets in, generate a synthesis of the group&apos;s patterns.</p>
          ) : synthesis ? (
            <Markdown content={synthesis} />
          ) : (
            <p className="text-sm text-muted-foreground">
              One click reads every answer and writes where the group is strong, the common gaps, assumptions to pressure-test, and what to focus on next session.
            </p>
          )}
        </div>
      </Card>

      {/* Compiled answers — collapsed by default so the page stays short */}
      {!loaded ? (
        <div className="flex h-24 items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : !hasAnswers ? null : (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">The raw answers</p>
          <div className="overflow-hidden rounded-xl border">
            {group.map((w) => {
              const answered = w.prompts.filter((p) => p.answers.length > 0);
              const wsAnswers = answered.reduce((s, p) => s + p.answers.length, 0);
              if (wsAnswers === 0) return null;
              const isOpen = openWs.has(w.worksheetId);
              return (
                <div key={w.worksheetId} className="border-b last:border-0">
                  <button
                    onClick={() => setOpenWs((prev) => { const n = new Set(prev); n.has(w.worksheetId) ? n.delete(w.worksheetId) : n.add(w.worksheetId); return n; })}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/40"
                  >
                    <Icons.ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{w.worksheetTitle}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">M{w.moduleIndex + 1}</span>
                    <Badge tone="accent">{wsAnswers}</Badge>
                  </button>
                  {isOpen && (
                    <div className="divide-y border-t bg-secondary/10">
                      {answered.map((p) => (
                        <div key={p.fieldId} className="px-4 py-2.5">
                          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{p.label} <span className="font-normal">· {p.answers.length}</span></p>
                          <div className="space-y-1">
                            {p.answers.map((a, i) => (
                              <p key={i} className="text-sm leading-snug">
                                <span className="font-semibold text-accent">{a.name}:</span>{" "}
                                <span className="whitespace-pre-wrap text-foreground/90">{a.value}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-5 text-xs text-muted-foreground">
        Per-person worksheet packets print from <Link href="/admin/learners" className="text-accent hover:underline">Learner Tracking</Link>.
      </p>
    </div>
  );
}
