"use client";

import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { Card, CardHeader, Progress, Stat, SectionTitle, EmptyHint } from "@/components/ui";
import { useToast } from "@/components/toast";
import { downloadFile } from "@/lib/utils";
import { loadCohortData, type ParticipantRow, type CohortInfo } from "@/lib/cohort-data";
import { listAllIndicators } from "@/lib/pm-store";
import { progressPct } from "@/lib/pm-types";
import type { ProgramIndicator } from "@/lib/pm-types";
import { loadPrograms } from "@/lib/programs-store";

type Scope = "Participant" | "Cohort" | "Organization" | "Leadership";

function escapeCsv(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

export default function ReportsPage() {
  const [scope, setScope] = useState<Scope>("Cohort");
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortInfo[]>([]);
  const [totalResources, setTotalResources] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [indicators, setIndicators] = useState<ProgramIndicator[]>([]);
  const [programCount, setProgramCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const [cohortData, allIndicators, programs] = await Promise.all([
        loadCohortData(),
        listAllIndicators(),
        loadPrograms(),
      ]);
      setTotalResources(cohortData.totalResources);
      setParticipants(cohortData.participants);
      setCohorts(cohortData.cohorts);
      setActiveCount(cohortData.activeParticipantCount);
      setIndicators(allIndicators);
      setProgramCount(programs.length);
      setLoading(false);
    })();
  }, []);

  // ---- CSV export ----
  function exportReport() {
    let csv = "";
    if (scope === "Participant") {
      csv = "Participant,Organization,Completion (%),Done,Total\n"
        + participants.map((p) => `${escapeCsv(p.name)},${escapeCsv(p.org)},${p.completion},${p.done},${p.total}`).join("\n");
    } else if (scope === "Cohort") {
      csv = "Cohort,Enrolled,Active,Avg Completion (%)\n"
        + cohorts.map((c) => `${escapeCsv(c.name)},${c.participantCount},${c.activeCount},${c.avgCompletion}`).join("\n");
    } else if (scope === "Organization") {
      const atRisk = indicators.filter((ind) => {
        const pct = progressPct(ind);
        return pct < 50;
      }).length;
      csv = "Metric,Value\n"
        + `Total programs,${programCount}\n`
        + `Total participants,${participants.length}\n`
        + `Active participants,${activeCount}\n`
        + `Total indicators,${indicators.length}\n`
        + `Indicators at risk (<50%),${atRisk}\n`
        + `Avg completion (active),${cohorts.length > 0 ? Math.round(cohorts.reduce((s, c) => s + c.avgCompletion, 0) / cohorts.length) : 0}%`;
    } else {
      const avgComp = cohorts.length > 0
        ? Math.round(cohorts.reduce((s, c) => s + c.avgCompletion, 0) / cohorts.length)
        : 0;
      csv = "Executive Summary\n"
        + `Cohorts,${cohorts.length}\n`
        + `Participants (total),${participants.length}\n`
        + `Participants (active),${activeCount}\n`
        + `Programs,${programCount}\n`
        + `Indicators,${indicators.length}\n`
        + `Avg completion (active),${avgComp}%`;
    }
    downloadFile(`${scope.toLowerCase()}-report.csv`, csv, "text/csv");
    toast(`${scope} report exported`);
  }

  // ---- derived ----
  const indicatorCount = indicators.length;

  if (loading) {
    return (
      <div>
        <SectionTitle sub="Generate reports across participant, cohort, organization and leadership scopes">Reporting</SectionTitle>
        <div className="animate-pulse space-y-3"><div className="h-8 w-48 rounded bg-muted" /><div className="h-64 rounded-2xl bg-muted/60" /></div>
      </div>
    );
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
        <>
          {participants.length === 0 ? (
            <EmptyHint>No participants are visible to your role. Administrators can invite members to populate this report.</EmptyHint>
          ) : (
            <Card>
              <CardHeader title="Participant report" subtitle={`${participants.length} participants · completion based on ${totalResources} learning resources`} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead><tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Participant</th><th className="px-4 py-3">Organization</th><th className="px-4 py-3">Completion</th>
                  </tr></thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.org}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={p.completion} tone={p.completion >= 75 ? "success" : p.completion >= 50 ? "accent" : "warning"} />
                            <span className="w-10 text-right text-xs tabular-nums">{p.completion}%</span>
                            <span className="text-xs text-muted-foreground">({p.done}/{p.total})</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {scope === "Cohort" && (
        <>
          {cohorts.length === 0 ? (
            <EmptyHint>No cohorts are visible to your role. Cohorts are formed by grouping participants by organization.</EmptyHint>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {cohorts.map((c) => (
                <Card key={c.name} className="p-5">
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.activeCount} active of {c.participantCount} enrolled</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {[["Avg completion", c.avgCompletion]].map(([l, v]) => (
                      <div key={l as string}>
                        <div className="flex justify-between text-xs text-muted-foreground"><span>{l}</span><span>{v}%</span></div>
                        <Progress className="mt-1" value={v as number} tone={(v as number) >= 75 ? "success" : "accent"} />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {scope === "Organization" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total programs" value={programCount} hint="Active programs" />
          <Stat label="Active participants" value={`${activeCount} of ${participants.length}`} hint={`Across ${cohorts.length} cohorts`} />
          <Stat label="Indicators" value={indicatorCount} hint="Across all programs" />
        </div>
      )}

      {scope === "Leadership" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Executive summary</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Across {cohorts.length} cohorts and {participants.length} participants ({activeCount} active),
            there are {programCount} active programs with {indicatorCount} indicators tracking outcomes.
            Average completion among active participants
            is {cohorts.length > 0 ? Math.round(cohorts.reduce((s, c) => s + c.avgCompletion, 0) / cohorts.length) : 0}%.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["Cohorts", cohorts.length],
              ["Active", activeCount],
              ["Programs", programCount],
              ["Indicators", indicatorCount],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold">{v}</p></div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
