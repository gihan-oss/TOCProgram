"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Typewriter } from "@/components/typewriter";
import { MAS } from "@/lib/mas";

// An animated, self-playing "how a Theory of Change works" tutorial that lives
// in a box on the builder. Press play and a friendly voice types out the idea
// while mini nodes pop into a little canvas and connect themselves — outcome,
// goal, the link between them, then outputs and activities and an assumption.
// A blue button (top-right) reopens it any time. Fully responsive + centered.

const SEEN_KEY = "toc-tutorial-seen";

const NODE: Record<string, { dot: string; tag: string; label: string }> = {
  goal: { dot: "bg-[hsl(var(--primary))]", tag: "Goal", label: "God-centered agents of change" },
  outcome: { dot: "bg-[hsl(var(--accent))]", tag: "Outcome", label: "Youth build spiritual habits" },
  output: { dot: "bg-[hsl(var(--success))]", tag: "Output", label: "Monthly halaqahs delivered" },
  activity: { dot: "bg-[hsl(var(--warning))]", tag: "Activity", label: "Host Qiyam nights" },
};

// vertical layout inside a 300px-tall canvas
const TOP = { goal: 6, outcome: 82, output: 158, activity: 234 };
const CONN = { go: 58, oo: 134, ao: 210 }; // connector tops (the gaps)

const SCENES = [
  "A Theory of Change is the simple story of how your work creates change. Let me show you — watch.",
  'Start with an Outcome — the change you want to see in people. Like: "Youth build consistent spiritual habits."',
  `Add the Goal it builds toward — your North Star. For ${MAS.org}: lifelong, God-centered agents of change.`,
  "Now connect them: the outcome leads up to the goal. The arrows are your logic.",
  "Underneath, add what you deliver (an Output) and what you do (an Activity). Read it bottom-to-top.",
  "Connect the chain: activity → output → outcome → goal. That's your whole story of change.",
  "Every link into an outcome needs an Assumption — why you believe it works. That's the honest part.",
  "That's it! Add nodes, drag to arrange, and connect — it saves automatically. Tap the blue button to replay this anytime. You've got this. 🌱",
];

const showNode = (id: string, s: number) => (id === "outcome" ? s >= 1 : id === "goal" ? s >= 2 : s >= 4);
const showEdge = (id: string, s: number) => (id === "go" ? s >= 3 : s >= 5);

export function TocTutorial() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [scene, setScene] = useState(0);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={close}>
          <div
            className="animate-fade-up w-[min(96vw,560px)] overflow-hidden rounded-2xl border bg-card shadow-2xl"
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
              <div className="px-6 py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <Icons.Workflow className="h-8 w-8" />
                </div>
                <p className="mt-3 text-lg font-semibold">New to building a Theory of Change?</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Press play — I'll walk you through it in about 30 seconds, with the pieces building themselves.
                </p>
                <button onClick={start} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5">
                  <Icons.Play className="h-4 w-4" /> Play the tour
                </button>
                <button onClick={close} className="mt-3 block w-full text-xs font-medium text-muted-foreground hover:text-foreground">Skip for now</button>
              </div>
            ) : (
              // ---- playing ----
              <div className="px-4 py-4 sm:px-6">
                {/* mini canvas — responsive + centered */}
                <div className="relative mx-auto h-[300px] w-full max-w-[440px] grid-paper overflow-hidden rounded-xl border bg-background/50">
                  {showEdge("ao", scene) && <Connector top={CONN.ao} />}
                  {showEdge("oo", scene) && <Connector top={CONN.oo} accent={scene >= 6} />}
                  {showEdge("go", scene) && <Connector top={CONN.go} />}

                  {showNode("activity", scene) && <MiniNode id="activity" top={TOP.activity} />}
                  {showNode("output", scene) && <MiniNode id="output" top={TOP.output} />}
                  {showNode("outcome", scene) && <MiniNode id="outcome" top={TOP.outcome} />}
                  {showNode("goal", scene) && <MiniNode id="goal" top={TOP.goal} />}

                  {scene >= 6 && (
                    <span className="animate-pop-in absolute left-1/2 top-[126px] z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow">
                      <Icons.ShieldCheck className="h-3 w-3" /> assumption
                    </span>
                  )}
                </div>

                {/* narration */}
                <div className="mt-3 min-h-[64px] rounded-xl bg-secondary/50 p-3 text-sm leading-relaxed">
                  <Typewriter
                    key={scene}
                    text={SCENES[scene]}
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

function MiniNode({ id, top }: { id: string; top: number }) {
  const n = NODE[id];
  return (
    <div className="animate-pop-in absolute left-1/2 z-10 w-[86%] max-w-[240px] -translate-x-1/2 rounded-lg border bg-card px-2.5 py-1.5 shadow-sm" style={{ top }}>
      <div className={`absolute inset-y-1 left-0 w-1 rounded-r ${n.dot}`} />
      <div className="flex items-center gap-1.5 pl-1.5">
        <span className={`h-2 w-2 rounded ${n.dot}`} />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{n.tag}</span>
      </div>
      <p className="mt-0.5 truncate pl-1.5 text-xs font-medium leading-tight">{n.label}</p>
    </div>
  );
}

function Connector({ top, accent }: { top: number; accent?: boolean }) {
  const color = accent ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))";
  return (
    <div className="absolute left-1/2 z-0 -translate-x-1/2" style={{ top }}>
      <div className="animate-grow-y origin-top" style={{ height: 24, width: 2, background: color }} />
      {/* up-arrow into the node above */}
      <span
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: `6px solid ${color}` }}
      />
    </div>
  );
}
