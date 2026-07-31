"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { useApp } from "@/components/providers";
import { useAuth } from "@/components/auth";
import { Card, CardHeader, Badge, Progress, Stat, TrafficDot, SectionTitle } from "@/components/ui";
import { listLearnerProgress } from "@/lib/store";
import { loadModules } from "@/lib/content";
import type { CourseModule } from "@/lib/content";
import { listAllIndicators } from "@/lib/pm-store";
import { progressPct, type ProgramIndicator as PInd } from "@/lib/pm-types";
import { loadPrograms } from "@/lib/programs-store";
import type { Program } from "@/lib/mas";
import { listAssumptions } from "@/lib/assumptions-store";
import { loadCohortData, type CohortInfo } from "@/lib/cohort-data";
import { PACKAGE_ITEMS, implementationMaturityScore, ROLES } from "@/lib/data";

// ---- helpers ----------------------------------------------------------------
function indicatorStatus(ind: PInd): "green" | "yellow" | "red" {
  const pct = progressPct(ind);
  return pct >= 80 ? "green" : pct >= 50 ? "yellow" : "red";
}

export default function Dashboard() {
  const { role } = useApp();
  const { user } = useAuth();
  const email = user?.email ?? "";

  const [loading, setLoading] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [activeParticipantCount, setActiveParticipantCount] = useState(0);
  const [cohorts, setCohorts] = useState<CohortInfo[]>([]);
  const [indicators, setIndicators] = useState<PInd[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [userAssumptions, setUserAssumptions] = useState(0);
  const [userDoneSet, setUserDoneSet] = useState<Set<string>>(new Set());
  const [userTotal, setUserTotal] = useState(0);
  const [modules, setModules] = useState<CourseModule[]>([]);

  const maturity = implementationMaturityScore();
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;

  useEffect(() => {
    (async () => {
      const [allIndicators, progs, modulesData, cohortData, progressRows] = await Promise.all([
        listAllIndicators(),
        loadPrograms(),
        loadModules(),
        loadCohortData(),
        listLearnerProgress(),
      ]);
      setIndicators(allIndicators);
      setPrograms(progs);
      setModules(modulesData);
      setCohorts(cohortData.cohorts);
      setParticipantCount(cohortData.participantCount);
      setActiveParticipantCount(cohortData.activeParticipantCount);
      setUserTotal(cohortData.totalResources);

      // User's own progress
      if (email) {
        const userProgress = progressRows.find((r) => r.email.toLowerCase() === email.toLowerCase());
        setUserDoneSet(new Set(userProgress?.done ?? []));
        const assumptions = await listAssumptions(email);
        setUserAssumptions(assumptions.filter((a) => a.status !== "Valid").length);
      }

      setLoading(false);
    })();
  }, [email]);

  // derived
  const avgCompletion = activeParticipantCount > 0
    ? Math.round(cohorts.reduce((s, c) => s + c.avgCompletion, 0) / (cohorts.length || 1))
    : 0;
  const programsAtRisk = useMemo(() => {
    const riskSet = new Set<string>();
    for (const ind of indicators) {
      if (indicatorStatus(ind) === "red" && ind.programId) riskSet.add(ind.programId);
    }
    return riskSet.size;
  }, [indicators]);
  const outcomes = useMemo(() => indicators.filter((i) => i.level === "outcome" || i.level === "goal"), [indicators]);

  // --- loading skeleton ---
  if (loading) {
    return (
      <div>
        <SectionTitle sub="Loading dashboard…">Dashboard</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-card p-5"><div className="h-4 w-16 rounded bg-muted" /><div className="mt-2 h-8 w-12 rounded bg-muted" /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle sub={`Signed in as ${roleLabel} · Amal & Company Foundation`}>
        {role === "executive" ? "Portfolio Overview" : role === "participant" ? "My Implementation Journey" : "Program Overview"}
      </SectionTitle>

      {/* ---- Top stats ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {role === "participant" ? (
          <>
            <Stat label="Modules completed" value={userTotal > 0 ? `${userDoneSet.size}/${userTotal}` : "—"} hint="Learning resources done" />
            <Stat label="Implementation maturity" value={`${maturity}`} hint="0–100 scale · artifact-based" tone={maturity >= 70 ? "success" : "warning"} />
            <Stat label="Learning growth" value="—" hint="Pre/post scores not yet tracked" />
            <Stat label="Open assumptions" value={userAssumptions} hint="Needs validation" tone={userAssumptions > 0 ? "warning" : undefined} />
          </>
        ) : role === "executive" ? (
          <>
            <Stat label="Active programs" value={programs.length} hint={`${activeParticipantCount} active of ${participantCount} participants`} />
            <Stat label="Programs at risk" value={programsAtRisk} hint="Indicators below 50% target" tone={programsAtRisk > 0 ? "warning" : "success"} />
            <Stat label="Avg completion" value={`${avgCompletion}%`} hint="Active participants only" tone={avgCompletion >= 70 ? "success" : "warning"} />
            <Stat label="Active cohorts" value={cohorts.length} hint="Grouped by organization" />
          </>
        ) : (
          <>
            <Stat label="Active cohorts" value={cohorts.length} hint={`${activeParticipantCount} active of ${participantCount} total`} />
            <Stat label="Avg completion" value={`${avgCompletion}%`} hint="Active participants only" tone={avgCompletion >= 70 ? "success" : "warning"} />
            <Stat label="Programs" value={programs.length} hint={`${programsAtRisk} at risk`} tone={programsAtRisk > 0 ? "warning" : undefined} />
            <Stat label="Implementation maturity" value={`${maturity}`} hint="Artifact-based estimate" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Implementation pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Implementation pipeline"
            subtitle="Measured by artifacts, not attendance"
            action={<Link href="/package" className="text-sm font-medium text-accent hover:underline">View package →</Link>}
          />
          <div className="divide-y">
            {PACKAGE_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-48 shrink-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge tone={item.status === "Approved" ? "success" : item.status === "Submitted" ? "accent" : item.status === "In Progress" ? "warning" : "muted"}>
                    {item.status}
                  </Badge>
                </div>
                <Progress value={item.completeness} tone={item.completeness >= 80 ? "success" : item.completeness >= 50 ? "accent" : "warning"} />
                <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{item.completeness}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Outcome health */}
        <Card>
          <CardHeader title="Outcome health" subtitle="Progress at a glance" />
          <div className="space-y-3 p-5">
            {outcomes.length === 0 && (
              <p className="py-3 text-center text-sm text-muted-foreground">No outcome-level indicators yet.</p>
            )}
            {outcomes.slice(0, 6).map((ind) => {
              const pct = progressPct(ind);
              const s = indicatorStatus(ind);
              return (
                <div key={ind.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm">
                      <TrafficDot status={s} /> {ind.name}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{ind.current}{ind.unit ?? ""} / {ind.target}{ind.unit ?? ""}</span>
                  </div>
                  <Progress className="mt-1.5" value={pct} tone={s === "green" ? "success" : "warning"} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ---- Lower section ---- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {(role === "admin" || role === "facilitator" || role === "coordinator" || role === "executive") && (
          <Card className="lg:col-span-2">
            <CardHeader title="Cohort readiness" subtitle="Completion across active cohorts" action={<Link href="/cohorts" className="text-sm font-medium text-accent hover:underline">Manage →</Link>} />
            <div className="divide-y">
              {cohorts.length === 0 && (
                <p className="px-5 py-4 text-center text-sm text-muted-foreground">No participants are visible to your role. Administrators can invite members from People &amp; Access.</p>
              )}
              {cohorts.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.activeCount} active of {c.participantCount} enrolled · {c.facilitator}</p>
                  </div>
                  <div className="w-40">
                    <Progress value={c.avgCompletion} tone={c.avgCompletion >= 65 ? "success" : "warning"} />
                  </div>
                  <span className="w-10 text-right text-sm tabular-nums">{c.avgCompletion}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {role === "participant" && (
          <Card className="lg:col-span-2">
            <CardHeader title="Continue learning" subtitle="Next steps on your journey" action={<Link href="/learning" className="text-sm font-medium text-accent hover:underline">All modules →</Link>} />
            <div className="divide-y">
              {modules.map((m, idx) => {
                const modDone = m.resources.every((r) => userDoneSet.has(r.id));
                const prevDone = idx === 0 || modules[idx - 1].resources.every((r) => userDoneSet.has(r.id));
                const locked = idx > 0 && !prevDone;
                return (
                  <Link key={m.id} href={locked ? "/learning" : `/learning/${m.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${modDone ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : locked ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"}`}>
                      {modDone ? <Icons.Check className="h-4 w-4" /> : locked ? <Icons.Lock className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{modDone ? "Completed" : locked ? "Locked — finish previous module" : `${m.resources.length} resources`}</p>
                    </div>
                    <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="The four questions" subtitle="Strategic clarity check" />
          <div className="space-y-2 p-5 text-sm">
            {[
              { q: "What change are we trying to create?", ok: true },
              { q: "Why do we believe it will happen?", ok: true },
              { q: "How do we know it is happening?", ok: false },
              { q: "What evidence supports that?", ok: false },
            ].map((item) => (
              <div key={item.q} className="flex items-start gap-2">
                {item.ok ? <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" /> : <Icons.CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={item.ok ? "" : "text-muted-foreground"}>{item.q}</span>
              </div>
            ))}
            <Link href="/impact" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">Strengthen the evidence →</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
