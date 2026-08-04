import { NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

// POST /api/public/worksheet/reset — Reset worksheet responses (staff-only)
export async function POST(req: Request) {
  if (!(await requireStaff(["admin", "facilitator", "coordinator"]))) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  let body: { resource_ids?: string[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = body.resource_ids ?? [];
  if (ids.length === 0) return NextResponse.json({ cleared: 0 });

  // For each learner, remove the specified worksheet answers from
  // meta.worksheets and drop the ids from their `done` set (same semantics as
  // the old Supabase reset_worksheet_responses RPC).
  const rows = await query<{ email: string; meta: Record<string, unknown>; done: string[] }>(
    `SELECT email, meta, done FROM course_progress WHERE meta IS NOT NULL`,
  );
  if (!rows) return NextResponse.json({ cleared: 0 });

  let cleared = 0;
  for (const row of rows) {
    const meta = (row.meta ?? {}) as {
      scores?: Record<string, unknown>;
      worksheets?: Record<string, Record<string, string>>;
      [k: string]: unknown;
    };
    const ws = (meta.worksheets ?? {}) as Record<string, unknown>;
    const done = row.done ?? [];
    let changed = false;
    for (const id of ids) {
      if (ws[id]) {
        delete ws[id];
        changed = true;
      }
    }
    const newDone = done.filter((d) => !ids.includes(d));
    if (newDone.length !== done.length) changed = true;
    if (changed) {
      await execute(
        `UPDATE course_progress SET meta = $1, done = $2, updated_at = NOW() WHERE LOWER(email) = LOWER($3)`,
        [JSON.stringify({ ...meta, worksheets: ws }), newDone, row.email],
      );
      cleared++;
    }
  }

  return NextResponse.json({ ok: true, cleared });
}
