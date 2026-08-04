import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/programs/legacy — Read the legacy single-JSON programs doc
// DELETE /api/programs/legacy — Remove the legacy doc after migration

export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const row = await queryOne<{ data: unknown }>(
    `SELECT data FROM programs WHERE id = 'default'`,
  );
  return NextResponse.json(row ?? null);
}

export async function DELETE() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  // Delete the legacy single-doc row (not individual programs)
  const { execute } = await import("@/lib/db");
  await execute(`DELETE FROM programs WHERE id = 'default'`);
  return NextResponse.json({ ok: true });
}
