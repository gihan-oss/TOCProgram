import { NextResponse } from "next/server";
import { queryOne, query, execute } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth-server";

// GET /api/course — Read the course document
// PUT /api/course — Save the course document (staff only)

// Mirrors the original Supabase is_staff() RLS function.
async function isStaff(): Promise<boolean> {
  const email = await getSessionEmail();
  if (!email) return false;
  if (email.split('@')[1]?.toLowerCase() === 'amalandcompany.com') return true;
  const row = await queryOne<{ role: string }>(
    `SELECT role FROM members WHERE LOWER(email) = LOWER($1) AND role = 'admin'`,
    [email],
  );
  return !!row;
}

export async function GET() {
  const row = await queryOne<{ modules: unknown }>(
    `SELECT modules FROM course WHERE id = 'default'`,
  );
  return NextResponse.json(row ?? { modules: [] });
}

export async function PUT(req: Request) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  let body: { modules?: unknown; updated_at?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  await execute(
    `INSERT INTO course (id, modules, updated_at) VALUES ('default', $1, NOW())
     ON CONFLICT (id) DO UPDATE SET modules = EXCLUDED.modules, updated_at = NOW()`,
    [JSON.stringify(body.modules ?? [])],
  );
  return NextResponse.json({ ok: true });
}
