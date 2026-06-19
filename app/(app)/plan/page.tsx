"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Card, Badge, Button, SectionTitle, EmptyHint } from "@/components/ui";
import { PARTICIPANTS } from "@/lib/data";

// The 5 design pillars (the "why"), each tied to the feature a facilitator uses.
const PILLARS = [
  {
    icon: "CalendarClock",
    title: "Weekly cadence over 5 weeks",
    why: "One live session each week keeps momentum and forces same-week application to a real program. Each session builds cleanly on the last: the first sets the shared language, the next four each produce one finished artifact.",
    feature: "Schedule one session per week for 5 weeks",
    href: "/learning",
    cta: "Open Course Builder",
  },
  {
    icon: "Timer",
    title: "90-minute sessions",
    why: "Long enough for direct instruction (~40 min) plus live applied work on the participant's own program (~30 min) and a clean close — short enough to sustain over 5 weeks. Worksheet pre-work is done asynchronously between sessions.",
    feature: "Keep each module to a 90-minute live block + async worksheet",
    href: "/learning",
    cta: "Set up modules",
  },
  {
    icon: "ClipboardCheck",
    title: "Pre / post assessment",
    why: "The 10-question pre-assessment establishes a knowledge baseline per participant. You run the same questions post-training. The gap between pre and post scores is your evidence of learning and informs who needs additional coaching before the December 2026 deadline.",
    feature: "Run the 10-question pre-assessment, then the same set post-training",
    href: "/assessments",
    cta: "Open Assessments",
  },
  {
    icon: "Video",
    title: "LMS recording upload",
    why: "Recording allows participants who cannot attend live to complete the training asynchronously at their own pace. Sequential module unlock mirrors the live cohort structure and ensures no one skips foundational sessions.",
    feature: "Upload each session's recording as a Video; modules unlock in sequence",
    href: "/learning",
    cta: "Upload a recording",
  },
  {
    icon: "FileCheck2",
    title: "Artifact submission as proof",
    why: "The Dec 2026 goal is implementation, not attendance or quiz completion. Each participant submits their Q-Zero, causal chain, logframe, and measurement plan for their actual program. This is the evidence base for the 100% target reported to leadership.",
    feature: "Collect the 4 artifacts per participant and track toward 100%",
    href: "/package",
    cta: "View the package",
  },
];

const SESSIONS = [
  { n: 1, title: "Why This Matters & Intro to TOC", focus: "The case for measuring impact · the five-level framework", worksheet: "Place your program" },
  { n: 2, title: "Q-Zero", focus: "Three Laws of Q-Zero · traffic-light self-check", worksheet: "Q-Zero If–Then", deliverable: "Q-Zero" },
  { n: 3, title: "The Impact Pathway", focus: "Five-level causal chain · assumptions at each link", worksheet: "Impact pathway", deliverable: "Causal Chain" },
  { n: 4, title: "Building the Logframe", focus: "4×4 matrix · vertical & horizontal logic", worksheet: "Draft logframe", deliverable: "Logframe" },
  { n: 5, title: "Measuring & Validating Impact", focus: "SMART indicators · assumptions · Keep / Modify / Cancel", worksheet: "Measurement plan", deliverable: "Measurement Plan" },
];

const ARTIFACTS = ["Q-Zero", "Causal Chain", "Logframe", "Measurement Plan"];

export default function FacilitatorPlan() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border bg-primary p-7 text-primary-foreground sm:p-9">
        <div className="mesh absolute inset-0 opacity-30" />
        <div className="relative">
          <Badge tone="accent" className="bg-white/15 text-white">Facilitator playbook</Badge>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Run your cohort to implementation</h1>
          <p className="mt-2 max-w-2xl text-sm text-primary-foreground/85">
            Five weekly, 90-minute sessions that move every participant from learning to a submitted implementation package — the evidence base for the <span className="font-semibold">100% target by December 2026.</span>
          </p>
        </div>
      </div>

      {/* The 5 pillars / features */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">How the program works (and the tools you'll use)</h2>
      <div className="space-y-4">
        {PILLARS.map((p) => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[p.icon] ?? Icons.Square;
          return (
            <Card key={p.title} className="p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.why}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 p-3">
                    <span className="flex items-center gap-1.5 text-sm"><Icons.Wrench className="h-4 w-4 text-accent" /> {p.feature}</span>
                    <Link href={p.href}><Button size="sm" variant="outline">{p.cta} <Icons.ArrowRight className="h-4 w-4" /></Button></Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 8-session schedule */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">The 5-session schedule (weekly · 90 min)</h2>
      <Card className="overflow-hidden">
        <div className="divide-y">
          {SESSIONS.map((s) => (
            <div key={s.n} className="flex items-start gap-4 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{s.n}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{s.title}</p>
                  {s.deliverable && <Badge tone="success"><Icons.FileCheck2 className="h-3 w-3" /> {s.deliverable}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{s.focus}</p>
              </div>
              <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex"><Icons.FileText className="h-3.5 w-3.5" /> {s.worksheet}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link href="/learning"><Button size="sm"><Icons.Plus className="h-4 w-4" /> Build these as modules</Button></Link>
        <Link href="/assessments"><Button size="sm" variant="outline"><Icons.ClipboardCheck className="h-4 w-4" /> Set up assessments</Button></Link>
      </div>

      {/* Artifact submission tracker */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Artifact submissions (proof of implementation)</h2>
      {PARTICIPANTS.length === 0 ? (
        <EmptyHint>No participants enrolled yet. Once people join your cohort, each one's Q-Zero, Causal Chain, Logframe and Measurement Plan submissions are tracked here toward the 100% target.</EmptyHint>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Participant</th>
                {ARTIFACTS.map((a) => <th key={a} className="px-4 py-3 text-center">{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {PARTICIPANTS.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  {ARTIFACTS.map((a) => (
                    <td key={a} className="px-4 py-3 text-center"><Icons.Circle className="mx-auto h-4 w-4 text-muted-foreground" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
