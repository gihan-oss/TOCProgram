import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Workflow,
  Table2,
  Ruler,
  TrendingUp,
  FolderOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";

const PILLARS = [
  { icon: GraduationCap, title: "Learning Management", desc: "Cohort-based modules with sequential unlocking — measured by implementation, not attendance." },
  { icon: Workflow, title: "Theory of Change Builder", desc: "An interactive canvas that validates causal logic and flags orphan activities in real time." },
  { icon: Table2, title: "Logframe Builder", desc: "Auto-generated from your TOC with two-way sync and PDF / Word / Excel export." },
  { icon: Ruler, title: "Measurement & Evaluation", desc: "SMART indicators with baselines, targets and means of verification." },
  { icon: TrendingUp, title: "Impact Tracking", desc: "Traffic-light dashboards for output performance and outcome health." },
  { icon: FolderOpen, title: "Evidence Repository", desc: "Link documents and data to the outcomes, indicators and assumptions they support." },
];

const QUESTIONS = [
  "What change are we trying to create?",
  "Why do we believe it will happen?",
  "How do we know it is happening?",
  "What evidence supports that conclusion?",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Impact OS</p>
            <p className="text-xs text-muted-foreground">Theory of Change Portal</p>
          </div>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Enter portal <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> For nonprofits, foundations, ministries, charities & social enterprises
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          A strategic operating system for nonprofit impact
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Move participants from <span className="font-medium text-foreground">Learning → Application → Implementation → Measurement → Organizational Impact.</span>{" "}
          Designed around implementation evidence — not content consumption.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Launch dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/toc" className="inline-flex items-center gap-2 rounded-lg border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary">
            Open the TOC Builder
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <p.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border bg-primary p-8 text-primary-foreground sm:p-12">
          <h2 className="text-2xl font-semibold">The platform is successful when a leader can answer — in minutes:</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {QUESTIONS.map((q, i) => (
              <li key={q} className="flex items-start gap-3 rounded-lg bg-white/10 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">{i + 1}</span>
                <span className="font-medium">{q}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Less an LMS — more a strategic operating system for impact, implementation, learning, measurement and organizational transformation.
        </p>
      </section>
    </div>
  );
}
