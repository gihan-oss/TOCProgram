import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/clients — Read the client directory. Reads stay open: co-branding
// and the welcome flow use this before sign-in.
// PUT /api/clients — Save the client directory (signed-in users)

export async function GET() {
  const row = await queryOne<{ data: unknown }>(
    `SELECT data FROM clients WHERE id = 'default'`,
  );
  return NextResponse.json(row ?? { data: [] });
}

export async function PUT(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  let body: { data?: unknown; updated_at?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  await execute(
    `INSERT INTO clients (id, data, updated_at) VALUES ('default', $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(body.data ?? [])],
  );
  return NextResponse.json({ ok: true });
}
