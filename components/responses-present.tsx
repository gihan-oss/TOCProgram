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

  if (!prompt) return null;
  const total = responses.length;

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
            <span className="shrink-0 text-sm font-semibold text-muted-foreground">
              {total} {total === 1 ? "response" : "responses"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{prompt.label}</h1>

          <div className="mt-10 flex-1">
            {total === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                <Icons.Inbox className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-lg font-medium text-muted-foreground">No responses yet — waiting for the room…</p>
              </div>
            ) : isChoice ? (
              // Mentimeter multiple-choice: growing bars per option.
              <div className="space-y-7">
                {tally.map(([value, names]) => {
                  const pct = Math.round((names.length / total) * 100);
                  return (
                    <div key={value}>
                      <div className="mb-2 flex items-baseline justify-between gap-4">
                        <span className="text-lg font-bold sm:text-xl">{value}</span>
                        <span className="shrink-0 text-xl font-extrabold tabular-nums text-accent sm:text-2xl">
                          {names.length}<span className="ml-2 text-base font-semibold text-muted-foreground">{pct}%</span>
                        </span>
                      </div>
                      <div className="h-11 w-full overflow-hidden rounded-2xl bg-secondary sm:h-14">
                        <div
                          className="h-full rounded-2xl bg-accent transition-[width] duration-[900ms] ease-out"
                          style={{ width: grown ? `${Math.max(4, pct)}%` : "0%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Open text: a wall of response cards.
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {responses.map((r, i) => (
                  <div key={`${r.name}-${i}`} className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                        {r.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{r.name}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{r.value}</p>
                  </div>
                ))}
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
