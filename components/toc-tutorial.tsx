"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Typewriter } from "@/components/typewriter";
import { MAS } from "@/lib/mas";

// An animated, self-playing "how a Theory of Change works" tutorial that lives
// in a small box on the builder. Press play and a friendly voice types out the
// idea while mini nodes pop into a little canvas and connect themselves — outcome,
// goal, the link between them, then outputs and activities and an assumption.
// A blue button (top-right) reopens it any time.

const SEEN_KEY = "toc-tutorial-seen";

// mini-canvas geometry (300 x 260)
const CX = 150;
const NODE: Record<string, { y: number; tone: string; dot: string; tag: string; label: string }> = {
  goal: { y: 10, tone: "border-l-[hsl(var(--primary))]", dot: "bg-[hsl(var(--primary))]", tag: "Goal", label: "God-centered agents of change" },
  outcome: { y: 78, tone: "border-l-[hsl(var(--accent))]", dot: "bg-[hsl(var(--accent))]", tag: "Outcome", label: "Youth build spiritual habits" },
  output: { y: 146, tone: "border-l-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]", tag: "Output", label: "Monthly halaqahs delivered" },
  activity: { y: 214, tone: "border-l-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]", tag: "Activity", label: "Host Qiyam nights" },
};

interface Scene { text: string; }
const SCENES: Scene[] = [
  { text: "A Theory of Change is the simple story of how your work creates change. Let me show you — watch." },
  { text: 'Start with an Outcome — the change you want to see in people. Like: "Youth build consistent spiritual habits."' },
  { text: `Add the Goal it builds toward — your North Star. For ${MAS.org}: lifelong, God-centered agents of change.` },
  { text: "Now connect them: the outcome leads up to the goal. The arrows are your logic." },
  { text: "Underneath, add what you deliver (an Output) and what you do (an Activity). Read it bottom-to-top." },
  { text: "Connect the chain: activity → output → outcome → goal. That's your whole story of change." },
  { text: "Every link into an outcome needs an Assumption — why you believe it works. That's the honest part." },
  { text: "That's it! Add nodes, drag to arrange, and connect — it saves automatically. Tap the blue button to replay this anytime. You've got this. 🌱" },
];

// What's visible by scene (cumulative).
const showNode = (id: string, s: number) => (id === "outcome" ? s >= 1 : id === "goal" ? s >= 2 : s >= 4);
const showEdge = (id: string, s: number) => (id === "go" ? s >= 3 : s >= 5);

