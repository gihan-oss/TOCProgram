"use client";

// Persistence for the program-management modules (Tasks, Financials, M&E, Budget).
// Each entity type has its own BaseStore subclass.
// Custom operations (addMeasurement, saveBudgetLine) sit on top.

import { BaseStore, lsRead } from "./base-store";
import type { BudgetLine, FinancialEntry, Measurement, ProgramIndicator, Task } from "./pm-types";

// ===========================================================================
// Row mappers: Supabase snake_case -> application camelCase
// ===========================================================================
const r2t = (r: Record<string, unknown>): Task => ({
  id: r.id as string,
  programId: r.program_id as string,
  title: (r.title as string) ?? "",
  description: r.description as string | undefined,
  status: (r.status as Task["status"]) ?? "in_progress",
  dueDate: r.due_date as string | undefined,
  assignee: r.assignee as string | undefined,
  priority: r.priority as Task["priority"] | undefined,
  createdAt: r.created_at as string,
  completedAt: r.completed_at as string | null | undefined,
});
const t2r = (t: Task) => ({
  id: t.id, program_id: t.programId, title: t.title, description: t.description ?? "",
  status: t.status, due_date: t.dueDate ?? null, assignee: t.assignee ?? "",
  priority: t.priority ?? "medium", completed_at: t.completedAt ?? null,
  created_at: t.createdAt,
});

const r2f = (r: Record<string, unknown>): FinancialEntry => ({
  id: r.id as string,
  programId: r.program_id as string,
  type: (r.type as FinancialEntry["type"]) ?? "expense",
  amount: Number(r.amount ?? 0),
  description: r.description as string | undefined,
  category: r.category as string | undefined,
  date: r.date as string | undefined,
  createdAt: r.created_at as string,
});
const f2r = (e: FinancialEntry) => ({
  id: e.id, program_id: e.programId, type: e.type, amount: e.amount,
  description: e.description ?? "", category: e.category ?? "",
  date: e.date ?? null, created_at: e.createdAt,
});

const r2i = (r: Record<string, unknown>): ProgramIndicator => ({
  id: r.id as string,
  email: r.email as string | undefined,
  programId: r.program_id as string | undefined,
  name: (r.name as string) ?? "",
  description: r.description as string | undefined,
  type: (r.type as ProgramIndicator["type"]) ?? "Quantitative",
  level: (r.level as ProgramIndicator["level"]) ?? "output",
  baseline: Number(r.baseline ?? 0),
  target: Number(r.target ?? 0),
  current: Number(r.current ?? 0),
  targetDate: r.target_date as string | undefined,
  frequency: r.frequency as string | undefined,
  meansOfVerification: r.means_of_verification as string | undefined,
  unit: r.unit as string | undefined,
  measurements: Array.isArray(r.measurements) ? (r.measurements as Measurement[]) : [],
  createdAt: r.created_at as string,
});
const i2r = (i: ProgramIndicator) => ({
  id: i.id, email: i.email ?? null, program_id: i.programId ?? null,
  name: i.name, description: i.description ?? "",
  type: i.type, level: i.level,
  baseline: i.baseline, target: i.target, current: i.current,
  target_date: i.targetDate ?? null, frequency: i.frequency ?? "",
  means_of_verification: i.meansOfVerification ?? "", unit: i.unit ?? "",
  measurements: i.measurements, created_at: i.createdAt,
});

const r2b = (r: Record<string, unknown>): BudgetLine => ({
  id: r.id as string,
  programId: r.program_id as string,
  category: (r.category as string) ?? "",
  description: r.description as string | undefined,
  amount: Number(r.amount ?? 0),
});
const b2r = (l: BudgetLine) => ({
  id: l.id, program_id: l.programId, category: l.category,
  description: l.description ?? "", amount: l.amount,
});

// ===========================================================================
// Store instances
// ===========================================================================

class TaskStore extends BaseStore<Task> {
  table = "program_tasks";
  lsKey = (pid: string) => `pm-tasks:${pid}`;
  scopeColumn = "program_id";
  fromRow = r2t;
  toRow = t2r;
  sortFn = (a: Task, b: Task) => b.createdAt.localeCompare(a.createdAt);
  idPrefix = "task";
}
const taskStore = new TaskStore();

