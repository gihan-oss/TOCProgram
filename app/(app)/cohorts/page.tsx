"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, Badge, Progress, SectionTitle, EmptyHint } from "@/components/ui";
import { loadCohortData, type CohortInfo, type ParticipantRow } from "@/lib/cohort-data";

export default function CohortsPage() {
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<CohortInfo[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    loadCohortData().then((data) => {
      setCohorts(data.cohorts);
      setParticipants(data.participants);
      if (data.cohorts.length > 0 && !active) setActive(data.cohorts[0].id);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCohort = useMemo(() => cohorts.find((c) => c.id === active), [cohorts, active]);
  const activeMembers = useMemo(
    () => participants.filter((p) => p.cohortId === active),
    [participants, active],
  );

  if (loading) {
    return (
      <div>
        <SectionTitle sub="Manage cohorts, monitor participation and review implementation readiness">Cohorts &amp; People</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-card p-5"><div className="h-4 w-24 rounded bg-muted" /><div className="mt-3 h-3 w-32 rounded bg-muted" /><div className="mt-4 space-y-2"><div className="h-3 w-full rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" /></div></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub="Manage cohorts, monitor participation and review implementation readiness">Cohorts &amp; People</SectionTitle>
        <span className="text-xs text-muted-foreground">
          Cohorts are groups of participants by organization. Invite members from Admin &rarr; People &amp; Access.
        </span>
      </div>

      {cohorts.length === 0 && (
        <EmptyHint>
          No participants are visible to your role. Administrators can invite members from{" "}
          <strong>People &amp; Access</strong>. Participants are grouped into cohorts by their organization.
        </EmptyHint>
      )}

      {cohorts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {cohorts.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className="text-left">
              <Card className={`h-full p-5 transition-shadow hover:shadow-md ${active === c.id ? "ring-2 ring-accent" : ""}`}>
                <div className="flex items-center justify-between">
                  <Badge tone="muted">{c.id === "unassigned" ? "No org" : c.id}</Badge>
                  <span className="text-xs text-muted-foreground">{c.activeCount} active of {c.participantCount} enrolled</span>
                </div>
                <h3 className="mt-2 font-semibold leading-snug">{c.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Facilitator: {c.facilitator}</p>
                <div className="mt-3 space-y-2">
                  {[
                    { label: "Avg. completion", val: c.avgCompletion },
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
      )}

      {activeCohort && activeMembers.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={`Participants — ${activeCohort.name}`} subtitle="Completion based on learning resources done" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Completion</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((p) => (
                  <tr key={p.email} className="border-b">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.org}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={p.completion} tone={p.completion >= 75 ? "success" : p.completion >= 50 ? "accent" : "warning"} />
                        <span className="w-12 text-right text-xs tabular-nums">{p.completion}%</span>
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
    </div>
  );
}
