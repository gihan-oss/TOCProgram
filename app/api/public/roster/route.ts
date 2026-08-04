import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createHash } from "crypto";

// GET /api/public/roster — Enrolled participant list (name + opaque token)
export async function GET() {
  const rows = await query<{ email: string; name: string }>(
    `SELECT email, name FROM members WHERE status = 'Active' ORDER BY name`,
  );
  if (!rows) return NextResponse.json([]);

  return NextResponse.json(
    rows.map((r) => ({
      token: createHash("md5").update(r.email.toLowerCase()).digest("hex"),
      name: r.name || r.email.split("@")[0],
    })),
  );
}
