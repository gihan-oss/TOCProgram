import { NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/programs — List all programs (signed-in users)
// POST /api/programs — Create a program
// PUT /api/programs/[id] — Update a program
// DELETE /api/programs/[id] — Delete a program

export async function GET(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const row = await queryOne(`SELECT * FROM programs WHERE id = $1`, [id]);
    return NextResponse.json(row ?? null);
  }
  const rows = await query(`SELECT * FROM programs ORDER BY name`);
  return NextResponse.json(rows ?? []);
}

export async function POST(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const columns = Object.keys(body).filter((k) => body[k] !== undefined);
  const values = columns.map((k) => body[k]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const colNames = columns.join(", ");

  await execute(
    `INSERT INTO programs (${colNames}, updated_at) VALUES (${placeholders}, NOW())
     ON CONFLICT (id) DO UPDATE SET ${columns.map((c, i) => `${c} = $${i + 1}`).join(", ")}, updated_at = NOW()`,
    [...values],
  );
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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
      setClauses.push(`${k} = $${i++}`);
      values.push(v);
    }
  }
  if (setClauses.length === 0) return NextResponse.json({ ok: true });

  values.push(id);
  await execute(
    `UPDATE programs SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${i}`,
    values,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await execute(`DELETE FROM programs WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
