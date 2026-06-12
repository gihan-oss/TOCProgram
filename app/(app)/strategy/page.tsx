"use client";

import * as Icons from "lucide-react";
import { Card, Badge, Progress } from "@/components/ui";
import {
  MAS, METHODOLOGY, AREAS_OF_FOCUS, WORKSTREAMS, workstreamProgress,
  DESIRED_OUTCOMES, SUCCESS_METRICS, THE_SHIFT,
} from "@/lib/mas";

export default function StrategyHouse() {
  return (
    <div className="space-y-8">
      {/* North Star */}
      <div className="relative overflow-hidden rounded-3xl border bg-primary p-7 text-primary-foreground sm:p-9">
        <div className="mesh absolute inset-0 opacity-30" />
        <div className="relative">
          <Badge tone="accent" className="bg-white/15 text-white">{MAS.org} · {MAS.vision}</Badge>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">The Strategy House</h1>
          <p className="mt-3 max-w-2xl text-lg font-medium text-primary-foreground/90">
            North Star — “{MAS.northStar}”
          </p>
        </div>
      </div>

      {/* 6-layer methodology */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Strategy methodology</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METHODOLOGY.map((m) => (
            <Card key={m.n} className="flex items-start gap-3 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{m.n}</span>
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 6 Areas of Focus */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Six Areas of Focus</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS_OF_FOCUS.map((a) => {
            const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[a.icon] ?? Icons.Square;
            return (
              <Card key={a.id} className="p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.tone}`}><Cmp className="h-5 w-5" /></div>
                <h3 className="mt-3 font-semibold">{a.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {a.verbs.map((v) => <span key={v} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{v}</span>)}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* The shift */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="flex items-center gap-2 font-semibold text-muted-foreground"><Icons.History className="h-4 w-4" /> The Previous State</p>
          <ul className="mt-3 space-y-2">
            {THE_SHIFT.previous.map((s) => (
              <li key={s.label} className="text-sm"><span className="font-semibold">{s.label}:</span> <span className="text-muted-foreground">{s.desc}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="border-l-4 border-l-accent p-5">
          <p className="flex items-center gap-2 font-semibold text-accent"><Icons.Rocket className="h-4 w-4" /> The Path Forward (2026)</p>
          <ul className="mt-3 space-y-2">
            {THE_SHIFT.forward.map((s) => (
              <li key={s.label} className="text-sm"><span className="font-semibold">{s.label}:</span> <span className="text-muted-foreground">{s.desc}</span></li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Workstreams — Connecting the Dots */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Connecting the Dots — transformation workstreams</h2>
        <p className="mb-3 text-xs text-muted-foreground">Shifting from fragmented activity to an impact-driven ecosystem.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {WORKSTREAMS.map((w) => {
            const prog = workstreamProgress(w);
            return (
              <Card key={w.id} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{w.title}</h3>
                  <span className="text-sm font-semibold tabular-nums">{prog}%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{w.objective}</p>
                <Progress className="mt-3" value={prog} tone={prog >= 70 ? "success" : prog >= 40 ? "accent" : "warning"} />
                <ul className="mt-3 space-y-1.5">
                  {w.tasks.map((t) => (
                    <li key={t.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {t.progress === null ? <Icons.MinusCircle className="h-3.5 w-3.5 text-muted-foreground" /> : t.progress >= 100 ? <Icons.CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <Icons.Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                        {t.name}
                      </span>
                      <span className="tabular-nums text-xs text-muted-foreground">{t.progress === null ? "No tasks" : `${t.progress}%`}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Outcomes + metrics */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Desired Defined Outcomes</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {DESIRED_OUTCOMES.map((o) => <span key={o} className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium">{o}</span>)}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Defined Metrics of Success</h3>
          <div className="mt-3 space-y-2">
            {SUCCESS_METRICS.map((m) => {
              const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[m.icon] ?? Icons.Target;
              return (
                <div key={m.name} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent"><Cmp className="h-4 w-4" /></span>
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}
