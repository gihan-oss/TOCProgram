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

export const CURRENT_USER: UserProfile = {
  id: "u-1",
  name: "Hannah Maki",
  email: "hmaki@amalandcompany.com",
  role: "participant",
  org: "Amal & Company Foundation",
  avatarColor: "199 89% 48%",
};

// ---------------- LMS ----------------
export const MODULES: ModuleDef[] = [
  {
    id: "m0",
    index: 0,
    code: "Module 0",
    title: "Q-Zero Protocol",
    summary: "Establish strategic clarity before designing anything. Learn to think in outcomes, not activities.",
    topics: ["Three Laws of Q-Zero", "If-Then Statements", "Outcome Thinking", "Traffic Light Self Assessment"],
    deliverables: ["Approved Q-Zero Statement"],
    quizQuestions: 8,
    quizPassed: true,
    assignmentSubmitted: true,
    videoWatched: true,
    lessons: [
      { id: "m0-l1", title: "The Three Laws of Q-Zero", type: "video", duration: "12 min", completed: true },
      { id: "m0-l2", title: "Writing If-Then Statements", type: "slides", duration: "8 min", completed: true },
      { id: "m0-l3", title: "Outcome Thinking Primer", type: "reading", duration: "10 min", completed: true },
      { id: "m0-l4", title: "Traffic Light Self-Assessment", type: "worksheet", duration: "15 min", completed: true },
    ],
  },
  {
    id: "m1",
    index: 1,
    code: "Module 1",
    title: "Introduction to Theory of Change",
    summary: "Build a complete causal chain from inputs to impact and understand causal logic.",
    topics: ["Inputs = WHO", "Activities", "Outputs", "Outcomes", "Impact", "Causal Logic"],
    deliverables: ["Complete Causal Chain"],
    quizQuestions: 10,
    quizPassed: true,
    assignmentSubmitted: true,
    videoWatched: true,
    lessons: [
      { id: "m1-l1", title: "Inputs, Activities & Outputs", type: "video", duration: "14 min", completed: true },
      { id: "m1-l2", title: "Outcomes vs. Impact", type: "slides", duration: "9 min", completed: true },
      { id: "m1-l3", title: "Causal Logic Deep Dive", type: "reading", duration: "12 min", completed: true },
      { id: "m1-l4", title: "Causal Chain Worksheet", type: "worksheet", duration: "20 min", completed: false },
    ],
  },
  {
    id: "m2",
    index: 2,
    code: "Module 2",
    title: "Building the Logframe",
    summary: "Translate your Theory of Change into a rigorous logical framework.",
    topics: ["Vertical Logic", "Horizontal Logic", "Indicators", "Baselines", "Targets", "Means of Verification"],
    deliverables: ["Completed Logframe"],
    quizQuestions: 12,
    quizPassed: false,
    assignmentSubmitted: false,
    videoWatched: false,
    lessons: [
      { id: "m2-l1", title: "Vertical & Horizontal Logic", type: "video", duration: "16 min", completed: false },
      { id: "m2-l2", title: "Designing Indicators", type: "slides", duration: "11 min", completed: false },
      { id: "m2-l3", title: "Baselines & Targets", type: "reading", duration: "13 min", completed: false },
      { id: "m2-l4", title: "Logframe Worksheet", type: "worksheet", duration: "25 min", completed: false },
    ],
  },
  {
    id: "m3",
    index: 3,
    code: "Module 3",
    title: "Measuring & Validating Impact",
    summary: "Build SMART indicators, manage assumptions & risk, and finalize your implementation package.",
    topics: ["SMART Indicators", "Assumptions", "Risk Ratings", "Keep / Modify / Cancel Framework"],
    deliverables: ["Measurement Plan", "Final Implementation Package"],
    quizQuestions: 12,
    quizPassed: false,
    assignmentSubmitted: false,
    videoWatched: false,
    lessons: [
      { id: "m3-l1", title: "SMART Indicators in Practice", type: "video", duration: "15 min", completed: false },
      { id: "m3-l2", title: "Assumptions & Risk Ratings", type: "slides", duration: "10 min", completed: false },
      { id: "m3-l3", title: "Keep / Modify / Cancel", type: "reading", duration: "9 min", completed: false },
      { id: "m3-l4", title: "Measurement Plan Worksheet", type: "worksheet", duration: "30 min", completed: false },
    ],
  },
];

