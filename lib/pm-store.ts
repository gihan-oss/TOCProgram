"use client";

// Persistence for the program-management modules (Tasks, Financials, M&E, Budget).
//
// Uses Supabase directly (getSupabaseBrowserClient pattern from content.ts)
// with localStorage fallback for demo mode. No API routes needed.

import { getSupabaseBrowserClient } from "./supabase";
import type { BudgetLine, FinancialEntry, Measurement, ProgramIndicator, Task } from "./pm-types";

const uid = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

// ---- localStorage helpers (demo-mode fallback) ----------------------------
const TKEY = (p: string) => `pm-tasks:${p}`;
const FKEY = (p: string) => `pm-financials:${p}`;
const IKEY = (p: string) => `pm-indicators:${p}`;
const BKEY = (p: string) => `pm-budget:${p}`;
function lsRead<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; }
}
function lsWrite<T>(key: string, rows: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(rows)); } catch {}
}

// ===========================================================================
// TASKS
// ===========================================================================
export async function listTasks(programId: string): Promise<Task[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("program_tasks")
        .select("*")
        .eq("program_id", programId)
        .order("created_at", { ascending: false });
      if (!error) return (data ?? []).map(rowToTask);
    } catch { /* fall through to localStorage */ }
  }
  return lsRead<Task>(TKEY(programId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createTask(input: Omit<Task, "id" | "createdAt" | "completedAt">): Promise<Task> {
  const task: Task = { ...input, id: uid("task"), createdAt: new Date().toISOString(), completedAt: null };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_tasks").insert(taskToRow(task));
      if (!error) return task;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(TKEY(task.programId), [task, ...lsRead<Task>(TKEY(task.programId))]);
  return task;
}

export async function updateTask(task: Task, patch: Partial<Task>): Promise<Task> {
  const next: Task = { ...task, ...patch };
  if (next.status === "completed" && !next.completedAt) next.completedAt = new Date().toISOString();
  if (next.status !== "completed") next.completedAt = null;
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_tasks").update(taskToRow(next)).eq("id", next.id);
      if (!error) return next;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(TKEY(next.programId), lsRead<Task>(TKEY(next.programId)).map((t) => (t.id === next.id ? next : t)));
  return next;
}

export async function deleteTask(task: Task): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_tasks").delete().eq("id", task.id);
      if (!error) return;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(TKEY(task.programId), lsRead<Task>(TKEY(task.programId)).filter((t) => t.id !== task.id));
}

// ===========================================================================
// FINANCIAL ENTRIES
// ===========================================================================
export async function listFinancials(programId: string): Promise<FinancialEntry[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("program_financials")
        .select("*")
        .eq("program_id", programId)
        .order("date", { ascending: false });
      if (!error) return (data ?? []).map(rowToFinancial);
    } catch { /* fall through to localStorage */ }
  }
  return lsRead<FinancialEntry>(FKEY(programId)).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export async function createFinancial(input: Omit<FinancialEntry, "id" | "createdAt">): Promise<FinancialEntry> {
  const entry: FinancialEntry = { ...input, id: uid("fin"), createdAt: new Date().toISOString() };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_financials").insert(financialToRow(entry));
      if (!error) return entry;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(FKEY(entry.programId), [entry, ...lsRead<FinancialEntry>(FKEY(entry.programId))]);
  return entry;
}

export async function deleteFinancial(entry: FinancialEntry): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_financials").delete().eq("id", entry.id);
      if (!error) return;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(FKEY(entry.programId), lsRead<FinancialEntry>(FKEY(entry.programId)).filter((e) => e.id !== entry.id));
}

export async function updateFinancial(entry: FinancialEntry, patch: Partial<FinancialEntry>): Promise<FinancialEntry> {
  const next: FinancialEntry = { ...entry, ...patch };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_financials").update(financialToRow(next)).eq("id", next.id);
      if (!error) return next;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(FKEY(next.programId), lsRead<FinancialEntry>(FKEY(next.programId)).map((e) => (e.id === next.id ? next : e)));
  return next;
}

// ===========================================================================
// M&E INDICATORS (+ measurement history)
// ===========================================================================
export async function listIndicators(programId: string): Promise<ProgramIndicator[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("program_indicators")
        .select("*")
        .eq("program_id", programId)
        .order("created_at", { ascending: false });
      if (!error) return (data ?? []).map(rowToIndicator);
    } catch { /* fall through to localStorage */ }
  }
  return lsRead<ProgramIndicator>(IKEY(programId));
}

export async function createIndicator(
  input: Omit<ProgramIndicator, "id" | "createdAt" | "measurements"> & { measurements?: Measurement[] },
): Promise<ProgramIndicator> {
  const ind: ProgramIndicator = { ...input, measurements: input.measurements ?? [], id: uid("ind"), createdAt: new Date().toISOString() };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_indicators").insert(indicatorToRow(ind));
      if (!error) return ind;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(IKEY(ind.programId), [...lsRead<ProgramIndicator>(IKEY(ind.programId)), ind]);
  return ind;
}

export async function updateIndicator(ind: ProgramIndicator, patch: Partial<ProgramIndicator>): Promise<ProgramIndicator> {
  const next: ProgramIndicator = { ...ind, ...patch };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_indicators").update(indicatorToRow(next)).eq("id", next.id);
      if (!error) return next;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(IKEY(next.programId), lsRead<ProgramIndicator>(IKEY(next.programId)).map((i) => (i.id === next.id ? next : i)));
  return next;
}

