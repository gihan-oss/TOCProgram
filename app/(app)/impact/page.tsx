"use client";

import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { Card, CardHeader, Badge, Progress, Stat, TrafficDot, SectionTitle, EmptyHint } from "@/components/ui";
import { listAllIndicators } from "@/lib/pm-store";
import { progressPct, type ProgramIndicator } from "@/lib/pm-types";

type Traffic = "green" | "yellow" | "red";

function status(i: ProgramIndicator): Traffic {
  const pct = progressPct(i);
  return pct >= 80 ? "green" : pct >= 50 ? "yellow" : "red";
}

export default function ImpactPage() {
  const [all, setAll] = useState<ProgramIndicator[] | null>(null);

  useEffect(() => {
    listAllIndicators().then(setAll);
  }, []);

  // --- loading skeleton ---
  if (all === null) {
    return (
      <div>
        <SectionTitle sub="Output performance and outcome health at a glance">Impact Dashboard</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-card p-5"><div className="h-4 w-20 rounded bg-muted" /><div className="mt-2 h-8 w-12 rounded bg-muted" /></div>
          ))}
        </div>
      </div>
    );
  }

  // --- empty state ---
  if (all.length === 0) {
    return (
      <div>
        <SectionTitle sub="Output performance and outcome health at a glance">Impact Dashboard</SectionTitle>
        <EmptyHint>No indicators yet. Create indicators from a program&rsquo;s M&E tab or the Measurement page to populate the impact dashboard.</EmptyHint>
      </div>
    );
  }

  const outputs = all.filter((i) => i.level === "output");
  const outcomes = all.filter((i) => i.level === "outcome" || i.level === "goal");
  const counts: Record<Traffic, number> = { green: 0, yellow: 0, red: 0 };
  all.forEach((i) => counts[status(i)]++);

  return (
    <div>
      <SectionTitle sub="Output performance and outcome health at a glance">Impact Dashboard</SectionTitle>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="On track" value={counts.green} hint="Indicators ≥ 80% to target" tone="success" />
        <Stat label="Needs attention" value={counts.yellow} hint="50–79% to target" tone="warning" />
        <Stat label="Off track" value={counts.red} hint="Below 50% to target" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Output performance" subtitle="Baseline → current → target" />
          <div className="space-y-4 p-5">
            {outputs.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <Icons.BarChart3 className="mx-auto mb-2 h-6 w-6 opacity-40" />
                No output-level indicators yet.
              </p>
            )}
            {outputs.map((i) => {
              const pct = progressPct(i);
              const s = status(i);
              return (
                <div key={i.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><TrafficDot status={s} /> {i.name}</span>
                    <span className="tabular-nums text-muted-foreground">{i.current}{i.unit ?? ""} / {i.target}{i.unit ?? ""}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{i.baseline}{i.unit ?? ""}</span>
                    <Progress value={pct} tone={s === "green" ? "success" : "warning"} />
                    <span className="w-8 text-xs tabular-nums text-muted-foreground">{i.target}{i.unit ?? ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Outcome performance" subtitle="On track · at risk · off track" />
          <div className="divide-y">
            {outcomes.length === 0 && (
              <p className="px-5 py-4 text-center text-sm text-muted-foreground">
                <Icons.TrendingUp className="mx-auto mb-2 h-6 w-6 opacity-40" />
                No outcome or goal indicators yet.
              </p>
            )}
            {outcomes.map((i) => {
              const s = status(i);
              return (
                <div key={i.id} className="flex items-center gap-3 px-5 py-3.5">
                  <TrafficDot status={s} className="h-3 w-3" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.frequency ?? ""}{i.frequency && i.meansOfVerification ? " · " : ""}{i.meansOfVerification ?? ""}</p>
                  </div>
                  <Badge tone={s === "green" ? "success" : s === "yellow" ? "warning" : "muted"}>
                    {s === "green" ? "On track" : s === "yellow" ? "At risk" : "Off track"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm"><TrafficDot status="green" /> <span className="font-medium">On Track</span> — ≥ 80% to target</div>
          <div className="flex items-center gap-2 text-sm"><TrafficDot status="yellow" /> <span className="font-medium">Needs Attention</span> — 50–79%</div>
          <div className="flex items-center gap-2 text-sm"><TrafficDot status="red" /> <span className="font-medium">Off Track</span> — below 50%</div>
        </div>
      </Card>
    </div>
  );
}