// ---------------- Assumptions ----------------
export const ASSUMPTIONS: Assumption[] = [
  { id: "a1", statement: "Trained facilitators remain employed at partner schools through the program year.", owner: "Hannah Maki", status: "Valid", risk: "Medium", linkedOutcome: "Teachers apply new literacy methods", linkedEvidence: ["ev1"] },
  { id: "a2", statement: "Parents have the time and literacy to support at-home reading.", owner: "Daniel Osei", status: "Under Review", risk: "High", linkedOutcome: "Children read 20 min daily at home", linkedEvidence: ["ev3"] },
  { id: "a3", statement: "Donated books arrive before the school term begins.", owner: "Logistics", status: "Failed", risk: "High", linkedOutcome: "Classrooms have adequate reading material", linkedEvidence: [] },
  { id: "a4", statement: "Government curriculum policy stays stable for 18 months.", owner: "Policy Lead", status: "Unverified", risk: "Medium", linkedOutcome: "Program integrated into school day", linkedEvidence: [] },
  { id: "a5", statement: "Community volunteers sustain reading clubs post-grant.", owner: "Community Lead", status: "Valid", risk: "Low", linkedOutcome: "Reading clubs continue independently", linkedEvidence: ["ev2"] },
];

// ---------------- Theory of Change ----------------
export const TOC_NODES: TocNode[] = [
  { id: "n-goal", type: "goal", title: "Children in our region read at grade level", narrative: "Long-term impact: measurable improvement in regional childhood literacy.", indicators: ["% children reading at grade level"], evidence: ["ev1"], assumptions: [], x: 520, y: 40 },
  { id: "n-out1", type: "outcome", title: "Children read 20 min daily at home", narrative: "Sustained reading behaviour outside school.", indicators: ["Avg daily reading minutes"], evidence: ["ev3"], assumptions: ["a2"], x: 300, y: 200 },
  { id: "n-out2", type: "outcome", title: "Teachers apply new literacy methods", narrative: "Classroom practice changes after training.", indicators: ["% lessons using method"], evidence: ["ev1"], assumptions: ["a1"], x: 740, y: 200 },
  { id: "n-op1", type: "output", title: "200 parents complete reading workshop", narrative: "Parents equipped to support reading.", indicators: ["# parents trained"], evidence: [], assumptions: [], x: 300, y: 360 },
  { id: "n-op2", type: "output", title: "40 teachers trained & coached", narrative: "Teachers receive method training + coaching.", indicators: ["# teachers certified"], evidence: ["ev2"], assumptions: [], x: 740, y: 360 },
  { id: "n-act1", type: "activity", title: "Run monthly parent workshops", narrative: "Facilitated workshops across 10 schools.", indicators: ["# workshops held"], evidence: [], assumptions: [], x: 300, y: 520 },
  { id: "n-act2", type: "activity", title: "Deliver teacher training series", narrative: "6-session training + classroom coaching.", indicators: ["# sessions delivered"], evidence: [], assumptions: [], x: 740, y: 520 },
];

export const TOC_EDGES: TocEdge[] = [
  { id: "e1", from: "n-act1", to: "n-op1", assumptionId: null },
  { id: "e2", from: "n-act2", to: "n-op2", assumptionId: null },
  { id: "e3", from: "n-op1", to: "n-out1", assumptionId: "a2" },
  { id: "e4", from: "n-op2", to: "n-out2", assumptionId: "a1" },
  { id: "e5", from: "n-out1", to: "n-goal", assumptionId: null },
  { id: "e6", from: "n-out2", to: "n-goal", assumptionId: null },
];

// ---------------- Indicators ----------------
export const INDICATORS: Indicator[] = [
  { id: "i1", name: "% children reading at grade level", type: "Quantitative", level: "goal", baseline: 34, target: 60, current: 47, targetDate: "2026-12-31", frequency: "Annual", meansOfVerification: "Standardized reading assessment", unit: "%" },
  { id: "i2", name: "Avg daily reading minutes at home", type: "Quantitative", level: "outcome", baseline: 6, target: 20, current: 14, targetDate: "2026-09-30", frequency: "Quarterly", meansOfVerification: "Parent reading logs", unit: "min" },
  { id: "i3", name: "% lessons using new method", type: "Quantitative", level: "outcome", baseline: 0, target: 80, current: 52, targetDate: "2026-06-30", frequency: "Monthly", meansOfVerification: "Classroom observation rubric", unit: "%" },
  { id: "i4", name: "# parents completing workshop", type: "Quantitative", level: "output", baseline: 0, target: 200, current: 188, targetDate: "2026-05-31", frequency: "Monthly", meansOfVerification: "Workshop attendance register", unit: "" },
  { id: "i5", name: "# teachers certified", type: "Quantitative", level: "output", baseline: 0, target: 40, current: 40, targetDate: "2026-04-30", frequency: "Quarterly", meansOfVerification: "Certification records", unit: "" },
  { id: "i6", name: "Teacher confidence (qualitative)", type: "Qualitative", level: "outcome", baseline: 2, target: 4, current: 3, targetDate: "2026-06-30", frequency: "Quarterly", meansOfVerification: "Structured interviews (1-5 scale)", unit: "/5" },
];

