import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";

// GET /api/profiles — List all profiles (staff & coordinators only,
// matching the old RLS is_tracker() — admin, facilitator, coordinator).
export async function GET() {
  if (!(await requireStaff(["admin", "facilitator", "coordinator"]))) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const rows = await query(
    `SELECT email, name, role_type, department, commitment, tenure, skills, onboarded, avatar_url, updated_at
     FROM profiles ORDER BY name`,
  );
  return NextResponse.json(rows ?? []);
}
