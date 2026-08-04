import { NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { requireUser, requireStaff } from "@/lib/api-auth";

// Dynamic PM route: /api/pm/[type]
// Handles CRUD for: program_tasks, program_financials, program_indicators,
// program_budget_lines, assumptions, evidence

const ALLOWED_TABLES = [
  "program_tasks",
  "program_financials",
  "program_indicators",
  "program_budget_lines",
  "assumptions",
  "evidence",
];

// Per-table column whitelist — every column name that appears in a SQL
// identifier position (scopeColumn, filterCol, INSERT column list,
// UPDATE SET clause) must be in this set. Any column NOT listed here is
// rejected with 400. Matches db/init/01-schema.sql exactly.
const COLUMNS: Record<string, ReadonlySet<string>> = {
  program_tasks: new Set(["id", "program_id", "title", "description", "status", "due_date", "assignee", "priority", "completed_at", "created_at"]),
  program_financials: new Set(["id", "program_id", "type", "amount", "description", "category", "date", "created_at"]),
  program_indicators: new Set(["id", "email", "program_id", "name", "description", "type", "level", "unit", "baseline", "target", "current", "target_date", "frequency", "means_of_verification", "measurements", "created_at"]),
  program_budget_lines: new Set(["id", "program_id", "category", "description", "amount", "created_at"]),
  assumptions: new Set(["id", "email", "statement", "owner", "status", "risk", "linked_outcome", "linked_evidence", "created_at", "updated_at"]),
  evidence: new Set(["id", "email", "name", "kind", "tags", "linked_to", "uploaded_by", "date", "created_at"]),
};

function validColumns(type: string): ReadonlySet<string> {
  return COLUMNS[type] ?? new Set();
}

/** Returns a 400 Response when a column is not in the whitelist, null otherwise. */
function validateColumn(type: string, col: string): Response | null {
  if (!validColumns(type).has(col)) {
    return NextResponse.json({ error: `Unknown column "${col}" for table "${type}"` }, { status: 400 });
  }
  return null;
}

// Columns that hold JSON (jsonb) — the client sends them already stringified
// (assumptions/evidence stores) or as raw objects (indicator measurements),
// so we normalise here: JSON.stringify + ::jsonb cast.
const JSONB_COLUMNS: Record<string, string[]> = {
  program_indicators: ["measurements"],
  assumptions: ["linked_evidence"],
  evidence: ["tags"],
};

// Serialise a value for the DB: jsonb columns get JSON.stringify (they arrive
// as objects OR already-stringified JSON), everything else passes through.
function toDbValue(type: string, col: string, v: unknown): unknown {
  const jsonbCols = JSONB_COLUMNS[type] ?? [];
  if (jsonbCols.includes(col)) {
    if (typeof v === "string") {
      // Already a JSON string — validate it parses, else keep as-is
      try { JSON.parse(v); return v; } catch { return JSON.stringify(v); }
    }
    return JSON.stringify(v ?? []);
  }
  return v;
}

function castCol(type: string, col: string): string {
  return (JSONB_COLUMNS[type] ?? []).includes(col) ? `::jsonb` : "";
}

// Build the placeholder list for INSERT: `$1, $2::jsonb, $3, …`
function placeholders(columns: string[], type: string): string {
  return columns.map((k, i) => `$${i + 1}${castCol(type, k)}`).join(", ");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!ALLOWED_TABLES.includes(type)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const scopeColumn = url.searchParams.get("scopeColumn");
  const scopeValue = url.searchParams.get("scopeValue");
  // For listBy: any ad-hoc column filter
  const filterCol = [...url.searchParams.keys()].find((k) => !["id", "scopeColumn", "scopeValue"].includes(k));
  const filterVal = filterCol ? url.searchParams.get(filterCol) : null;

  if (id) {
    const row = await queryOne(`SELECT * FROM ${type} WHERE id = $1`, [id]);
    return NextResponse.json(row ?? null);
  }

  let sql = `SELECT * FROM ${type}`;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (scopeColumn && scopeValue) {
    const err = validateColumn(type, scopeColumn);
    if (err) return err;
    conditions.push(`${scopeColumn} = $${values.length + 1}`);
    values.push(scopeValue);
  }
  if (filterCol && filterVal) {
    const err = validateColumn(type, filterCol);
    if (err) return err;
    conditions.push(`${filterCol} = $${values.length + 1}`);
    values.push(filterVal);
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += ` ORDER BY created_at DESC`;

  const rows = await query(sql, values);
  return NextResponse.json(rows ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!ALLOWED_TABLES.includes(type)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }
  if (!(await requireStaff(["admin", "facilitator", "coordinator"]))) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const columns = Object.keys(body).filter((k) => body[k] !== undefined);
  for (const col of columns) {
    const err = validateColumn(type, col);
    if (err) return err;
  }
  const values = columns.map((k) => toDbValue(type, k, body[k]));

  await execute(
    `INSERT INTO ${type} (${columns.join(", ")}) VALUES (${placeholders(columns, type)})`,
    values,
  );
  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!ALLOWED_TABLES.includes(type)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }
  if (!(await requireStaff(["admin", "facilitator", "coordinator"]))) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && k !== "id") {
      const err = validateColumn(type, k);
      if (err) return err;
      setClauses.push(`${k} = $${i++}${castCol(type, k)}`);
      values.push(toDbValue(type, k, v));
    }
  }
  if (setClauses.length === 0) return NextResponse.json({ ok: true });

  values.push(id);
  await execute(
    `UPDATE ${type} SET ${setClauses.join(", ")} WHERE id = $${i}`,
    values,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!ALLOWED_TABLES.includes(type)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }
  if (!(await requireStaff(["admin", "facilitator", "coordinator"]))) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await execute(`DELETE FROM ${type} WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
