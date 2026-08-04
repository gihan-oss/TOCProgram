import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/toc/all — Read all TOCs (signed-in users)
export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const rows = await query(
    `SELECT email, data, updated_at FROM toc ORDER BY email`,
  );
  return NextResponse.json(rows ?? []);
}