// ---------------- Evidence ----------------
export const EVIDENCE: Evidence[] = [
  { id: "ev1", name: "Baseline Literacy Assessment 2025.pdf", kind: "PDF", tags: ["baseline", "literacy"], linkedTo: "Goal: grade-level reading", uploadedBy: "Hannah Maki", date: "2026-01-14" },
  { id: "ev2", name: "Teacher Coaching Photos.jpg", kind: "Image", tags: ["training", "teachers"], linkedTo: "Output: teachers trained", uploadedBy: "Daniel Osei", date: "2026-03-02" },
  { id: "ev3", name: "Parent Reading Logs Q1.xlsx", kind: "XLSX", tags: ["outcome", "parents"], linkedTo: "Outcome: daily reading", uploadedBy: "Hannah Maki", date: "2026-04-09" },
  { id: "ev4", name: "Workshop Curriculum.docx", kind: "DOCX", tags: ["curriculum", "workshop"], linkedTo: "Activity: parent workshops", uploadedBy: "Program Team", date: "2026-02-20" },
  { id: "ev5", name: "Regional Literacy Study (link)", kind: "URL", tags: ["research", "context"], linkedTo: "Goal: grade-level reading", uploadedBy: "Policy Lead", date: "2026-01-30" },
];

// ---------------- Knowledge base ----------------
export const KB_ARTICLES: KbArticle[] = [
  { id: "kb1", title: "Theory of Change Template Library", category: "TOC Templates", summary: "12 sector-specific TOC starting points for education, health, livelihoods and more.", readingTime: "Browse" },
  { id: "kb2", title: "Outputs vs. Outcomes: A Field Guide", category: "Best Practices", summary: "The single most common modeling error and how to avoid it.", readingTime: "7 min" },
  { id: "kb3", title: "Writing SMART Indicators", category: "Implementation Guides", summary: "Step-by-step guidance with 30 worked examples.", readingTime: "12 min" },
  { id: "kb4", title: "Webinar: Logframes for Funders", category: "Recorded Webinars", summary: "How to present a logframe that wins board confidence.", readingTime: "45 min" },
  { id: "kb5", title: "Managing a Failed Assumption", category: "Best Practices", summary: "The revision workflow when reality breaks your model.", readingTime: "6 min" },
  { id: "kb6", title: "Youth Employment Program Example", category: "Program Examples", summary: "A complete worked TOC + logframe from a social enterprise.", readingTime: "15 min" },
];

// ---------------- Implementation package ----------------
export const PACKAGE_ITEMS: PackageItem[] = [
  { key: "qzero", label: "Q-Zero Statement", status: "Approved", completeness: 100 },
  { key: "chain", label: "Causal Chain", status: "Submitted", completeness: 100 },
  { key: "toc", label: "Theory of Change", status: "In Progress", completeness: 78 },
  { key: "logframe", label: "Logframe", status: "In Progress", completeness: 64 },
  { key: "measurement", label: "Measurement Plan", status: "Not Started", completeness: 20 },
];

// ---------------- Cohort / participants ----------------
export const COHORTS: Cohort[] = [
  { id: "c1", name: "Spring 2026 — Education Cohort", program: "TOC Foundations", facilitator: "Daniel Osei", participants: 24, startDate: "2026-02-01", participationRate: 88, assignmentCompletion: 71, implementationReadiness: 63 },
  { id: "c2", name: "Spring 2026 — Health Cohort", program: "TOC Foundations", facilitator: "Amara Bello", participants: 18, startDate: "2026-02-15", participationRate: 79, assignmentCompletion: 64, implementationReadiness: 55 },
  { id: "c3", name: "Faith-Based Leaders Cohort", program: "TOC Foundations", facilitator: "Daniel Osei", participants: 15, startDate: "2026-03-01", participationRate: 92, assignmentCompletion: 80, implementationReadiness: 70 },
];

export const PARTICIPANTS: Participant[] = [
  { id: "p1", name: "Hannah Maki", org: "Amal & Company", cohort: "c1", completion: 62, implementationScore: 71, packageStatus: "In Progress", preScore: 41, postScore: 78 },
  { id: "p2", name: "Grace Mensah", org: "Hope Collective", cohort: "c1", completion: 100, implementationScore: 92, packageStatus: "Approved", preScore: 38, postScore: 88 },
  { id: "p3", name: "Samuel Tetteh", org: "Bright Futures", cohort: "c1", completion: 84, implementationScore: 77, packageStatus: "Submitted", preScore: 45, postScore: 81 },
  { id: "p4", name: "Fatima Yusuf", org: "Crescent Aid", cohort: "c2", completion: 55, implementationScore: 48, packageStatus: "In Progress", preScore: 33, postScore: 60 },
  { id: "p5", name: "John Adeyemi", org: "Unity Ministries", cohort: "c3", completion: 73, implementationScore: 66, packageStatus: "In Progress", preScore: 40, postScore: 72 },
  { id: "p6", name: "Linda Owusu", org: "Greenfield Trust", cohort: "c2", completion: 28, implementationScore: 22, packageStatus: "Not Started", preScore: 36, postScore: 0 },
];

// helper aggregates
export function implementationMaturityScore(items = PACKAGE_ITEMS) {
  const total = items.reduce((s, i) => s + i.completeness, 0);
  return Math.round(total / items.length);
}
