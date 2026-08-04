import { NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth-server";

// GET /api/chat/dms?limit=&since= — List MY DMs (always the session user's)
// POST /api/chat/dms — Send a DM

export async function GET(req: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json([]);

  const url = new URL(req.url);
  const me = email; // always the session user — never trust ?me=
  const limit = parseInt(url.searchParams.get("limit") ?? "500");
  const since = url.searchParams.get("since");

  let sql = `SELECT id, from_email, to_email, from_name, body, read, created_at
             FROM dms WHERE (LOWER(from_email) = LOWER($1) OR LOWER(to_email) = LOWER($1))`;
  const values: unknown[] = [me];

  if (since) {
    sql += ` AND created_at > $2`;
    values.push(since);
  }

  sql += ` ORDER BY created_at ASC LIMIT $${values.length + 1}`;
  values.push(Math.min(limit, 500));

  const rows = await query(sql, values);
  return NextResponse.json(rows ?? []);
}

export async function POST(req: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { from_email?: string; to_email?: string; from_name?: string; body?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.body?.trim();
  if (!text || !body.to_email) {
    return NextResponse.json({ error: "to_email and body required" }, { status: 400 });
  }

  await execute(
    `INSERT INTO dms (from_email, to_email, from_name, body)
     VALUES (LOWER($1), LOWER($2), $3, $4)`,
    [email, body.to_email, body.from_name ?? email, text],
  );
  return NextResponse.json({ ok: true });
}
