// MAS GLA (Muslim American Society — Greater Los Angeles) strategic framework,
// from the Amal & Company "Vision 2026" strategy report. This is the real
// model the platform is built around — not generic LMS content.

export const MAS = {
  org: "MAS GLA",
  orgFull: "Muslim American Society — Greater Los Angeles",
  partner: "Amal & Company",
  vision: "Vision 2026",
  northStar: "To move people and nurture lifelong, God-centered agents of change.",
};

// The 6-layer strategy methodology (the "Strategy House" cascade).
export const METHODOLOGY = [
  { n: 1, name: "Vision", desc: "The long-term aspiration that anchors everything." },
  { n: 2, name: "Mission", desc: "Move people and nurture lifelong, God-centered agents of change." },
  { n: 3, name: "Area of Focus", desc: "The six pillars the work is organized around." },
  { n: 4, name: "Operational Plan", desc: "How each area is executed on the ground." },
  { n: 5, name: "Resource Allocation", desc: "People, time and budget aligned to priorities." },
  { n: 6, name: "Performance Review", desc: "Measuring what matters and adjusting course." },
];

export interface AreaOfFocus {
  id: string;
  name: string;
  verbs: [string, string, string];
  icon: string;
  tone: string;
}

// The 6 Areas of Focus (Strategy House pillars).
export const AREAS_OF_FOCUS: AreaOfFocus[] = [
  { id: "islam-muslims", name: "Islam to Muslims", verbs: ["Develop", "Produce", "Distribute"], icon: "BookOpen", tone: "text-accent bg-accent/10" },
  { id: "leadership", name: "Leadership Development", verbs: ["Train", "Equip", "Support"], icon: "Users", tone: "text-primary bg-primary/10" },
  { id: "community", name: "Community Mobilization", verbs: ["Identify", "Organize", "Anchor"], icon: "Megaphone", tone: "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)]" },
  { id: "social-justice", name: "Social Justice", verbs: ["Train", "Advocate", "Develop"], icon: "Scale", tone: "text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.14)]" },
  { id: "islam-nonmuslims", name: "Islam to Non-Muslims", verbs: ["Connect", "Develop", "Distribute"], icon: "Handshake", tone: "text-accent bg-accent/10" },
  { id: "excellence", name: "Operate with Excellence", verbs: ["Foster", "Communicate", "Optimize"], icon: "Sparkles", tone: "text-primary bg-primary/10" },
];

export interface WorkstreamTask {
  name: string;
  progress: number | null; // null = no tasks yet
}
export interface Workstream {
  id: string;
  title: string;
  objective: string;
  tasks: WorkstreamTask[];
}

// Transformation workstreams ("Connecting the Dots"). Empty by default — add
// your own workstreams and tasks; no fabricated progress.
export const WORKSTREAMS: Workstream[] = [];

export function workstreamProgress(w: Workstream) {
  const vals = w.tasks.map((t) => t.progress).filter((p): p is number => p !== null);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// 12 desired defined outcomes + 4 metrics of success.
export const DESIRED_OUTCOMES = [
  "Knowledge", "Behavioral", "Capacity", "Influence", "Network", "Scale",
  "Connect", "Move", "Authentic Image", "Accepting Islam", "Welcoming", "Strategic Alignment",
];

export const SUCCESS_METRICS = [
  { name: "Authentic Knowledge Proficiency", icon: "GraduationCap" },
  { name: "Foundational Worship Practice", icon: "Heart" },
  { name: "Leadership Quality & Quantity", icon: "Users" },
  { name: "Exponential Growth & Impact", icon: "TrendingUp" },
];

// Diagnostic finding: the shift.
export const THE_SHIFT = {
  previous: [
    { label: "Reactive Execution", desc: "Programs launched without consistent alignment to mission or long-term impact." },
    { label: "Operational Strain", desc: "Heavy reliance on informal communication and unclear roles strained volunteers and resources." },
    { label: "Fragmented Leadership", desc: "Alignment challenges and cultural friction hindered collaboration." },
  ],
  forward: [
    { label: "Intentional Strategy", desc: "All initiatives are vetted for alignment with the mission and Tarbiya focus before approval." },
    { label: "Structured Systems", desc: "Professional systems for communication, performance tracking and accountability." },
    { label: "Unified Culture", desc: "A collaborative environment that empowers leaders and embraces a shared strategic direction." },
  ],
};

// ---- "Know Our Members" profile fields (rich signup) ----
export const MEMBER_ROLE_TYPES = [
  "Volunteer",
  "Team Lead",
  "Staff",
  "Department Head",
  "Leadership / Board",
  "Community Member",
];

export const DEPARTMENTS = [
  ...AREAS_OF_FOCUS.map((a) => a.name),
  "Operations",
  "Finance",
  "Communications",
];

export const COMMITMENT_LEVELS = [
  "Under 2 hrs / week",
  "2–5 hrs / week",
  "5–10 hrs / week",
  "10+ hrs / week",
];

export const TENURE_OPTIONS = ["New (< 6 months)", "6–12 months", "1–3 years", "3+ years"];

// ---- Question Zero flow (Who? → What? → Result? → Change? → Ultimate WHY?) ----
export const QUESTION_ZERO = [
  { step: "Who?", desc: "Who is the target audience — the Input?" },
  { step: "What?", desc: "What will we actually do — the activity?" },
  { step: "Result?", desc: "What immediate result / output do we expect?" },
  { step: "Change?", desc: "What change (outcome) does it create in people?" },
  { step: "Ultimate WHY?", desc: "How does it move people as lifelong, God-centered agents of change?" },
];

// ---- Programs / TOC Dashboard ----
export const DECISION_STATUS = ["Keep", "Modify", "Cancel"] as const;
export type Decision = (typeof DECISION_STATUS)[number];

export const PROGRAM_STATUS = ["On Track", "Completed", "At Risk", "Not Started"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUS)[number];

export interface Program {
  id: string;
  name: string;
  area: string; // Area of Focus name
  input: string; // who (target audience)
  baseline: string; // output baseline
  outcome: string; // desired change
  decision: Decision;
  status: ProgramStatus;
  budget: number;
  team: string[]; // Person ids assigned to the program
}

// People directory (seed for "Know Our Members"). Programs link to these.
export interface Person {
  id: string;
  name: string;
  roleType: string;
  department: string;
}
// People directory — empty by default; populated from "Know Our Members".
export const PEOPLE: Person[] = [];

// Programs — empty by default. Admins/facilitators add them on the dashboard.
export const PROGRAMS: Program[] = [];

export const PROGRAM_SUMMARY = { total: 0, onTrack: 0, completed: 0, budget: 0 };
export const DECISION_TOTALS = { Keep: 0, Modify: 0, Cancel: 0 };
