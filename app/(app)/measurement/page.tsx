"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, Progress, SectionTitle } from "@/components/ui";
import { INDICATORS } from "@/lib/data";
import type { Indicator } from "@/lib/types";

function progressOf(i: Indicator) {
  if (i.target === i.baseline) return 100;
  return Math.round(((i.current - i.baseline) / (i.target - i.baseline)) * 100);
}

export default function MeasurementPage() {
  const [indicators, setIndicators] = useState<Indicator[]>(INDICATORS);
  const [editing, setEditing] = useState<string | null>(null);

  function update(id: string, current: number) {
    setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, current } : i)));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Measurement Plan Builder</h1>
          <p className="text-sm text-muted-foreground">SMART indicators with baselines, targets, frequency and means of verification — quantitative & qualitative</p>
        </div>
        <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Icons.Plus className="h-4 w-4" /> Add indicator
        </button>
      </div>

      <div className="grid gap-4">
        {indicators.map((ind) => {
          const prog = progressOf(ind);
          const tone = prog >= 80 ? "success" : prog >= 50 ? "warning" : "danger";
          const open = editing === ind.id;
          return (
            <Card key={ind.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{ind.name}</h3>
                    <Badge tone={ind.type === "Quantitative" ? "accent" : "muted"}>{ind.type}</Badge>
                    <Badge tone="muted" className="capitalize">{ind.level}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Icons.FileCheck className="mr-1 inline h-3.5 w-3.5" />MoV: {ind.meansOfVerification} · {ind.frequency} · target {ind.targetDate}
                  </p>
                </div>
                <button onClick={() => setEditing(open ? null : ind.id)} className="rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                  {open ? "Done" : "Update value"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Baseline</p>
                  <p className="text-lg font-semibold tabular-nums">{ind.baseline}{ind.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current</p>
                  {open ? (
                    <input
                      type="number"
                      value={ind.current}
                      onChange={(e) => update(ind.id, Number(e.target.value))}
                      className="mx-auto mt-0.5 w-20 rounded-md border bg-background px-2 py-1 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <p className={`text-lg font-semibold tabular-nums text-[hsl(var(--${tone}))]`}>{ind.current}{ind.unit}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-lg font-semibold tabular-nums">{ind.target}{ind.unit}</p>
                </div>
              </div>

              <div className="mt-3">
                <Progress value={prog} tone={tone} />
                <p className="mt-1 text-right text-xs text-muted-foreground">{prog}% to target</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
