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
import { Button, Photo, FloatingIcons } from "@/components/ui";
import { IMAGES, GALLERY } from "@/lib/images";

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
      <header className="sticky top-0 z-30 border-b glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Compass className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-bold">Impact OS</p>
              <p className="text-xs text-muted-foreground">Theory of Change Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/login"><Button size="sm">Get started <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mesh absolute inset-0" />
        <FloatingIcons />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> For nonprofits, foundations, ministries &amp; social enterprises
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              A strategic operating system for <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">nonprofit impact</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Move participants from <span className="font-semibold text-foreground">Learning → Application → Implementation → Measurement → Impact.</span> Designed around implementation evidence — not content consumption.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login"><Button size="lg">Launch the portal <ArrowRight className="h-5 w-5" /></Button></Link>
              <Link href="/toc"><Button variant="outline" size="lg">Explore the TOC Builder</Button></Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span><span className="font-bold text-foreground">5</span> user roles</span>
              <span><span className="font-bold text-foreground">4</span> modules</span>
              <span><span className="font-bold text-foreground">6</span> dashboards</span>
            </div>
          </div>

          {/* Photo collage */}
          <div className="relative animate-fade-up">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Photo src={IMAGES.volunteers} alt="Volunteers collaborating" className="h-44 w-full rounded-2xl shadow-lg" gradient="from-accent/40 to-primary/40" />
                <Photo src={IMAGES.children} alt="Children in an education program" className="h-56 w-full rounded-2xl shadow-lg" gradient="from-[hsl(var(--success))]/40 to-accent/40" />
              </div>
              <div className="space-y-4 pt-8">
                <Photo src={IMAGES.teaching} alt="A facilitator leading a workshop" className="h-56 w-full rounded-2xl shadow-lg" gradient="from-primary/40 to-[hsl(var(--warning))]/40" />
                <Photo src={IMAGES.planting} alt="Community environmental work" className="h-44 w-full rounded-2xl shadow-lg" gradient="from-[hsl(var(--success))]/40 to-primary/40" />
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border bg-card p-4 shadow-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Implementation maturity</p>
                  <p className="text-lg font-bold">72 / 100</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight">One platform, the whole impact lifecycle</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Built for the work on the ground</h2>
            <p className="mt-1 text-muted-foreground">From classrooms to clinics to community outreach.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {GALLERY.map((g) => (
            <div key={g.tag} className="group relative overflow-hidden rounded-2xl shadow-sm">
              <Photo src={g.src} alt={g.alt} className="h-44 w-full transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">{g.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Success metric */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        <div className="relative overflow-hidden rounded-3xl border bg-primary p-8 text-primary-foreground sm:p-12">
          <FloatingIcons />
          <div className="relative">
            <h2 className="text-2xl font-bold sm:text-3xl">A leader can answer — in minutes:</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {QUESTIONS.map((q, i) => (
                <li key={q} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold">{i + 1}</span>
                  <span className="font-medium">{q}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/login"><Button variant="secondary" size="lg">Start building <ArrowRight className="h-5 w-5" /></Button></Link>
            </div>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Less an LMS — more a strategic operating system for impact, implementation, learning, measurement and organizational transformation.
        </p>
      </section>
    </div>
  );
}