class FinancialStore extends BaseStore<FinancialEntry> {
  table = "program_financials";
  lsKey = (pid: string) => `pm-financials:${pid}`;
  scopeColumn = "program_id";
  fromRow = r2f;
  toRow = f2r;
  sortFn = (a: FinancialEntry, b: FinancialEntry) => (b.date ?? "").localeCompare(a.date ?? "");
  idPrefix = "fin";
}
const finStore = new FinancialStore();

class IndicatorStore extends BaseStore<ProgramIndicator> {
  table = "program_indicators";
  lsKey = (pid: string) => `pm-indicators:${pid}`;
  scopeColumn = "program_id";
  fromRow = r2i;
  toRow = i2r;
  idPrefix = "ind";
  sortFn = (a: ProgramIndicator, b: ProgramIndicator) => b.createdAt.localeCompare(a.createdAt);

  async listAll(): Promise<ProgramIndicator[]> {
    // Collect known program IDs from localStorage so the base listAll can
    // fall back to the correct scoped keys when Supabase is unavailable.
    const prefix = (this.lsKey as (scope: string) => string)("");
    const pids = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        pids.add(key.slice(prefix.length));
      }
    } catch { /* iterating localStorage — ignore */ }
    return super.listAll([...pids]);
  }
}
const indStore = new IndicatorStore();

class BudgetStore extends BaseStore<BudgetLine> {
  table = "program_budget_lines";
  lsKey = (pid: string) => `pm-budget:${pid}`;
  scopeColumn = "program_id";
  fromRow = r2b;
  toRow = b2r;
  idPrefix = "bud";
}
const budgetStore = new BudgetStore();

// ===========================================================================
// Exported helpers (custom operations)
// ===========================================================================

export async function addMeasurement(
  ind: ProgramIndicator,
  input: { value: number; note?: string; isBaseline?: boolean },
): Promise<ProgramIndicator> {
  const measurement: Measurement = {
    date: new Date().toISOString().slice(0, 10),
    value: input.value,
    note: input.note,
  };
  return indStore.update(ind, { measurements: [...ind.measurements, measurement] });
}

export async function saveBudgetLine(
  input: Omit<BudgetLine, "id"> & { id?: string },
): Promise<BudgetLine> {
  if (input.id) {
    const existing = lsRead<BudgetLine>(budgetStore.lsKey(input.programId)).find((l: BudgetLine) => l.id === input.id);
    if (existing) return budgetStore.update(existing, input);
  }
  return budgetStore.create(input, input.programId);
}

// ===========================================================================
// Re-exported CRUD — thin wrappers with original signatures that inject
// auto-generated fields before delegating to the base store.
// ===========================================================================

// Tasks
export const listTasks = taskStore.list.bind(taskStore);
export const createTask = (input: Omit<Task, "id" | "createdAt" | "completedAt">) =>
  taskStore.create({ ...input, createdAt: new Date().toISOString(), completedAt: null });
export const updateTask = taskStore.update.bind(taskStore);
export const deleteTask = taskStore.delete.bind(taskStore);

// Financials
export const listFinancials = finStore.list.bind(finStore);
export const createFinancial = (input: Omit<FinancialEntry, "id" | "createdAt">) =>
  finStore.create({ ...input, createdAt: new Date().toISOString() });
export const updateFinancial = finStore.update.bind(finStore);
export const deleteFinancial = finStore.delete.bind(finStore);

// Indicators
export const listIndicators = indStore.list.bind(indStore);
export const listAllIndicators = (email?: string) =>
  email ? indStore.listBy("email", email) : indStore.listAll();
export const createIndicator = (input: Omit<ProgramIndicator, "id" | "createdAt" | "measurements">) =>
  indStore.create({ ...input, createdAt: new Date().toISOString(), measurements: [] });
export const updateIndicator = indStore.update.bind(indStore);
export const deleteIndicator = indStore.delete.bind(indStore);

// Budget lines
export const listBudgetLines = budgetStore.list.bind(budgetStore);
export const deleteBudgetLine = budgetStore.delete.bind(budgetStore);

// ---- Combo-box suggestions (cross-program) ---------------------------------
import { apiFetch } from "./api-fetch";

export async function fetchSuggestions(): Promise<{
  categories: string[]; assignees: string[];
}> {
  try {
    const res = await apiFetch("/api/pm/suggestions");
    if (res.ok) return await res.json();
  } catch {}
  return { categories: [], assignees: [] };
}
