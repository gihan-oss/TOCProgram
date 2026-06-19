// Gamification engine. XP, levels and badges are derived from a learner's
// progress snapshot (no separate bookkeeping to keep in sync). The tone is
// encouraging, not competitive — points and badges reward mastery, there is no
// public ranking. Tuned for MASGLA's adult, program-owner learners.

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

export interface BadgeDef { id: string; name: string; desc: string; icon: string; }
export interface BadgeState extends BadgeDef { earned: boolean; }

export const BADGES: BadgeDef[] = [
  { id: "first-steps", name: "First Steps", desc: "Complete your very first item", icon: "Footprints" },
  { id: "sharp-mind", name: "Sharp Mind", desc: "Pass a knowledge check", icon: "Brain" },
  { id: "perfect-recall", name: "Perfect Recall", desc: "Score 100% on a quiz", icon: "Target" },
  { id: "artifact-builder", name: "Artifact Builder", desc: "Complete a worksheet for your program", icon: "PencilRuler" },
  { id: "halfway", name: "Halfway There", desc: "Reach 50% of the whole course", icon: "Flag" },
  { id: "toc-architect", name: "TOC Architect", desc: "Complete every module", icon: "Trophy" },
];

export interface GameState {
  xp: number;
  levelIndex: number;
  levelName: string;
  intoLevel: number; // xp earned within the current level
  spanLevel: number; // xp width of the current level (0 at max)
  toNext: number; // xp remaining to the next level (0 at max)
  isMax: boolean;
  badges: BadgeState[];
  earnedBadges: number;
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

  // ---- badge evaluation from the snapshot ----
  const allResources = modules.flatMap((m) => m.resources);
  const totalItems = allResources.length;
  const doneItems = allResources.filter((r) => done.has(r.id)).length;
  const passedAnyQuiz = allResources.some((r) => {
    const s = r.type === "Quiz" ? meta.scores[r.id] : undefined;
    return s && s.total > 0 && s.correct / s.total >= QUIZ_PASS;
  });
  const perfectQuiz = allResources.some((r) => {
    const s = r.type === "Quiz" ? meta.scores[r.id] : undefined;
    return s && s.total > 0 && s.correct === s.total;
  });
  const worksheetDone = allResources.some((r) => r.type === "Worksheet" && done.has(r.id));
  const modulesWithContent = modules.filter((m) => m.resources.length > 0);
  const allModulesDone = modulesWithContent.length > 0 && modulesWithContent.every((m) => moduleComplete(m, done));
  const halfway = totalItems > 0 && doneItems / totalItems >= 0.5;

  const earned: Record<string, boolean> = {
    "first-steps": doneItems > 0,
    "sharp-mind": passedAnyQuiz,
    "perfect-recall": perfectQuiz,
    "artifact-builder": worksheetDone,
    "halfway": halfway,
    "toc-architect": allModulesDone,
  };

  const badges: BadgeState[] = BADGES.map((b) => ({ ...b, earned: !!earned[b.id] }));
  return { xp, levelIndex, levelName: LEVELS[levelIndex].name, intoLevel, spanLevel, toNext, isMax, badges, earnedBadges: badges.filter((b) => b.earned).length };
}
