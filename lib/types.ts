// ---- Core domain types for the Theory of Change Operating System ----

export type Role =
  | "admin"
  | "facilitator"
  | "coordinator"
  | "participant"
  | "executive";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  org: string;
  avatarColor: string;
}

// ---- LMS ----
export type LessonType = "video" | "slides" | "reading" | "worksheet";

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  completed: boolean;
}

export interface ModuleDef {
  id: string;
  index: number;
  code: string;
  title: string;
  summary: string;
  topics: string[];
  deliverables: string[];
  lessons: Lesson[];
  quizQuestions: number;
  quizPassed: boolean;
  assignmentSubmitted: boolean;
  videoWatched: boolean;
}

// ---- Theory of Change ----
export type NodeType = "goal" | "outcome" | "output" | "activity";

export interface TocNode {
  id: string;
  type: NodeType;
  title: string;
  narrative: string;
  indicators: string[];
  evidence: string[];
  assumptions: string[]; // assumption ids
  x: number;
  y: number;
}

export interface TocEdge {
  id: string;
  from: string;
  to: string;
  assumptionId: string | null;
}

// ---- Assumptions ----
export type AssumptionStatus = "Unverified" | "Valid" | "Under Review" | "Failed";
export type RiskLevel = "Low" | "Medium" | "High";

export interface Assumption {
  id: string;
  email?: string;
  statement: string;
  owner: string;
  status: AssumptionStatus;
  risk: RiskLevel;
  linkedOutcome: string;
  linkedEvidence: string[];
}

// ---- Indicators / Measurement ----
export type IndicatorType = "Quantitative" | "Qualitative";
export type Frequency = "Monthly" | "Quarterly" | "Bi-annual" | "Annual";

export interface Indicator {
  id: string;
  name: string;
  type: IndicatorType;
  level: NodeType;
  baseline: number;
  target: number;
  current: number;
  targetDate: string;
  frequency: Frequency;
  meansOfVerification: string;
  unit: string;
}

// ---- Evidence ----
export type EvidenceKind = "PDF" | "DOCX" | "XLSX" | "Image" | "URL";

export interface Evidence {
  id: string;
  email?: string;
  name: string;
  kind: EvidenceKind;
  tags: string[];
  linkedTo: string;
  uploadedBy: string;
  date: string;
}

// ---- Knowledge base ----
export interface KbArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  readingTime: string;
}

// ---- Implementation package ----
export type PackageStatus = "Not Started" | "In Progress" | "Submitted" | "Approved";

export interface PackageItem {
  key: string;
  label: string;
  status: PackageStatus;
  completeness: number; // 0-100
}

// ---- Participants (cohort view) ----
export type TrafficLight = "green" | "yellow" | "red";

export interface Participant {
  id: string;
  name: string;
  org: string;
  cohort: string;
  completion: number;
  implementationScore: number;
  packageStatus: PackageStatus;
  preScore: number;
  postScore: number;
}

export interface Cohort {
  id: string;
  name: string;
  program: string;
  facilitator: string;
  participants: number;
  startDate: string;
  participationRate: number;
  assignmentCompletion: number;
  implementationReadiness: number;
}
