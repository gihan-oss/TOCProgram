import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/progress/all — Read all learner progress. Session-gated (not
// staff-gated): the dashboard shows cohort progress to every signed-in role.
export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const rows = await query(
    `SELECT email, done, meta, updated_at FROM course_progress ORDER BY email`,
  );
  return NextResponse.json(rows ?? []);
}
