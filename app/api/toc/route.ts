import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { requireUser, canAccess } from "@/lib/api-auth";

// GET /api/toc?email= — Read a learner's TOC (self, or staff)
// PUT /api/toc — Upsert a TOC (self, or staff)

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (email) {
    if (!(await canAccess(email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const row = await queryOne<{ data: unknown; updated_at: string }>(
      `SELECT data, updated_at FROM toc WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
    return NextResponse.json(row ?? null);
  }

  return NextResponse.json({ error: "email required" }, { status: 400 });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { email?: string; data?: unknown; updated_at?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!(await canAccess(body.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await execute(
    `INSERT INTO toc (email, data, updated_at) VALUES (LOWER($1), $2, NOW())
     ON CONFLICT (email) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [body.email, JSON.stringify(body.data ?? {})],
  );
  return NextResponse.json({ ok: true });
}
