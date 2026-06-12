"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, Stat, Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import {
  PROGRAMS, PROGRAM_SUMMARY, DECISION_TOTALS, QUESTION_ZERO, AREAS_OF_FOCUS,
  type Program, type Decision, type ProgramStatus,
} from "@/lib/mas";

const decisionTone: Record<Decision, "success" | "warning" | "danger"> = { Keep: "success", Modify: "warning", Cancel: "danger" };
const statusTone: Record<ProgramStatus, "success" | "accent" | "warning" | "muted"> = {
  "On Track": "success", Completed: "accent", "At Risk": "warning", "Not Started": "muted",
};

export default function ProgramsPage() {
  const [area, setArea] = useState<string | "All">("All");
  const [programs] = useState<Program[]>(PROGRAMS);
  const toast = useToast();

  const activeAreas = useMemo(() => {
    const names = Array.from(new Set(programs.map((p) => p.area)));
    return AREAS_OF_FOCUS.map((a) => a.name).filter((n) => names.includes(n));
  }, [programs]);

  const shown = area === "All" ? programs : programs.filter((p) => p.area === area);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Programs — Theory of Change Dashboard</h1>
          <p className="text-sm text-muted-foreground">Every program connects to Question Zero, a target audience (Input), a desired Outcome and a Keep / Modify / Cancel decision.</p>
        </div>
        <Button size="sm" onClick={() => toast("Add/Edit Program — connect Supabase to persist", "info")}>
          <Icons.Plus className="h-4 w-4" /> Add / Edit Program
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Programs" value={PROGRAM_SUMMARY.total} hint="Across all Areas of Focus" />
        <Stat label="On Track" value={PROGRAM_SUMMARY.onTrack} hint="Currently progressing" tone="warning" />
        <Stat label="Completed" value={PROGRAM_SUMMARY.completed} hint="Delivered" tone="success" />
        <Stat label="Total Budget" value={`$${PROGRAM_SUMMARY.budget.toLocaleString()}`} hint="Across all programs" />
      </div>

      {/* Question Zero flow */}
      <Card className="mt-6 p-5">
        <p className="mb-3 text-sm font-semibold">Question Zero — every program must answer:</p>
        <div className="flex flex-wrap items-center gap-2">
          {QUESTION_ZERO.map((q, i) => (
            <div key={q.step} className="flex items-center gap-2">
              <div className="rounded-xl border bg-secondary/60 px-3 py-2">
                <p className="text-sm font-bold">{q.step}</p>
                <p className="max-w-[180px] text-[11px] text-muted-foreground">{q.desc}</p>
              </div>
              {i < QUESTION_ZERO.length - 1 && <Icons.ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Decision status (Keep / Modify / Cancel) */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {(Object.entries(DECISION_TOTALS) as [Decision, number][]).map(([d, n]) => (
          <Card key={d} className="flex items-center gap-3 p-4">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--${decisionTone[d] === "success" ? "success" : decisionTone[d] === "warning" ? "warning" : "danger"})/0.15)]`}>
              {d === "Keep" ? <Icons.Check className="h-5 w-5 text-[hsl(var(--success))]" /> : d === "Modify" ? <Icons.PencilLine className="h-5 w-5 text-[hsl(var(--warning))]" /> : <Icons.X className="h-5 w-5 text-[hsl(var(--danger))]" />}
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums">{n}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["All", ...activeAreas]).map((a) => (
          <button key={a} onClick={() => setArea(a)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${area === a ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>{a}</button>
        ))}
      </div>

      {/* Program board grouped by Area of Focus */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {(area === "All" ? activeAreas : [area]).map((a) => {
          const items = programs.filter((p) => p.area === a);
          return (
            <Card key={a} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{a}</h3>
                <Badge tone="muted">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((p) => (
                  <div key={p.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <Badge tone={decisionTone[p.decision]}>{p.decision}</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">Input (who):</span> {p.input}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Baseline (output):</span> {p.baseline}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone="accent">Change: {p.outcome}</Badge>
                      <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                      <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">${p.budget.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