export function TocTutorial() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [scene, setScene] = useState(0);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-open the very first time on this browser.
  useEffect(() => {
    try { if (localStorage.getItem(SEEN_KEY) !== "1") setOpen(true); } catch {}
  }, []);

  function markSeen() { try { localStorage.setItem(SEEN_KEY, "1"); } catch {} }
  function clearTimer() { if (advance.current) { clearTimeout(advance.current); advance.current = null; } }

  function start() { clearTimer(); setStarted(true); setScene(0); }
  function go(n: number) { clearTimer(); setScene(Math.max(0, Math.min(SCENES.length - 1, n))); }
  function close() { clearTimer(); setOpen(false); markSeen(); }
  function reopen() { setOpen(true); setStarted(false); setScene(0); }

  useEffect(() => clearTimer, []);

  const last = scene === SCENES.length - 1;

  return (
    <>
      {/* Blue reopen button — top-right */}
      <button
        onClick={reopen}
        aria-label="Open the Theory of Change tutorial"
        className="fixed right-5 top-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg ring-4 ring-accent/20 transition-transform hover:scale-105 print:hidden"
      >
        <Icons.GraduationCap className="h-5 w-5" />
      </button>

      {!open ? null : (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={close}>
          <div
            className="animate-fade-up w-[min(94vw,380px)] overflow-hidden rounded-2xl border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="relative flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground">
              <div className="mesh pointer-events-none absolute inset-0 opacity-30" />
              <Icons.Compass className="relative h-4 w-4" />
              <p className="relative flex-1 text-sm font-bold">Theory of Change — quick tour</p>
              <button onClick={close} aria-label="Close" className="relative rounded-full p-1 text-primary-foreground/80 hover:bg-white/15 hover:text-white">
                <Icons.X className="h-4 w-4" />
              </button>
            </div>

            {!started ? (
              // ---- press-to-start splash ----
              <div className="px-5 py-7 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <Icons.Workflow className="h-7 w-7" />
                </div>
                <p className="mt-3 font-semibold">New to building a Theory of Change?</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Press play — I'll walk you through it in 30 seconds, with the pieces building themselves.
                </p>
                <button onClick={start} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5">
                  <Icons.Play className="h-4 w-4" /> Play the tour
                </button>
                <button onClick={close} className="mt-2 block w-full text-xs font-medium text-muted-foreground hover:text-foreground">Skip for now</button>
              </div>
            ) : (
              // ---- playing ----
              <div className="px-4 py-4">
                {/* mini canvas */}
                <div className="relative mx-auto h-[260px] w-[300px] grid-paper overflow-hidden rounded-xl border bg-background/50">
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 260">
                    <defs>
                      <marker id="tut-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--accent))" />
                      </marker>
                    </defs>
                    {showEdge("go", scene) && <EdgePath key="go" y1={78} y2={50} hi={scene >= 6} />}
                    {showEdge("oo", scene) && <EdgePath key="oo" y1={146} y2={118} hi={scene >= 6} assume={scene >= 6} />}
                    {showEdge("ao", scene) && <EdgePath key="ao" y1={214} y2={186} />}
                  </svg>

                  {(["goal", "outcome", "output", "activity"] as const).map((id) =>
                    showNode(id, scene) ? <MiniNode key={id} id={id} /> : null,
                  )}

                  {scene >= 6 && (
                    <span className="animate-pop-in absolute left-[206px] top-[124px] z-10 inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground shadow">
                      <Icons.ShieldCheck className="h-2.5 w-2.5" /> assumption
                    </span>
                  )}
                </div>

                {/* narration */}
                <div className="mt-3 min-h-[72px] rounded-xl bg-secondary/50 p-3 text-sm leading-relaxed">
                  <Typewriter
                    key={scene}
                    text={SCENES[scene].text}
                    speed={20}
                    onDone={() => {
                      if (!last) { clearTimer(); advance.current = setTimeout(() => setScene((s) => Math.min(SCENES.length - 1, s + 1)), 1400); }
                    }}
                  />
                </div>

                {/* controls */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button onClick={() => go(scene - 1)} disabled={scene === 0} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-30">
                    <Icons.ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  <div className="flex gap-1">
                    {SCENES.map((_, i) => (
                      <button key={i} onClick={() => go(i)} aria-label={`Step ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === scene ? "w-5 bg-accent" : "w-1.5 bg-muted hover:bg-muted-foreground/40"}`} />
                    ))}
                  </div>
                  {last ? (
                    <button onClick={close} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                      Start building <Icons.ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => go(scene + 1)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                      Next <Icons.ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MiniNode({ id }: { id: keyof typeof NODE | string }) {
  const n = NODE[id];
  return (
    <div
      className="animate-pop-in absolute left-1/2 w-[180px] -translate-x-1/2 rounded-lg border border-l-4 bg-card p-2 shadow-sm"
      style={{ top: n.y, borderLeftColor: undefined }}
    >
      <div className={`absolute inset-y-0 left-0 w-1 rounded-l ${n.dot}`} />
      <div className="flex items-center gap-1.5 pl-1">
        <span className={`h-2 w-2 rounded ${n.dot}`} />
        <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{n.tag}</span>
      </div>
      <p className="mt-0.5 pl-1 text-[11px] font-medium leading-tight">{n.label}</p>
    </div>
  );
}

function EdgePath({ y1, y2, hi, assume }: { y1: number; y2: number; hi?: boolean; assume?: boolean }) {
  return (
    <path
      className="animate-draw-line"
      d={`M ${CX} ${y1} L ${CX} ${y2}`}
      fill="none"
      stroke={assume ? "hsl(var(--accent))" : hi ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))"}
      strokeWidth={2}
      markerEnd="url(#tut-arrow)"
    />
  );
}
