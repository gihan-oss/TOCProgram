"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Button, Badge, Stat, EmptyHint } from "@/components/ui";
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
  const [hideEmpty, setHideEmpty] = useState(true);

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
        Every participant&apos;s worksheet answers, compiled by prompt — plus an AI synthesis of the patterns across the whole cohort.
      </p>

      {!configured && (
        <Card className="mb-4 flex items-start gap-2 border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.08)] p-3 text-sm">
          <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <span>Cross-participant data needs Supabase connected. Until then this shows only what&apos;s saved on this browser.</span>
        </Card>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Participants" value={stats.participants} /></Card>
        <Card className="p-4"><Stat label="Responded" value={stats.responded} hint={`${stats.participants - stats.responded} not yet`} /></Card>
        <Card className="p-4"><Stat label="Total answers" value={stats.answers} /></Card>
        <Card className="p-4"><Stat label="Worksheets covered" value={stats.worksheetsCovered} /></Card>
      </div>

      {/* AI synthesis */}
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icons.Sparkles className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold">AI group analysis</p>
            {demo && <Badge tone="warning">Demo — API key not set</Badge>}
          </div>
          <Button size="sm" onClick={runAnalysis} disabled={running || !hasAnswers}>
            {running ? <><Icons.Loader2 className="h-4 w-4 animate-spin" /> Analysing…</> : <><Icons.Sparkles className="h-4 w-4" /> {synthesis ? "Regenerate" : "Generate analysis"}</>}
          </Button>
        </div>
        {!hasAnswers ? (
          <p className="mt-3 text-sm text-muted-foreground">No worksheet answers yet — once participants start filling theirs in, generate a synthesis of the group&apos;s patterns.</p>
        ) : synthesis ? (
          <div className="mt-3 rounded-xl border bg-secondary/20 px-4 py-3">
            <Markdown content={synthesis} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Reads every participant&apos;s answers and writes where the group is strong, common gaps, assumptions to pressure-test, and what to focus on next session.
          </p>
        )}
      </Card>

      {/* Compiled answers */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Answers by prompt</p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="h-3.5 w-3.5" />
          Hide prompts with no answers
        </label>
      </div>

      {!loaded ? (
        <div className="flex h-40 items-center justify-center"><Icons.Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : !hasAnswers ? (
        <EmptyHint>No worksheet responses yet. As participants fill in their worksheets, their answers show up here grouped by prompt.</EmptyHint>
      ) : (
        <div className="space-y-4">
          {group.map((w) => {
            const prompts = w.prompts.filter((p) => !hideEmpty || p.answers.length > 0);
            if (prompts.length === 0) return null;
            const wsAnswers = w.prompts.reduce((s, p) => s + p.answers.length, 0);
            if (wsAnswers === 0) return null;
            return (
              <Card key={w.worksheetId} className="overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b bg-secondary/40 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{w.worksheetTitle}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Module {w.moduleIndex + 1}</p>
                  </div>
                  <Badge tone="accent">{wsAnswers} {wsAnswers === 1 ? "answer" : "answers"}</Badge>
                </div>
                <div className="divide-y">
                  {prompts.map((p) => (
                    <div key={p.fieldId} className="px-4 py-3">
                      <p className="mb-2 text-sm font-medium">
                        {p.label}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{p.answers.length}</span>
                      </p>
                      {p.answers.length === 0 ? (
                        <p className="text-xs italic text-muted-foreground/70">No answers yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {p.answers.map((a, i) => (
                            <div key={i} className="rounded-lg border bg-card px-3 py-2 text-sm">
                              <span className="font-semibold text-accent">{a.name}</span>
                              <span className="mx-1.5 text-muted-foreground">·</span>
                              <span className="whitespace-pre-wrap">{a.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-xs text-muted-foreground">
        Per-person worksheet packets print from <Link href="/admin/learners" className="text-accent hover:underline">Learner Tracking</Link>.
      </p>
    </div>
  );
}
