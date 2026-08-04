import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { requireUser, canAccess } from "@/lib/api-auth";

// GET /api/progress?email= — Read a learner's progress (self, or staff)
// PUT /api/progress — Update ONLY the provided columns of a learner's progress

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const field = url.searchParams.get("field");

  if (email) {
    if (!(await canAccess(email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const row = await queryOne<{ done: string[]; meta: unknown; updated_at: string }>(
      `SELECT done, meta, updated_at FROM course_progress WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
    if (!row) return NextResponse.json({ done: [], meta: {} });
    // If only a specific field is requested, return just that
    if (field === "meta") return NextResponse.json({ meta: row.meta });
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "email required" }, { status: 400 });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { email?: string; done?: string[]; meta?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!(await canAccess(body.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only touch the columns the caller actually sent — never reset the other
  // one to its default (saveDone must not wipe meta, and vice versa).
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (Array.isArray(body.done)) { sets.push(`done = $${i++}`); values.push(body.done); }
  if (body.meta !== undefined) { sets.push(`meta = $${i++}`); values.push(JSON.stringify(body.meta)); }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  sets.push(`updated_at = NOW()`);
  values.push(body.email.toLowerCase());

  await execute(
    `INSERT INTO course_progress (email) VALUES (LOWER($${i}))
     ON CONFLICT (email) DO UPDATE SET ${sets.join(", ")}`,
    values,
  );
  return NextResponse.json({ ok: true });
}
