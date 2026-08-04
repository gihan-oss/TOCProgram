import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

// GET /api/members/check?email= — Pre-auth allowlist check (public)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const row = await queryOne<{ role: string }>(
    `SELECT role FROM members WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  if (row) {
    return NextResponse.json({ allowed: true, member_role: row.role });
  }
  return NextResponse.json(null);
}
