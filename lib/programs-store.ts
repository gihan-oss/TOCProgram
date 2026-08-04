"use client";

// Row-per-program persistence via BaseStore.
// Legacy single-JSON-doc ({ id: "default", data: [...] }) is migrated once.

import { BaseStore, lsRead, lsWrite } from "./base-store";
import { apiFetch } from "./api-fetch";
import { PROGRAMS, type Program } from "./mas";

const PROGRAMS_KEY = "toc-programs";

// ---- Row mappers -----------------------------------------------------------
const r2p = (r: Record<string, unknown>): Program => ({
  id: r.id as string,
  email: r.email as string | undefined,
  name: (r.name as string) ?? "",
  area: (r.area as string) ?? "",
  subFocus: r.sub_focus as string | undefined,
  questionZero: r.question_zero as string | undefined,
  input: (r.input as string) ?? "",
  baseline: (r.baseline as string) ?? "",
  target: r.target as string | undefined,
  outcome: (r.outcome as string) ?? "",
  decision: (r.decision as Program["decision"]) ?? "Keep",
  status: (r.status as Program["status"]) ?? "Not Started",
  budget: Number(r.budget ?? 0),
  department: r.department as string | undefined,
  region: r.region as string | undefined,
  team: Array.isArray(r.team) ? (r.team as string[]) : [],
});

const p2r = (p: Program) => ({
  id: p.id, email: p.email ?? null,
  name: p.name, area: p.area, sub_focus: p.subFocus ?? null,
  question_zero: p.questionZero ?? null, input: p.input, baseline: p.baseline,
  target: p.target ?? null, outcome: p.outcome, decision: p.decision,
  status: p.status, budget: p.budget, department: p.department ?? null,
  region: p.region ?? null, team: p.team,
});

// ---- Store -----------------------------------------------------------------
class ProgramStore extends BaseStore<Program> {
  table = "programs";
  lsKey = PROGRAMS_KEY;
  fromRow = r2p;
  toRow = p2r;
  sortFn = (a: Program, b: Program) => a.name.localeCompare(b.name);
  idPrefix = "prog";
}
const store = new ProgramStore();

// ---- Legacy migration (runs once, best-effort) ----------------------------
async function migrateLegacy(): Promise<void> {
  try {
    const res = await apiFetch("/api/programs/legacy");
    if (!res.ok) return;
    const row = await res.json();
    const list = row?.data as Program[] | undefined;
    if (!list || list.length === 0) return;
    await Promise.all(list.map((p) =>
      apiFetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // p is a camelCase Program — convert to snake_case rows via p2r.
        body: JSON.stringify({ ...p2r(p), updated_at: new Date().toISOString() }),
      }),
    ));
    await apiFetch("/api/programs/legacy", { method: "DELETE" });
  } catch { /* retried next load */ }
}

// ---- Public API ------------------------------------------------------------

export async function loadPrograms(): Promise<Program[]> {
  await migrateLegacy();
  const rows = await store.list();
  if (rows.length > 0) return rows;
  // localStorage was already checked by store.list — fall through to seed.
  return PROGRAMS;
}

export async function saveProgram(p: Program): Promise<Program> {
  // p has an id → update existing. The entity and patch are the same full Program.
  return store.update(p, p);
}

export async function createProgram(input: Omit<Program, "id">): Promise<Program> {
  return store.create(input);
}

export async function deleteProgram(id: string): Promise<void> {
  await store.delete({ id } as Program);
}
