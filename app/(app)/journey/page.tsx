"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui";
import { CURRENT_USER } from "@/lib/data";

interface Stage {
  n: number;
  title: string;
  icon: keyof typeof Icons;
  why: string; // the nonprofit reason
  build: string; // the deliverable
  href: string;
  cta: string;
  progress: number; // 0-100
}

const STAGES: Stage[] = [
  {
    n: 1,
    title: "Q-Zero — Strategic Clarity",
    icon: "Crosshair",
    why: "Most nonprofit programs fail because they start with activities, not clarity. Q-Zero forces you to name the single change you exist to create — the question funders and boards really fund.",
    build: "Approved Q-Zero Statement",
    href: "/learning",
    cta: "Start learning",
    progress: 0,
  },
  {
    n: 2,
    title: "Theory of Change — Causal Logic",
    icon: "Workflow",
    why: "Donors don't just ask what you'll do — they ask why you believe it will work. A Theory of Change maps the cause-and-effect from your activities to real community change, so your logic is visible and defensible.",
    build: "Complete Causal Chain & TOC",
    href: "/toc",
    cta: "Continue building",
    progress: 0,
  },
  {
    n: 3,
    title: "Logframe — A Fundable Framework",
    icon: "Table2",
    why: "A logframe translates your theory into the rigorous, structured language institutional funders trust — pairing every result with how it will be measured and the assumptions it depends on.",
    build: "Completed Logframe",
    href: "/logframe",
    cta: "Start logframe",
    progress: 0,
  },
  {
    n: 4,
    title: "Measurement Plan — Evidence over Anecdote",
    icon: "Ruler",
    why: "“We helped a lot of people” doesn't move a board. SMART indicators with baselines and targets let you prove progress with evidence — the difference between a story and a result.",
    build: "Measurement Plan",
    href: "/measurement",
    cta: "Build the plan",
    progress: 0,
  },
  {
    n: 5,
    title: "Impact & Evidence — Prove It",
    icon: "TrendingUp",
    why: "The goal of all of this: so any leader can answer “how do we know it's happening, and what's the evidence?” in minutes. This is what turns funding into renewed funding.",
    build: "Final Implementation Package",
    href: "/package",
    cta: "Track impact",
    progress: 0,
  },
];

function statusOf(i: number) {
  const activeIdx = STAGES.findIndex((s) => s.progress < 100);
  if (activeIdx === -1) return "done" as const;
  if (i < activeIdx) return "done" as const;
  if (i === activeIdx) return "active" as const;
  return "locked" as const;
}

export default function JourneyPage() {
  const completed = STAGES.filter((s) => s.progress >= 100).length;
  const overall = Math.round(STAGES.reduce((sum, s) => sum + s.progress, 0) / STAGES.length);
  const firstName = (CURRENT_USER.name || "there").split(" ")[0];
  const activeIdx = STAGES.findIndex((s) => s.progress < 100);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero / the why */}
      <div className="relative animate-fade-up overflow-hidden rounded-3xl border bg-primary p-7 text-primary-foreground sm:p-9">
        <div className="mesh absolute inset-0 opacity-30" />
        <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          <Icons.Sprout className="h-3.5 w-3.5" /> Your guided path
        </span>
        <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome, {firstName}. Let's turn intention into measurable impact.</h1>
        <p className="relative mt-3 max-w-xl text-sm text-primary-foreground/85">
          This isn't a course to finish — it's a journey to <strong>implement</strong>. As a nonprofit, your credibility comes from showing change, not attendance. We unlock one step at a time so each builds on the last.
        </p>
        <div className="relative mt-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-primary-foreground/80">
              <span>{completed} of {STAGES.length} stages complete</span>
              <span>{overall}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${overall}%` }} />
            </div>
          </div>
          {activeIdx >= 0 && (
            <Link href={STAGES[activeIdx].href}>
              <Button variant="secondary" size="sm">Resume <Icons.ArrowRight className="h-4 w-4" /></Button>
            </Link>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative mt-8 pl-2">
        {/* vertical line */}
        <div className="absolute bottom-6 left-[27px] top-6 w-0.5 bg-border" aria-hidden />
        <div
          className="absolute left-[27px] top-6 w-0.5 bg-accent transition-all duration-700"
          style={{ height: `calc(${(Math.max(0, completed) / STAGES.length) * 100}% - 1.5rem)` }}
          aria-hidden
        />

        <div className="space-y-4">
          {STAGES.map((s, i) => {
            const status = statusOf(i);
            const Cmp = (Icons[s.icon] as Icons.LucideIcon) ?? Icons.Circle;
            const locked = status === "locked";
            return (
              <div
                key={s.n}
                className="relative animate-fade-up pl-16"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {/* node */}
                <div
                  className={`absolute left-0 top-3 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-background text-white ${
                    status === "done" ? "bg-[hsl(var(--success))]" : status === "active" ? "animate-pulse-ring bg-accent" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "done" ? <Icons.Check className="h-6 w-6" /> : status === "locked" ? <Icons.Lock className="h-5 w-5" /> : <Cmp className="h-6 w-6" />}
                </div>

                <div className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${locked ? "opacity-70" : "hover:shadow-md"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage {s.n}</span>
                    {status === "done" && <span className="rounded-full bg-[hsl(var(--success)/0.15)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--success))]">Complete</span>}
                    {status === "active" && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">In progress</span>}
                    {status === "locked" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Locked</span>}
                  </div>
                  <h3 className="mt-1 text-lg font-bold">{s.title}</h3>

                  {/* the nonprofit WHY */}
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
                    <Icons.Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                    <p className="text-sm text-foreground/90"><span className="font-semibold">Why this matters: </span>{s.why}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icons.PackageCheck className="h-4 w-4" /> You'll produce: <span className="font-medium text-foreground">{s.build}</span>
                    </span>
                    {status === "locked" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Icons.Lock className="h-3.5 w-3.5" /> Unlocks after Stage {s.n - 1}
                      </span>
                    ) : (
                      <Link href={s.href}>
                        <Button size="sm" variant={status === "done" ? "outline" : "primary"}>
                          {status === "done" ? "Revisit" : s.cta} <Icons.ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>

                  {status === "active" && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{s.progress}%</span></div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${s.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closing why */}
      <div className="mt-8 animate-fade-up rounded-2xl border border-dashed p-6 text-center">
        <Icons.HeartHandshake className="mx-auto h-8 w-8 text-accent" />
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Every stage you finish makes your organization more fundable, more credible, and more able to prove the change you create. That's why we guide you one step at a time.
        </p>
      </div>
    </div>
  );
}
