import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/profiles — List all profiles (signed-in users)
export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const rows = await query(
    `SELECT email, name, role_type, department, commitment, tenure, skills, onboarded, avatar_url, updated_at
     FROM profiles ORDER BY name`,
  );
  return NextResponse.json(rows ?? []);
}
