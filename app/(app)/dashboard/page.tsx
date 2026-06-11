"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { useApp } from "@/components/providers";
import { Card, CardHeader, Badge, Progress, Stat, TrafficDot, SectionTitle } from "@/components/ui";
import { ROLES, COHORTS, PARTICIPANTS, PACKAGE_ITEMS, MODULES, INDICATORS, ASSUMPTIONS, implementationMaturityScore } from "@/lib/data";

export default function Dashboard() {
  const { role } = useApp();
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;
  const maturity = implementationMaturityScore();
  const completedModules = MODULES.filter((m) => m.videoWatched && m.quizPassed && m.assignmentSubmitted).length;

  return (
    <div>
      <SectionTitle sub={`Signed in as ${roleLabel} · Amal & Company Foundation`}>
        {role === "executive" ? "Portfolio Overview" : role === "participant" ? "My Implementation Journey" : "Program Overview"}
      </SectionTitle>

      {/* Top stats vary subtly by role */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {role === "participant" ? (
          <>
            <Stat label="Modules completed" value={`${completedModules}/${MODULES.length}`} hint="Sequential unlocking active" />
            <Stat label="Implementation maturity" value={`${maturity}`} hint="0–100 scale" tone={maturity >= 70 ? "success" : maturity >= 40 ? "warning" : "danger"} />
            <Stat label="Learning growth" value="+37 pts" hint="Pre 41 → Post 78" tone="success" />
            <Stat label="Open assumptions" value={ASSUMPTIONS.filter((a) => a.status !== "Valid").length} hint="1 failed · needs revision" tone="warning" />
          </>
        ) : role === "executive" ? (
          <>
            <Stat label="Implementation rate" value="63%" hint="Across 3 cohorts" tone="warning" />
            <Stat label="Programs at risk" value="1" hint="Health Cohort below target" tone="danger" />
            <Stat label="Avg learning growth" value="+41%" hint="Pre → Post improvement" tone="success" />
            <Stat label="Portfolio maturity" value="68" hint="Program maturity index" />
          </>
        ) : (
          <>
            <Stat label="Active cohorts" value={COHORTS.length} hint="57 participants total" />
            <Stat label="Avg participation" value="86%" hint="Weighted across cohorts" tone="success" />
            <Stat label="Assignments to review" value="9" hint="3 awaiting approval" tone="warning" />
            <Stat label="Implementation readiness" value="63%" hint="Cohort average" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Implementation pipeline / package */}
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
          <CardHeader title="Outcome health" subtitle="Traffic-light status" />
          <div className="space-y-3 p-5">
            {INDICATORS.filter((i) => i.level === "outcome" || i.level === "goal").map((ind) => {
              const progress = Math.round(((ind.current - ind.baseline) / (ind.target - ind.baseline)) * 100);
              const status = progress >= 80 ? "green" : progress >= 50 ? "yellow" : "red";
              return (
                <div key={ind.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm">
                      <TrafficDot status={status} /> {ind.name}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{ind.current}{ind.unit} / {ind.target}{ind.unit}</span>
                  </div>
                  <Progress className="mt-1.5" value={progress} tone={status === "green" ? "success" : status === "yellow" ? "warning" : "danger"} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Role specific lower section */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {(role === "admin" || role === "facilitator" || role === "coordinator" || role === "executive") && (
          <Card className="lg:col-span-2">
            <CardHeader title="Cohort readiness" subtitle="Implementation readiness across active cohorts" action={<Link href="/cohorts" className="text-sm font-medium text-accent hover:underline">Manage →</Link>} />
            <div className="divide-y">
              {COHORTS.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.participants} participants · {c.facilitator}</p>
                  </div>
                  <div className="w-40">
                    <Progress value={c.implementationReadiness} tone={c.implementationReadiness >= 65 ? "success" : "warning"} />
                  </div>
                  <span className="w-10 text-right text-sm tabular-nums">{c.implementationReadiness}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {role === "participant" && (
          <Card className="lg:col-span-2">
            <CardHeader title="Continue learning" subtitle="Next steps on your journey" action={<Link href="/learning" className="text-sm font-medium text-accent hover:underline">All modules →</Link>} />
            <div className="divide-y">
              {MODULES.map((m) => {
                const done = m.videoWatched && m.quizPassed && m.assignmentSubmitted;
                const locked = m.index > 0 && !(MODULES[m.index - 1].videoWatched && MODULES[m.index - 1].quizPassed && MODULES[m.index - 1].assignmentSubmitted);
                return (
                  <Link key={m.id} href={locked ? "/learning" : `/learning/${m.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${done ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : locked ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"}`}>
                      {done ? <Icons.Check className="h-4 w-4" /> : locked ? <Icons.Lock className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.code}: {m.title}</p>
                      <p className="text-xs text-muted-foreground">{done ? "Completed" : locked ? "Locked — finish previous module" : "In progress"}</p>
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
