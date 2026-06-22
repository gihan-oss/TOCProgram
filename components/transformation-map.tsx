import * as Icons from "lucide-react";
import { MAS, AREAS_OF_FOCUS } from "@/lib/mas";

// A single, self-contained "visual graphic" that conveys the full breadth of
// the chapter's transformation work — so no one mistakes the portal for a
// Theory-of-Change tool alone. Three layers, top to bottom:
//   1. The North Star (why we exist)
//   2. The six Areas of Focus (the whole breadth of the work)
//   3. The operating-system journey every initiative runs through — with the
//      Theory of Change shown as ONE stage among many.
// Pure presentation: no client hooks, dark-mode aware, dependency-free.

const JOURNEY: { icon: keyof typeof Icons; label: string; note: string; tool?: boolean }[] = [
  { icon: "GraduationCap", label: "Learn", note: "Cohort modules & game-based mastery" },
  { icon: "Workflow", label: "Design the change", note: "Theory of Change · Logframe", tool: true },
  { icon: "Rocket", label: "Implement", note: "Programs & operational plans" },
  { icon: "Ruler", label: "Measure", note: "Indicators, evidence & assumptions" },
  { icon: "TrendingUp", label: "Impact", note: "Outcomes & organizational change" },
];

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <C className={className} />;
}

export function TransformationMap() {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-9">
      <div className="mesh pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
            <Icons.LayoutGrid className="h-3.5 w-3.5 text-accent" /> The whole picture · {MAS.org} {MAS.vision}
          </span>
          <h3 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">One system for the entire transformation</h3>
        </div>

        {/* ---- Layer 1: the North Star ---- */}
        <div className="mx-auto mt-7 max-w-2xl rounded-2xl border bg-primary p-5 text-center text-primary-foreground shadow-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground/70">North Star</p>
          <p className="mt-1.5 text-base font-semibold leading-snug sm:text-lg">{MAS.northStar}</p>
        </div>

        {/* connector */}
        <div className="mx-auto h-6 w-px bg-border" aria-hidden />
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Six areas of focus</p>

        {/* ---- Layer 2: the six Areas of Focus (the breadth) ---- */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AREAS_OF_FOCUS.map((a) => (
            <div key={a.id} className="group rounded-2xl border bg-background/60 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.tone}`}>
                <Icon name={a.icon} className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-sm font-semibold leading-tight">{a.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{a.verbs.join(" · ")}</p>
            </div>
          ))}
        </div>

        {/* connector */}
        <div className="mx-auto mt-6 h-6 w-px bg-border" aria-hidden />
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Every initiative runs the same journey
        </p>

        {/* ---- Layer 3: the operating-system journey ---- */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-0">
          {JOURNEY.map((s, i) => (
            <div key={s.label} className="flex items-stretch sm:flex-1">
              <div className={`relative w-full rounded-2xl border p-4 text-center ${s.tool ? "border-accent/50 bg-accent/10" : "bg-background/60"} backdrop-blur`}>
                {s.tool && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow">
                    you are here
                  </span>
                )}
                <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${s.tool ? "bg-accent text-accent-foreground" : "bg-accent/12 text-accent"}`}>
                  <Icon name={s.icon} className="h-5 w-5" />
                </div>
                <p className="mt-2 text-sm font-semibold">{s.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{s.note}</p>
              </div>
              {i < JOURNEY.length - 1 && (
                <div className="flex shrink-0 items-center justify-center px-1 sm:px-1.5">
                  <Icons.ChevronRight className="hidden h-5 w-5 text-muted-foreground/50 sm:block" />
                  <Icons.ChevronDown className="h-5 w-5 text-muted-foreground/50 sm:hidden" />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mx-auto mt-7 max-w-2xl text-center text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">The Theory of Change is one tool in this system</span> — alongside
          learning, logframes, measurement, impact tracking and evidence. The portal is how we run the
          <span className="font-semibold text-foreground"> whole transformation</span>, not one piece of it.
        </p>
      </div>
    </div>
  );
}
