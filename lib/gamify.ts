// Gamification engine. XP and levels are derived from a learner's progress
// snapshot (no separate bookkeeping to keep in sync). The tone is encouraging,
// not competitive — points reward mastery, there is no public ranking. Tuned
// for MASGLA's adult, program-owner learners.

import { moduleComplete, QUIZ_PASS, type CourseModule, type LearnerMeta } from "./content";

const XP = {
  resource: 20, // any item completed
  quizPass: 40, // passing a knowledge check
  perCorrect: 10, // each correct answer
  perfect: 30, // bonus for a perfect score
  worksheet: 70, // completing a worksheet (the real artifact work)
  module: 120, // finishing a whole module
};

// Named bands keep progression meaningful and on-theme.
const LEVELS = [
  { min: 0, name: "Newcomer" },
  { min: 150, name: "Explorer" },
  { min: 350, name: "Q-Zero Apprentice" },
  { min: 600, name: "Pathway Builder" },
  { min: 900, name: "Logframe Architect" },
  { min: 1300, name: "Impact Strategist" },
];

export interface GameState {
  xp: number;
  levelIndex: number;
  levelName: string;
  intoLevel: number; // xp earned within the current level
  spanLevel: number; // xp width of the current level (0 at max)
  toNext: number; // xp remaining to the next level (0 at max)
  isMax: boolean;
}

export function computeXp(modules: CourseModule[], done: Set<string>, meta: LearnerMeta): number {
  let xp = 0;
  for (const m of modules) {
    for (const r of m.resources) {
      if (done.has(r.id)) xp += XP.resource;
      if (r.type === "Worksheet" && done.has(r.id)) xp += XP.worksheet;
      if (r.type === "Quiz") {
        const s = meta.scores[r.id];
        if (s && s.total > 0 && s.correct / s.total >= QUIZ_PASS) {
          xp += XP.quizPass + s.correct * XP.perCorrect;
          if (s.correct === s.total) xp += XP.perfect;
        }
      }
    }
    if (m.resources.length > 0 && moduleComplete(m, done)) xp += XP.module;
  }
  return xp;
}

export function computeGameState(modules: CourseModule[], done: Set<string>, meta: LearnerMeta): GameState {
  const xp = computeXp(modules, done, meta);

  let levelIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) levelIndex = i;
  const isMax = levelIndex === LEVELS.length - 1;
  const base = LEVELS[levelIndex].min;
  const next = isMax ? base : LEVELS[levelIndex + 1].min;
  const intoLevel = xp - base;
  const spanLevel = isMax ? 0 : next - base;
  const toNext = isMax ? 0 : next - xp;

  return { xp, levelIndex, levelName: LEVELS[levelIndex].name, intoLevel, spanLevel, toNext, isMax };
}
