import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

// GET /api/toc/all — Read all TOCs (staff & coordinators only,
// matching the old RLS is_tracker() — admin, facilitator, coordinator).
export async function GET() {
  if (!(await requireStaff(["admin", "facilitator", "coordinator"]))) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const rows = await query(
    `SELECT email, data, updated_at FROM toc ORDER BY email`,
  );
  return NextResponse.json(rows ?? []);
}
