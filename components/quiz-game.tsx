"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui";
import { Confetti } from "@/components/confetti";
import { QUIZ_PASS, quizStars, type QuizQuestion } from "@/lib/content";
import { sfx, unlock, isMuted, setMuted } from "@/lib/sfx";

// A Wayground/Kahoot-style game-show quiz: one question at a time, a countdown
// clock, speed + streak bonus points, instant animated feedback and sound, and
// a celebratory scoreboard. It still reports (correct, total, passed) up so the
// existing XP / badge / module-completion logic is untouched — the game layer
// is pure motivation on top.

const TIME_LIMIT_MS = 20_000; // per question
const TICK_MS = 100;
const REVEAL_MS = 1500; // how long feedback shows before advancing

// Signature game-show answer-tile colours + shapes (cycled for >4 options).
const TILE = [
  { bg: "bg-[#e21b3c]", ring: "ring-[#e21b3c]", icon: "Triangle" },
  { bg: "bg-[#1368ce]", ring: "ring-[#1368ce]", icon: "Diamond" },
  { bg: "bg-[#d89e00]", ring: "ring-[#d89e00]", icon: "Circle" },
  { bg: "bg-[#26890c]", ring: "ring-[#26890c]", icon: "Square" },
  { bg: "bg-[#9c27b0]", ring: "ring-[#9c27b0]", icon: "Star" },
  { bg: "bg-[#0aa3a3]", ring: "ring-[#0aa3a3]", icon: "Hexagon" },
];

type Phase = "intro" | "play" | "result";

// Shuffle a question's options so the correct answer isn't always in the same
// slot (authors often leave it first). Options are reordered and `answer` is
// remapped to the new index — the correct choice is unchanged, just moved.
// Reshuffled on every play, which also discourages memorising positions.
function shuffleQuestion(q: QuizQuestion): QuizQuestion {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
  };
}

