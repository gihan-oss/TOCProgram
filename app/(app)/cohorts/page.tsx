"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Card, CardHeader, Badge, Progress, SectionTitle } from "@/components/ui";
import { COHORTS, PARTICIPANTS } from "@/lib/data";

export default function CohortsPage() {
  const [active, setActive] = useState(COHORTS[0].id);
  const members = PARTICIPANTS.filter((p) => p.cohort === active);
  const cohort = COHORTS.find((c) => c.id === active)!;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub="Manage cohorts, monitor participation and review implementation readiness">Cohorts &amp; People</SectionTitle>
        <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Icons.Plus className="h-4 w-4" /> New cohort
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COHORTS.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)} className="text-left">
            <Card className={`h-full p-5 transition-shadow hover:shadow-md ${active === c.id ? "ring-2 ring-accent" : ""}`}>
              <div className="flex items-center justify-between">
                <Badge tone="muted">{c.program}</Badge>
                <span className="text-xs text-muted-foreground">{c.participants} people</span>
              </div>
              <h3 className="mt-2 font-semibold leading-snug">{c.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Facilitator: {c.facilitator} · starts {c.startDate}</p>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Participation", val: c.participationRate },
                  { label: "Assignments", val: c.assignmentCompletion },
                  { label: "Implementation readiness", val: c.implementationReadiness },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{m.label}</span><span>{m.val}%</span></div>
                    <Progress className="mt-1" value={m.val} tone={m.val >= 75 ? "success" : m.val >= 50 ? "accent" : "warning"} />
                  </div>
                ))}
              </div>
            </Card>
          </button>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title={`Participants — ${cohort.name}`} subtitle="Completion, implementation score and artifact status" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Completion</th>
                <th className="px-4 py-3">Impl. score</th>
                <th className="px-4 py-3">Growth</th>
                <th className="px-4 py-3">Package</th>
              </tr>
            </thead>
            <tbody>
              {members.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.org}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Progress value={p.completion} /><span className="w-9 text-right text-xs tabular-nums">{p.completion}%</span></div></td>
                  <td className="px-4 py-3 tabular-nums">{p.implementationScore}</td>
                  <td className="px-4 py-3 text-[hsl(var(--success))]">{p.postScore ? `+${p.postScore - p.preScore}` : "—"}</td>
                  <td className="px-4 py-3"><Badge tone={p.packageStatus === "Approved" ? "success" : p.packageStatus === "Submitted" ? "accent" : p.packageStatus === "In Progress" ? "warning" : "muted"}>{p.packageStatus}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
