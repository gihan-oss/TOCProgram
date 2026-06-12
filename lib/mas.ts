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

// The 4 internal transformation workstreams ("Connecting the Dots" status).
export const WORKSTREAMS: Workstream[] = [
  {
    id: "north-star",
    title: "Setting the North Star",
    objective: "Unify members on the Areas of Focus; affirm Tarbiya as the core pillar and shift from activity-driven to impact-driven planning.",
    tasks: [
      { name: "Introduce Areas of Focus", progress: 100 },
      { name: "Assess Orgs Alignment", progress: 83 },
      { name: "MAS GLA Organizational Norms", progress: 80 },
      { name: "Communicate Defined Areas", progress: 50 },
      { name: "Localizing Focus Areas", progress: null },
    ],
  },
  {
    id: "do-it-right",
    title: "Do It Right & Do It Together",
    objective: "Build operational infrastructure and team cohesion — operational breakdown and a role documentation system.",
    tasks: [
      { name: "Organization Structure", progress: 38 },
      { name: "Specialized Programs Strategy", progress: 70 },
      { name: "TOC Operational Plan Template", progress: 92 },
      { name: "Operations Dynamic Dashboard", progress: 0 },
      { name: "Proper Financial Infrastructure", progress: 10 },
    ],
  },
  {
    id: "resources",
    title: "Better Resource Allocation",
    objective: "Prevent burnout and ensure sustainability — CRM exploration and centralizing member information.",
    tasks: [
      { name: "Develop CRM 2.0", progress: 70 },
      { name: "Know Our Members Campaign", progress: 0 },
      { name: "Member Engagement Office", progress: 0 },
    ],
  },
  {
    id: "measure",
    title: "Measure What Matters",
    objective: "Establish operational excellence — move beyond 'feelings' to data; adopt Question Zero and Theory of Change for every program.",
    tasks: [
      { name: "Program Alignment", progress: 69 },
      { name: "TOC Development (each program)", progress: 86 },
      { name: "Monitoring & Evaluation", progress: 21 },
      { name: "Program Management Dashboard", progress: 69 },
    ],
  },
];

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
export const PEOPLE: Person[] = [
  { id: "u-omar", name: "Omar Farouk", roleType: "Department Head", department: "Leadership Development" },
  { id: "u-aisha", name: "Aisha Rahman", roleType: "Team Lead", department: "Islam to Muslims" },
  { id: "u-yusuf", name: "Yusuf Ali", roleType: "Volunteer", department: "Community Mobilization" },
  { id: "u-layla", name: "Layla Hassan", roleType: "Staff", department: "Operate with Excellence" },
  { id: "u-bilal", name: "Bilal Ahmed", roleType: "Volunteer", department: "Social Justice" },
  { id: "u-khadija", name: "Khadija Noor", roleType: "Team Lead", department: "Islam to Non-Muslims" },
  { id: "u-hamza", name: "Hamza Sayed", roleType: "Volunteer", department: "Leadership Development" },
  { id: "u-sara", name: "Sara Malik", roleType: "Staff", department: "Communications" },
];

// Representative sample from the MAS GLA TOC Dashboard (Airtable).
export const PROGRAMS: Program[] = [
  { id: "p1", name: "Revive and Reflect Qiyam", area: "Islam to Muslims", input: "High School Juniors & Seniors, College", baseline: "150 attendees · 2 Masajid", outcome: "Behavioral", decision: "Keep", status: "On Track", budget: 8000, team: ["u-aisha", "u-yusuf"] },
  { id: "p2", name: "Youth Conference", area: "Islam to Muslims", input: "High School & College Youth", baseline: "150 attendees", outcome: "Knowledge", decision: "Keep", status: "On Track", budget: 12000, team: ["u-aisha"] },
  { id: "p3", name: "From the Crescent to the Crown", area: "Islam to Muslims", input: "New Muslims & Youth", baseline: "60 attendees", outcome: "Behavioral", decision: "Modify", status: "Not Started", budget: 5000, team: [] },
  { id: "p4", name: "The Effective Muslim Activist", area: "Leadership Development", input: "College Students in MSA / Social Justice", baseline: "1 campus event · 50 attendees", outcome: "Capacity", decision: "Keep", status: "On Track", budget: 4000, team: ["u-omar", "u-hamza"] },
  { id: "p5", name: "Agents of Change – Revivers", area: "Leadership Development", input: "College MSA Members & Leaders", baseline: "1 campus event · 50 attendees", outcome: "Influence", decision: "Modify", status: "At Risk", budget: 3500, team: ["u-omar"] },
  { id: "p6", name: "Tarbiya and Ilm Camp", area: "Leadership Development", input: "Youth & Emerging Leaders", baseline: "80 participants", outcome: "Knowledge", decision: "Keep", status: "On Track", budget: 9000, team: ["u-hamza"] },
  { id: "p7", name: "Inland Empire Islamic Knowledge", area: "Community Mobilization", input: "Middle & High School Students", baseline: "50 students", outcome: "Network", decision: "Keep", status: "Not Started", budget: 3000, team: ["u-yusuf"] },
  { id: "p8", name: "Salatul Istisqa", area: "Community Mobilization", input: "All Ages in the Muslim Community", baseline: "10 Masajid involved", outcome: "Move", decision: "Keep", status: "Completed", budget: 1500, team: ["u-yusuf"] },
  { id: "p9", name: "Lighthouse Young Professionals", area: "Community Mobilization", input: "Young Professionals", baseline: "40 attendees", outcome: "Connect", decision: "Modify", status: "Not Started", budget: 2500, team: [] },
  { id: "p10", name: "Voices Unveiled Spiritual", area: "Social Justice", input: "College Students in MSA", baseline: "70 attendees", outcome: "Knowledge", decision: "Modify", status: "At Risk", budget: 4500, team: ["u-bilal"] },
];

// Portfolio totals (as shown on the live dashboard).
export const PROGRAM_SUMMARY = { total: 42, onTrack: 2, completed: 1, budget: 60000 };
export const DECISION_TOTALS = { Keep: 25, Modify: 12, Cancel: 5 };
