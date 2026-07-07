"use client";

import { Card, CardHeader, Badge, Progress, Stat, TrafficDot, SectionTitle } from "@/components/ui";
import { INDICATORS } from "@/lib/data";
import type { Indicator } from "@/lib/types";

function status(i: Indicator): "green" | "yellow" | "red" {
  const prog = i.target === i.baseline ? 100 : ((i.current - i.baseline) / (i.target - i.baseline)) * 100;
  return prog >= 80 ? "green" : prog >= 50 ? "yellow" : "red";
}
function progressOf(i: Indicator) {
  return i.target === i.baseline ? 100 : Math.round(((i.current - i.baseline) / (i.target - i.baseline)) * 100);
}

export default function ImpactPage() {
  const outputs = INDICATORS.filter((i) => i.level === "output");
  const outcomes = INDICATORS.filter((i) => i.level === "outcome" || i.level === "goal");
  const counts = { green: 0, yellow: 0, red: 0 };
  INDICATORS.forEach((i) => counts[status(i)]++);

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
            {outputs.map((i) => (
              <div key={i.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><TrafficDot status={status(i)} /> {i.name}</span>
                  <span className="tabular-nums text-muted-foreground">{i.current}{i.unit} / {i.target}{i.unit}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{i.baseline}{i.unit}</span>
                  <Progress value={progressOf(i)} tone={status(i) === "green" ? "success" : "warning"} />
                  <span className="w-8 text-xs tabular-nums text-muted-foreground">{i.target}{i.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Outcome performance" subtitle="On track · at risk · off track" />
          <div className="divide-y">
            {outcomes.map((i) => {
              const s = status(i);
              return (
                <div key={i.id} className="flex items-center gap-3 px-5 py-3.5">
                  <TrafficDot status={s} className="h-3 w-3" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.frequency} · {i.meansOfVerification}</p>
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
