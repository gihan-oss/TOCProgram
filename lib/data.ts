import type {
  Assumption,
  Cohort,
  Evidence,
  Indicator,
  KbArticle,
  ModuleDef,
  PackageItem,
  Participant,
  Role,
  TocEdge,
  TocNode,
  UserProfile,
} from "./types";

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "admin", label: "System Administrator", description: "Manage organizations, cohorts, facilitators, programs, templates & permissions." },
  { id: "facilitator", label: "Facilitator", description: "Manage cohorts, review assignments, give feedback, monitor implementation." },
  { id: "coordinator", label: "Program Coordinator", description: "Track completion, monitor artifacts, communicate, export reports." },
  { id: "participant", label: "Participant", description: "Learn, build TOC & logframes, submit implementation artifacts." },
  { id: "executive", label: "Executive / Leadership", description: "Read-only dashboards: implementation rates, impact, portfolio health." },
];

// Fallback identity only — the real signed-in user comes from auth.
export const CURRENT_USER: UserProfile = {
  id: "u-1",
  name: "Member",
  email: "",
  role: "participant",
  org: "",
  avatarColor: "243 75% 60%",
};

// ---------------------------------------------------------------------------
// The platform starts BLANK. Content (modules, indicators, programs, evidence,
// people…) is added by admins/facilitators and participants — nothing is
// pre-filled. These seeds are intentionally empty.
// ---------------------------------------------------------------------------

export const MODULES: ModuleDef[] = []; // legacy LMS shape; learning content now lives in lib/content.ts

export const ASSUMPTIONS: Assumption[] = [];

export const TOC_NODES: TocNode[] = [];
export const TOC_EDGES: TocEdge[] = [];

export const INDICATORS: Indicator[] = [];

export const EVIDENCE: Evidence[] = [];

export const KB_ARTICLES: KbArticle[] = [];

// The five required artifacts of the implementation package — framework, all
// blank until the participant works through them.
export const PACKAGE_ITEMS: PackageItem[] = [
  { key: "qzero", label: "Q-Zero Statement", status: "Not Started", completeness: 0 },
  { key: "chain", label: "Causal Chain", status: "Not Started", completeness: 0 },
  { key: "toc", label: "Theory of Change", status: "Not Started", completeness: 0 },
  { key: "logframe", label: "Logframe", status: "Not Started", completeness: 0 },
  { key: "measurement", label: "Measurement Plan", status: "Not Started", completeness: 0 },
];

export const COHORTS: Cohort[] = [];
export const PARTICIPANTS: Participant[] = [];

// helper aggregates
export function implementationMaturityScore(items = PACKAGE_ITEMS) {
  if (items.length === 0) return 0;
  const total = items.reduce((s, i) => s + i.completeness, 0);
  return Math.round(total / items.length);
}
