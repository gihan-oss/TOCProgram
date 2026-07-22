"use client";

import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { CLIENT } from "@/lib/mas";
import type { WorksheetFieldKind } from "@/lib/content";

export interface PresentPrompt {
  fieldId: string;
  label: string;
  kind?: WorksheetFieldKind;
  wsTitle: string;
}
export interface Answered { name: string; value: string }

// Rotating brand tints so results are colourful and new answers "pop", like
// Mentimeter — all theme-aware HSL tokens.
const TINTS = ["--accent", "--success", "--warning", "--primary"];
const tintAt = (i: number) => TINTS[i % TINTS.length];

// Full-screen, Mentimeter-style live view of worksheet responses: one prompt per
// slide, choice prompts as growing bar charts and open-text prompts as a wall of
// response cards. Answers update live because the parent keeps polling and
// passes fresh `answersByField` down. Arrow keys / Space flip prompts; Esc closes.
export function ResponsesPresent({ moduleTitle, prompts, answersByField, onClose }: {
  moduleTitle: string;
  prompts: PresentPrompt[];
  answersByField: Record<string, Answered[]>;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(prompts.length - 1, i + d)));
  const prompt = prompts[idx];
  const responses = useMemo(() => (prompt ? answersByField[prompt.fieldId] ?? [] : []), [prompt, answersByField]);
  const isChoice = prompt?.kind === "area" || prompt?.kind === "outcome";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setIdx((i) => Math.min(prompts.length - 1, i + 1)); }
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompts.length, onClose]);

  // Bars grow in from zero on each slide change (Mentimeter feel).
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    const t = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(t);
  }, [idx]);

  // Tally distinct answers for choice prompts.
  const tally = useMemo(() => {
    const counts = new Map<string, string[]>();
    for (const r of responses) {
      const list = counts.get(r.value) ?? [];
      list.push(r.name);
      counts.set(r.value, list);
    }
    return [...counts.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [responses]);

  // "Diagnostics": group open-text answers that are effectively the same
  // (case/spacing/trailing punctuation ignored). Similar answers cluster into a
  // tall bar ("50% said X"); when everyone differs it's many 1-count bars →
  // visibly scattered.
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,;:!?"'’]+$/, "");
  const textTally = useMemo(() => {
    const groups = new Map<string, { label: string; names: string[] }>();
    for (const r of responses) {
      const key = norm(r.value);
      if (!key) continue;
      const g = groups.get(key);
      if (g) g.names.push(r.name);
      else groups.set(key, { label: r.value.trim(), names: [r.name] });
    }
    return [...groups.values()].sort((a, b) => b.names.length - a.names.length).map((g) => [g.label, g.names] as [string, string[]]);
  }, [responses]);

  const [grouped, setGrouped] = useState(true);

  if (!prompt) return null;
  const total = responses.length;
  // What to draw: choice prompts always bar; text prompts bar when "grouped",
  // otherwise the card wall.
  const barData: [string, string[]][] | null = isChoice ? tally : grouped ? textTally : null;
  const scattered = !!barData && barData.length > 0 && barData.every(([, n]) => n.length === 1);
  const topShare = barData && barData.length && total ? Math.round((barData[0][1].length / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
        <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {CLIENT.tocTitle} · {moduleTitle}
        </p>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--success))]" /> Live</span>
          <span>Prompt {idx + 1} / {prompts.length}</span>
          <button onClick={onClose} className="inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 font-medium hover:bg-secondary" title="Close (Esc)">
            <Icons.X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>

      {/* slide body */}
      <div className="relative flex flex-1 flex-col overflow-y-auto px-6 py-8 sm:px-16 sm:py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-base font-bold uppercase tracking-wider text-accent">{prompt.wsTitle}</p>
            <div className="flex shrink-0 items-center gap-3">
              {!isChoice && total > 0 && (
                <button onClick={() => setGrouped((g) => !g)} className="inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary" title="Group answers that are the same">
                  <Icons.Layers className="h-3.5 w-3.5" /> {grouped ? "Grouped" : "All answers"}
                </button>
              )}
              <span className="text-sm font-semibold text-muted-foreground">{total} {total === 1 ? "response" : "responses"}</span>
            </div>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{prompt.label}</h1>

          <div className="mt-10 flex-1">
            {total === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                <Icons.Inbox className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-lg font-medium text-muted-foreground">No responses yet — waiting for the room…</p>
              </div>
            ) : barData ? (
              // Bars: choice prompts always; open-text when "Grouped" is on.
              // Similar answers stack into one tall bar (consensus); all-unique
              // answers show as many 1-count bars (scattered).
              <>
                {!isChoice && (
                  <p className="mb-6 text-sm text-muted-foreground">
                    {scattered
                      ? "Answers are scattered — everyone said something different."
                      : `Most common answer: ${topShare}% of the room.`}
                  </p>
                )}
                <div className="space-y-6">
                  {barData.map(([value, names], bi) => {
                    const pct = Math.round((names.length / total) * 100);
                    const color = `hsl(var(${tintAt(bi)}))`;
                    return (
                      <div key={`${value}-${bi}`}>
                        <div className="mb-2 flex items-baseline justify-between gap-4">
                          <span className="min-w-0 break-words text-lg font-bold sm:text-xl">{value}</span>
                          <span className="shrink-0 text-xl font-extrabold tabular-nums sm:text-2xl" style={{ color }}>
                            {names.length}<span className="ml-2 text-base font-semibold text-muted-foreground">{pct}%</span>
                          </span>
                        </div>
                        <div className="h-11 w-full overflow-hidden rounded-2xl bg-secondary sm:h-14">
                          <div
                            className="h-full rounded-2xl transition-[width] duration-[900ms] ease-out"
                            style={{ width: grown ? `${Math.max(4, pct)}%` : "0%", backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              // Open text, ungrouped: a wall of response cards.
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {responses.map((r, i) => {
                  const tint = tintAt(i);
                  const color = `hsl(var(${tint}))`;
                  return (
                    // New answers mount with a fresh key → they fade/pop in. The
                    // coloured left border + tinted avatar make them lively.
                    <div
                      key={`${r.name}-${r.value}-${i}`}
                      className="animate-fade-up rounded-2xl border-l-4 bg-card p-4 shadow-sm"
                      style={{ borderLeftColor: color, backgroundColor: `hsl(var(${tint})/0.06)` }}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
                          {r.name.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">{r.name}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{r.value}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* bottom nav */}
      <div className="flex items-center justify-between gap-3 border-t px-6 py-3">
        <button onClick={() => go(-1)} disabled={idx === 0} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-30 disabled:hover:bg-card">
          <Icons.ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {prompts.map((p, i) => (
            <button key={p.fieldId} onClick={() => setIdx(i)} aria-label={`Prompt ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-accent" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`} />
          ))}
        </div>
        <button onClick={() => go(1)} disabled={idx === prompts.length - 1} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-30 disabled:hover:bg-card">
          Next <Icons.ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
