"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Card, CardHeader, Badge, Progress, Stat, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/toast";
import { downloadFile } from "@/lib/utils";
import { PARTICIPANTS, COHORTS } from "@/lib/data";

type Scope = "Participant" | "Cohort" | "Organization" | "Leadership";

export default function ReportsPage() {
  const [scope, setScope] = useState<Scope>("Cohort");
  const toast = useToast();

  function exportReport() {
    let csv = "";
    if (scope === "Participant") {
      csv = "Participant,Completion,Implementation Score,Artifact Status\n" + PARTICIPANTS.map((p) => `${p.name},${p.completion}%,${p.implementationScore},${p.packageStatus}`).join("\n");
    } else if (scope === "Cohort") {
      csv = "Cohort,Participation,Assignment Completion,Implementation Readiness\n" + COHORTS.map((c) => `${c.name},${c.participationRate}%,${c.assignmentCompletion}%,${c.implementationReadiness}%`).join("\n");
    } else if (scope === "Organization") {
      csv = "Metric,Value\nImplementation rate,63%\nProgram maturity,68\nImpact readiness,On track";
    } else {
      csv = "Executive summary\nCohorts,3\nParticipants,57\nImplementation rate,63%\nLearning growth,+41%";
    }
    downloadFile(`${scope.toLowerCase()}-report.csv`, csv, "text/csv");
    toast(`${scope} report exported`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub="Generate reports across participant, cohort, organization and leadership scopes">Reporting</SectionTitle>
        <button onClick={exportReport} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">
          <Icons.Download className="h-4 w-4" /> Export report
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(["Participant", "Cohort", "Organization", "Leadership"] as Scope[]).map((s) => (
          <button key={s} onClick={() => setScope(s)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${scope === s ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-secondary"}`}>{s}</button>
        ))}
      </div>

      {scope === "Participant" && (
        <Card>
          <CardHeader title="Participant report" subtitle="Completion · implementation score · artifact status" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Participant</th><th className="px-4 py-3">Completion</th><th className="px-4 py-3">Impl. score</th><th className="px-4 py-3">Artifact status</th>
              </tr></thead>
              <tbody>
                {PARTICIPANTS.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{p.completion}%</td>
                    <td className="px-4 py-3">{p.implementationScore}</td>
                    <td className="px-4 py-3"><Badge tone={p.packageStatus === "Approved" ? "success" : p.packageStatus === "Submitted" ? "accent" : p.packageStatus === "In Progress" ? "warning" : "muted"}>{p.packageStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {scope === "Cohort" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {COHORTS.map((c) => (
            <Card key={c.id} className="p-5">
              <h3 className="font-semibold">{c.name}</h3>
              <div className="mt-3 space-y-2 text-sm">
                {[["Participation rate", c.participationRate], ["Assignment completion", c.assignmentCompletion], ["Implementation readiness", c.implementationReadiness]].map(([l, v]) => (
                  <div key={l as string}><div className="flex justify-between text-xs text-muted-foreground"><span>{l}</span><span>{v}%</span></div><Progress className="mt-1" value={v as number} tone={(v as number) >= 75 ? "success" : "accent"} /></div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {scope === "Organization" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Implementation rate" value="63%" hint="Org-wide artifact completion" tone="warning" />
          <Stat label="Program maturity" value="68" hint="Composite maturity index" />
          <Stat label="Impact readiness" value="On track" hint="Outcomes trending to target" tone="success" />
        </div>
      )}

      {scope === "Leadership" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Executive summary</h3>
          <p className="mt-2 text-sm text-muted-foreground">Across 3 active cohorts and 57 participants, the organization is converting learning into implementation at a 63% rate, with average knowledge growth of +41%. One cohort (Health) is below the readiness target and one assumption has failed, triggering a revision workflow.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[["Cohorts", "3"], ["Participants", "57"], ["Impl. rate", "63%"], ["Learning growth", "+41%"]].map(([l, v]) => (
              <div key={l} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold">{v}</p></div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
