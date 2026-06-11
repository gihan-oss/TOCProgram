"use client";

import * as Icons from "lucide-react";
import { Card, CardHeader, Badge, Progress, SectionTitle } from "@/components/ui";
import { PACKAGE_ITEMS, PARTICIPANTS, implementationMaturityScore } from "@/lib/data";

function Gauge({ score }: { score: number }) {
  const tone = score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--danger)";
  const r = 70;
  const circ = Math.PI * r; // half circle
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative flex flex-col items-center">
      <svg width="180" height="110" viewBox="0 0 180 110">
        <path d="M 20 100 A 70 70 0 0 1 160 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 70 70 0 0 1 160 100"
          fill="none"
          stroke={`hsl(${tone})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="-mt-12 text-center">
        <p className="text-4xl font-bold tabular-nums" style={{ color: `hsl(${tone})` }}>{score}</p>
        <p className="text-xs text-muted-foreground">Maturity score · 0–100</p>
      </div>
    </div>
  );
}

export default function ImplementationPage() {
  const score = implementationMaturityScore();
  const completed = PACKAGE_ITEMS.filter((p) => p.status === "Approved" || p.status === "Submitted").length;

  return (
    <div>
      <SectionTitle sub="Tracks completion of the implementation artifacts — not content consumption">Implementation Dashboard</SectionTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-6">
          <Gauge score={score} />
          <p className="mt-3 text-center text-sm text-muted-foreground">{completed}/{PACKAGE_ITEMS.length} artifacts submitted or approved</p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Artifact completion" subtitle="Q-Zero · Causal Chain · TOC · Logframe · Measurement Plan" />
          <div className="divide-y">
            {PACKAGE_ITEMS.map((p) => (
              <div key={p.key} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.status === "Approved" ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : p.status === "Submitted" ? "bg-accent/15 text-accent" : p.status === "In Progress" ? "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" : "bg-muted text-muted-foreground"}`}>
                  {p.status === "Approved" ? <Icons.CheckCheck className="h-4 w-4" /> : p.status === "Submitted" ? <Icons.Check className="h-4 w-4" /> : p.status === "In Progress" ? <Icons.Loader className="h-4 w-4" /> : <Icons.Circle className="h-4 w-4" />}
                </div>
                <div className="w-44 shrink-0">
                  <p className="text-sm font-medium">{p.label}</p>
                  <Badge tone={p.status === "Approved" ? "success" : p.status === "Submitted" ? "accent" : p.status === "In Progress" ? "warning" : "muted"}>{p.status}</Badge>
                </div>
                <Progress value={p.completeness} tone={p.completeness >= 80 ? "success" : p.completeness >= 50 ? "accent" : "warning"} />
                <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{p.completeness}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Cohort implementation scores" subtitle="Implementation maturity across participants" />
        <div className="divide-y">
          {PARTICIPANTS.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-40 truncate text-sm font-medium">{p.name}</div>
              <div className="hidden w-32 text-xs text-muted-foreground sm:block">{p.org}</div>
              <Progress value={p.implementationScore} tone={p.implementationScore >= 70 ? "success" : p.implementationScore >= 40 ? "warning" : "danger"} />
              <span className="w-10 text-right text-sm tabular-nums">{p.implementationScore}</span>
              <Badge tone={p.packageStatus === "Approved" ? "success" : p.packageStatus === "Submitted" ? "accent" : p.packageStatus === "In Progress" ? "warning" : "muted"}>{p.packageStatus}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