export function QuizGame({ questions, best, onResult }: {
  questions: QuizQuestion[];
  best?: { correct: number; total: number };
  onResult: (correct: number, total: number, passed: boolean) => void;
}) {
  const total = questions.length;
  const [phase, setPhase] = useState<Phase>("intro");
  // The live deck for this play-through: options shuffled per question. Set when
  // a game starts; falls back to the raw questions before the first play.
  const [deck, setDeck] = useState<QuizQuestion[]>(questions);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MS);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [pop, setPop] = useState<{ pts: number; streak: number; key: number } | null>(null);
  const [muted, setMutedState] = useState(false);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTick = useRef(0);
  const answerRef = useRef<(choice: number | null) => void>(() => {});

  useEffect(() => { setMutedState(isMuted()); }, []);

  const q = deck[qIndex];

  // ---- answering (plain closure; held in a ref so the timer always calls the
  // latest version without re-subscribing the interval on every tick) ----
  function answer(choice: number | null) {
    if (locked) return;
    setLocked(true);
    setSelected(choice);

    const isCorrect = choice !== null && choice === q.answer;
    const newStreak = isCorrect ? streak + 1 : 0;
    let gained = 0;
    if (isCorrect) {
      const speedBonus = Math.round(100 * (timeLeft / TIME_LIMIT_MS));
      const streakBonus = newStreak >= 2 ? Math.min(newStreak - 1, 4) * 25 : 0;
      gained = 100 + speedBonus + streakBonus;
      setScore((s) => s + gained);
      setCorrectCount((c) => c + 1);
      if (newStreak >= 2) sfx.streak(); else sfx.correct();
    } else {
      sfx.wrong();
    }
    setStreak(newStreak);
    setBestStreak((b) => Math.max(b, newStreak));
    setPop({ pts: gained, streak: newStreak, key: Date.now() });

    advanceTimer.current = setTimeout(() => {
      if (qIndex < total - 1) {
        setQIndex((i) => i + 1);
        setSelected(null);
        setLocked(false);
        setTimeLeft(TIME_LIMIT_MS);
        setPop(null);
      } else {
        const finalCorrect = correctCount + (isCorrect ? 1 : 0);
        const passed = finalCorrect / total >= QUIZ_PASS;
        setPhase("result");
        onResult(finalCorrect, total, passed);
        if (passed) sfx.win();
      }
    }, REVEAL_MS);
  }
  answerRef.current = answer;

  // ---- countdown: a steady ticker that just decrements the clock ----
  useEffect(() => {
    if (phase !== "play" || locked) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - TICK_MS)), TICK_MS);
    return () => clearInterval(id);
  }, [phase, locked, qIndex]);

  // ---- react to the clock: soft ticks near the end, auto-answer at zero ----
  useEffect(() => {
    if (phase !== "play" || locked) return;
    if (timeLeft <= 0) { answerRef.current(null); return; }
    const sec = Math.ceil(timeLeft / 1000);
    if (sec <= 5 && sec !== lastTick.current) { lastTick.current = sec; sfx.tick(); }
  }, [timeLeft, phase, locked]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  function start() {
    unlock();
    sfx.click();
    setDeck(questions.map(shuffleQuestion));
    setPhase("play");
    setQIndex(0);
    setSelected(null);
    setLocked(false);
    setTimeLeft(TIME_LIMIT_MS);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setPop(null);
    lastTick.current = 0;
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) { unlock(); sfx.click(); }
  }

  // ---------------- intro ----------------
  if (phase === "intro") {
    return (
      <div className="relative mt-3 overflow-hidden rounded-2xl border bg-primary p-6 text-center text-primary-foreground">
        <div className="mesh absolute inset-0 opacity-30" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Icons.Gamepad2 className="h-3.5 w-3.5" /> Game mode
          </span>
          <h3 className="mt-3 text-xl font-extrabold tracking-tight">Ready to play?</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-primary-foreground/85">
            {total} question{total !== 1 ? "s" : ""} · beat the clock for bonus points · build a streak for a multiplier.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-primary-foreground/80">
            <span className="inline-flex items-center gap-1"><Icons.Timer className="h-3.5 w-3.5" /> Faster = more points</span>
            <span className="inline-flex items-center gap-1"><Icons.Flame className="h-3.5 w-3.5" /> Streak multiplier</span>
            <span className="inline-flex items-center gap-1"><Icons.Star className="h-3.5 w-3.5" /> Pass at {Math.round(QUIZ_PASS * 100)}%</span>
          </div>
          {best && best.total > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs">
              <Icons.Award className="h-3.5 w-3.5" /> Best so far: {best.correct}/{best.total}
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="secondary" onClick={start}>
              <Icons.Play className="h-4 w-4" /> Play
            </Button>
            <button onClick={toggleMute} title={muted ? "Unmute sounds" : "Mute sounds"} className="rounded-full bg-white/15 p-2 text-primary-foreground hover:bg-white/25">
              {muted ? <Icons.VolumeX className="h-4 w-4" /> : <Icons.Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- result ----------------
  if (phase === "result") {
    const passed = correctCount / total >= QUIZ_PASS;
    const stars = quizStars(correctCount, total);
    const pct = Math.round((correctCount / total) * 100);
    return (
      <div className="relative mt-3 overflow-hidden rounded-2xl border bg-card p-6 text-center">
        {passed && <Confetti />}
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${passed ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" : "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]"}`}>
          {passed ? <Icons.Trophy className="h-8 w-8" /> : <Icons.RotateCw className="h-8 w-8" />}
        </div>
        <div className="mt-3 flex justify-center"><GameStars value={stars} /></div>
        <p className="mt-3 text-3xl font-extrabold tracking-tight">{score.toLocaleString()}</p>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">points</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
          <span className="font-semibold">{correctCount}/{total} correct <span className="text-muted-foreground">({pct}%)</span></span>
          {bestStreak >= 2 && <span className="inline-flex items-center gap-1 font-medium text-accent"><Icons.Flame className="h-4 w-4" /> Best streak {bestStreak}</span>}
        </div>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {passed
            ? correctCount === total
              ? "Flawless run, masha'Allah — you've mastered this. 🌟"
              : "Passed — strong understanding. Replay to chase a higher score."
            : `So close — you need ${Math.ceil(total * QUIZ_PASS)}/${total} to pass. Unlimited tries; the goal is understanding, not gatekeeping.`}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button onClick={start}><Icons.RotateCw className="h-4 w-4" /> {passed ? "Play again" : "Try again"}</Button>
          <button onClick={toggleMute} title={muted ? "Unmute sounds" : "Mute sounds"} className="rounded-full border p-2 text-muted-foreground hover:bg-secondary">
            {muted ? <Icons.VolumeX className="h-4 w-4" /> : <Icons.Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  // ---------------- play ----------------
  const frac = timeLeft / TIME_LIMIT_MS;
  const secs = Math.ceil(timeLeft / 1000);
  const timerColor = frac > 0.5 ? "bg-[hsl(var(--success))]" : frac > 0.25 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]";
  const low = secs <= 5 && !locked;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border bg-card">
      {/* HUD */}
      <div className="flex items-center justify-between gap-3 border-b bg-secondary/40 px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Question {qIndex + 1} <span className="text-muted-foreground/60">/ {total}</span>
        </span>
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span className="inline-flex animate-pop-in items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
              <Icons.Flame className="h-3.5 w-3.5" /> {streak}🔥
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums">
            <Icons.Trophy className="h-3.5 w-3.5 text-[hsl(var(--warning))]" /> {score.toLocaleString()}
          </span>
          <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
            {muted ? <Icons.VolumeX className="h-4 w-4" /> : <Icons.Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* timer bar */}
      <div className="h-1.5 w-full bg-muted">
        <div className={`h-full ${timerColor} transition-[width] duration-100 ease-linear`} style={{ width: `${frac * 100}%` }} />
      </div>

      <div className="px-4 py-5 sm:px-6">
        {/* progress dots + clock */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i < qIndex ? "w-4 bg-accent" : i === qIndex ? "w-6 bg-accent" : "w-4 bg-muted"}`} />
            ))}
          </div>
          <span className={`inline-flex items-center gap-1 text-sm font-bold tabular-nums ${low ? "animate-timer-flash text-[hsl(var(--danger))]" : "text-muted-foreground"}`}>
            <Icons.Timer className="h-4 w-4" /> {secs}s
          </span>
        </div>

        {/* question */}
        <p key={qIndex} className="animate-tile-in text-lg font-bold leading-snug">{q.prompt}</p>

        {/* answer tiles */}
        <div className="relative mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {q.options.map((opt, j) => {
            const tile = TILE[j % TILE.length];
            const ShapeIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[tile.icon] ?? Icons.Circle;
            const isAns = q.answer === j;
            const chosen = selected === j;
            // After locking: correct tile glows, a wrong pick shows red, others dim.
            let stateCls = "";
            if (locked) {
              if (isAns) stateCls = "ring-4 ring-white/70 brightness-110";
              else if (chosen) stateCls = "opacity-90 ring-4 ring-white/40 animate-shake";
              else stateCls = "opacity-40";
            }
            return (
              <button
                key={j}
                disabled={locked}
                onClick={() => answer(j)}
                className={`group flex items-center gap-3 rounded-xl ${tile.bg} px-4 py-3.5 text-left font-semibold text-white shadow-sm transition-all ${!locked ? "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0" : "cursor-default"} ${stateCls}`}
              >
                <ShapeIcon className="h-5 w-5 shrink-0 fill-white/90" />
                <span className="min-w-0 flex-1">{opt}</span>
                {locked && isAns && <Icons.CheckCircle2 className="h-5 w-5 shrink-0" />}
                {locked && chosen && !isAns && <Icons.XCircle className="h-5 w-5 shrink-0" />}
              </button>
            );
          })}

          {/* floating score pop-up */}
          {pop && (
            <div key={pop.key} className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              {pop.pts > 0 ? (
                <span className="animate-pop-score inline-flex flex-col items-center text-2xl font-extrabold text-[hsl(var(--success))] drop-shadow">
                  +{pop.pts}
                  {pop.streak >= 2 && <span className="text-xs font-bold text-accent">{pop.streak}🔥 streak</span>}
                </span>
              ) : (
                <span className="animate-pop-score text-xl font-extrabold text-[hsl(var(--danger))] drop-shadow">{selected === null ? "Time!" : "Missed"}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameStars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <Icons.Star
          key={n}
          className={`h-7 w-7 ${n <= value ? "animate-pop-in fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" : "text-muted-foreground/30"}`}
          style={{ animationDelay: `${n * 0.1}s` }}
        />
      ))}
    </span>
  );
}