export async function deleteIndicator(ind: ProgramIndicator): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_indicators").delete().eq("id", ind.id);
      if (!error) return;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(IKEY(ind.programId), lsRead<ProgramIndicator>(IKEY(ind.programId)).filter((i) => i.id !== ind.id));
}

export async function addMeasurement(
  ind: ProgramIndicator,
  input: { value: number; note?: string; isBaseline?: boolean },
): Promise<ProgramIndicator> {
  const measurement: Measurement = {
    date: new Date().toISOString().slice(0, 10),
    value: input.value,
    note: input.note,
  };
  return updateIndicator(ind, { measurements: [...ind.measurements, measurement] });
}

// ===========================================================================
// BUDGET LINES (Model B: budget by category)
// ===========================================================================
export async function listBudgetLines(programId: string): Promise<BudgetLine[]> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("program_budget_lines")
        .select("*")
        .eq("program_id", programId)
        .order("category");
      if (!error) return (data ?? []).map(rowToBudgetLine);
    } catch { /* fall through to localStorage */ }
  }
  return lsRead<BudgetLine>(BKEY(programId));
}

export async function saveBudgetLine(
  input: Omit<BudgetLine, "id"> & { id?: string },
): Promise<BudgetLine> {
  const line: BudgetLine = { ...input, id: input.id ?? uid("bud") };
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_budget_lines").upsert(budgetLineToRow(line), { onConflict: "id" });
      if (!error) return line;
    } catch { /* fall through to localStorage */ }
  }
  const rows = lsRead<BudgetLine>(BKEY(line.programId));
  const idx = rows.findIndex((r) => r.id === line.id);
  if (idx >= 0) rows[idx] = line; else rows.push(line);
  lsWrite(BKEY(line.programId), rows);
  return line;
}

export async function deleteBudgetLine(line: BudgetLine): Promise<void> {
  const sb = getSupabaseBrowserClient();
  if (sb) {
    try {
      const { error } = await sb.from("program_budget_lines").delete().eq("id", line.id);
      if (!error) return;
    } catch { /* fall through to localStorage */ }
  }
  lsWrite(BKEY(line.programId), lsRead<BudgetLine>(BKEY(line.programId)).filter((r) => r.id !== line.id));
}

// ===========================================================================
// Row mappers: Supabase snake_case ↔ application camelCase
// ===========================================================================
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    programId: row.program_id as string,
    title: (row.title as string) ?? "",
    description: row.description as string | undefined,
    status: (row.status as Task["status"]) ?? "in_progress",
    dueDate: row.due_date as string | undefined,
    assignee: row.assignee as string | undefined,
    priority: row.priority as Task["priority"] | undefined,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | null | undefined,
  };
}
function taskToRow(t: Task) {
  return {
    id: t.id, program_id: t.programId, title: t.title, description: t.description ?? "",
    status: t.status, due_date: t.dueDate ?? null, assignee: t.assignee ?? "",
    priority: t.priority ?? "medium", completed_at: t.completedAt ?? null,
    created_at: t.createdAt,
  };
}

function rowToFinancial(row: Record<string, unknown>): FinancialEntry {
  return {
    id: row.id as string,
    programId: row.program_id as string,
    type: (row.type as FinancialEntry["type"]) ?? "expense",
    amount: Number(row.amount ?? 0),
    description: row.description as string | undefined,
    category: row.category as string | undefined,
    date: row.date as string | undefined,
    createdAt: row.created_at as string,
  };
}
function financialToRow(e: FinancialEntry) {
  return {
    id: e.id, program_id: e.programId, type: e.type, amount: e.amount,
    description: e.description ?? "", category: e.category ?? "",
    date: e.date ?? null, created_at: e.createdAt,
  };
}

function rowToIndicator(row: Record<string, unknown>): ProgramIndicator {
  return {
    id: row.id as string,
    programId: row.program_id as string,
    name: (row.name as string) ?? "",
    type: (row.type as ProgramIndicator["type"]) ?? "Quantitative",
    level: (row.level as ProgramIndicator["level"]) ?? "output",
    baseline: Number(row.baseline ?? 0),
    target: Number(row.target ?? 0),
    current: Number(row.current ?? 0),
    targetDate: row.target_date as string | undefined,
    frequency: row.frequency as string | undefined,
    meansOfVerification: row.means_of_verification as string | undefined,
    unit: row.unit as string | undefined,
    measurements: (row.measurements as Measurement[]) ?? [],
    createdAt: row.created_at as string,
  };
}
function indicatorToRow(i: ProgramIndicator) {
  return {
    id: i.id, program_id: i.programId, name: i.name, description: i.description ?? "",
    type: i.type, level: i.level,
    baseline: i.baseline, target: i.target, current: i.current,
    target_date: i.targetDate ?? null, frequency: i.frequency ?? "",
    means_of_verification: i.meansOfVerification ?? "", unit: i.unit ?? "",
    measurements: i.measurements, created_at: i.createdAt,
  };
}

function rowToBudgetLine(row: Record<string, unknown>): BudgetLine {
  return {
    id: row.id as string,
    programId: row.program_id as string,
    category: (row.category as string) ?? "",
    description: row.description as string | undefined,
    amount: Number(row.amount ?? 0),
  };
}
function budgetLineToRow(l: BudgetLine) {
  return {
    id: l.id, program_id: l.programId, category: l.category,
    description: l.description ?? "", amount: l.amount,
  };
}
