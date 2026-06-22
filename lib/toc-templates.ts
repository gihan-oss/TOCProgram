import type { NodeType } from "./types";

// The saved shape of a learner's Theory of Change. Persisted per-learner as one
// JSON document (Supabase `toc.data`, or localStorage in demo mode).
export interface TocDocNode {
  id: string;
  type: NodeType;
  title: string;
  narrative: string;
  x: number;
  y: number;
}
export interface TocDocEdge {
  id: string;
  from: string;
  to: string;
  assumption?: string; // why we believe this link holds (required into an outcome)
}
export interface TocDoc {
  program?: string; // the program this Theory of Change is for
  nodes: TocDocNode[];
  edges: TocDocEdge[];
  updatedAt?: string;
}

export const emptyToc = (): TocDoc => ({ program: "", nodes: [], edges: [] });

// A learner can build several programs, each with its own Theory of Change.
export interface ProgramDoc extends TocDoc { id: string }
export interface TocSet { programs: ProgramDoc[]; activeId: string | null }

export function newProgram(name = ""): ProgramDoc {
  return { id: `p-${Date.now()}-${Math.round(Math.random() * 9999)}`, program: name, nodes: [], edges: [] };
}

// Accepts the old single-doc shape OR the new multi-program shape and always
// returns a TocSet, so existing saved work is never lost.
export function toTocSet(data: unknown): TocSet {
  const d = data as { programs?: ProgramDoc[]; activeId?: string | null; nodes?: unknown };
  if (d && Array.isArray(d.programs) && d.programs.length > 0) {
    return { programs: d.programs, activeId: d.activeId ?? d.programs[0].id };
  }
  if (d && Array.isArray(d.nodes)) {
    const p: ProgramDoc = { id: `p-mig-${Date.now()}`, ...(d as TocDoc) };
    return { programs: [p], activeId: p.id };
  }
  const p = newProgram();
  return { programs: [p], activeId: p.id };
}

// Vertical bands so a new node lands in the right row for its level.
export const BAND_Y: Record<NodeType, number> = { goal: 40, outcome: 190, output: 350, activity: 510 };

export const NODE_DEFAULT_TITLE: Record<NodeType, string> = {
  goal: "Our long-term goal",
  outcome: "A change we want to see",
  output: "Something we deliver",
  activity: "Something we do",
};

// A ready MAS-GLA starter so no one stares at a blank canvas. A clean chain:
// activities → output → outcome → goal, with assumptions on the outcome links.
export const STARTER_TOC: TocDoc = {
  nodes: [
    { id: "s-goal", type: "goal", title: "Lifelong, God-centered agents of change", narrative: "Our North Star — the ultimate change we exist to create.", x: 320, y: 40 },
    { id: "s-out1", type: "outcome", title: "Youth build consistent spiritual habits", narrative: "A lasting change in how young people practice and connect.", x: 320, y: 190 },
    { id: "s-op1", type: "output", title: "Monthly youth halaqahs delivered", narrative: "The concrete thing our activities produce.", x: 160, y: 350 },
    { id: "s-op2", type: "output", title: "Mentorship circles running", narrative: "Ongoing usrah/mentorship groups in place.", x: 480, y: 350 },
    { id: "s-act1", type: "activity", title: "Host Qiyam nights", narrative: "What we actually do on the ground.", x: 80, y: 510 },
    { id: "s-act2", type: "activity", title: "Run mentored usrah circles", narrative: "Weekly small-group mentorship.", x: 320, y: 510 },
    { id: "s-act3", type: "activity", title: "Train naqeebs (mentors)", narrative: "Equip the people who lead the circles.", x: 540, y: 510 },
  ],
  edges: [
    { id: "se1", from: "s-act1", to: "s-op1" },
    { id: "se2", from: "s-act2", to: "s-op2" },
    { id: "se3", from: "s-act3", to: "s-op2" },
    { id: "se4", from: "s-op1", to: "s-out1", assumption: "Youth attend consistently and feel a sense of belonging." },
    { id: "se5", from: "s-op2", to: "s-out1", assumption: "Mentors stay committed and model the habits themselves." },
    { id: "se6", from: "s-out1", to: "s-goal", assumption: "Early spiritual habits carry into adulthood." },
  ],
};

// Suggested building blocks learners can drop in with one click — so they pick
// from options instead of inventing everything. MAS-GLA / Vision 2026 flavored.
export const EXAMPLES: Record<NodeType, string[]> = {
  goal: [
    "Lifelong, God-centered agents of change",
    "A connected, resilient Muslim community",
    "Leaders who serve with excellence",
  ],
  outcome: [
    "Youth build consistent spiritual habits",
    "Leaders are equipped and confident",
    "Members feel a stronger sense of belonging",
    "Community advocates with principle and compassion",
    "Families are more engaged with the masjid",
  ],
  output: [
    "Monthly halaqahs delivered",
    "Leadership training completed",
    "Mentorship circles running",
    "Community events hosted",
    "Volunteers recruited and onboarded",
  ],
  activity: [
    "Host Qiyam nights",
    "Run mentored usrah circles",
    "Deliver leadership workshops",
    "Organize community iftars",
    "Train naqeebs (mentors)",
    "Launch a youth mentorship program",
  ],
};
