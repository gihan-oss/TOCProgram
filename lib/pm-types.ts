// ---- Program management types ------------------------------------------------
// Tasks, Financial entries, program-scoped M&E indicators, and Budget lines.
// These attach to a Program by `programId`.

// ---- Tasks -----------------------------------------------------------------
export const TASK_STATUS = ["delayed_pending", "in_progress", "completed", "paused"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  delayed_pending: "Delayed/Pending",
  in_progress: "In Progress",
  completed: "Completed",
  paused: "Paused",
};

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low", medium: "Medium", high: "High", urgent: "Urgent",
};

export interface Task {
  id: string;
  programId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  assignee?: string;
  priority?: TaskPriority;
  createdAt: string;
  completedAt?: string | null;
}

export interface TaskCounts {
  delayed_pending: number;
  in_progress: number;
  completed: number;
  paused: number;
  total: number;
}

export function countTasks(tasks: Task[]): TaskCounts {
  const c: TaskCounts = { delayed_pending: 0, in_progress: 0, completed: 0, paused: 0, total: tasks.length };
  for (const t of tasks) c[t.status] += 1;
  return c;
}

// ---- Financial entries -----------------------------------------------------
export const FINANCIAL_TYPES = ["budget", "income", "expense"] as const;
export type FinancialType = (typeof FINANCIAL_TYPES)[number];

export const FINANCIAL_TYPE_LABEL: Record<FinancialType, string> = {
  budget: "Budget", income: "Income", expense: "Expense",
};

export interface FinancialEntry {
  id: string;
  programId: string;
  type: FinancialType;
  amount: number;
  description?: string;
  category?: string;
  date?: string;
  createdAt: string;
}

// ---- Program-scoped Indicators ---------------------------------------------
export const INDICATOR_LEVELS = ["goal", "outcome", "output", "activity"] as const;
export type IndicatorLevel = (typeof INDICATOR_LEVELS)[number];

export const INDICATOR_LEVEL_LABEL: Record<IndicatorLevel, string> = {
  goal: "Goal", outcome: "Outcome", output: "Output", activity: "Activity",
};

export interface Measurement {
  date: string;
  value: number;
  note?: string;
}

export interface ProgramIndicator {
  id: string;
  programId: string;
  name: string;
  description?: string;
  type: "Quantitative" | "Qualitative";
  level: IndicatorLevel;
  baseline: number;
  target: number;
  current: number;
  targetDate?: string;
  frequency?: string;
  meansOfVerification?: string;
  unit?: string;
  measurements: Measurement[];
  createdAt: string;
}

export function currentValue(ind: ProgramIndicator): number {
  const m = ind.measurements;
  if (m.length === 0) return ind.current;
  return m[m.length - 1].value;
}

export function progressPct(ind: ProgramIndicator): number {
  if (ind.target === ind.baseline) return 0;
  return Math.round(((currentValue(ind) - ind.baseline) / (ind.target - ind.baseline)) * 100);
}

// ---- Budget lines ----------------------------------------------------------
export interface BudgetLine {
  id: string;
  programId: string;
  category: string;
  description?: string;
  amount: number;
}

export function budgetTotal(lines: BudgetLine[]): number {
  return lines.reduce((s, l) => s + l.amount, 0);
}

export function varianceByCategory(lines: BudgetLine[]): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.category, (map.get(l.category) ?? 0) + l.amount);
  return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
}
