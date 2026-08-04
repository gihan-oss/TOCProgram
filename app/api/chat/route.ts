import { NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth-server";
import { requireUser } from "@/lib/api-auth";

// GET /api/chat?client=&limit=&since= — Load messages (signed-in users)
// POST /api/chat — Send a message

export async function GET(req: Request) {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const url = new URL(req.url);
  const client = url.searchParams.get("client");
  const limit = parseInt(url.searchParams.get("limit") ?? "200");
  const since = url.searchParams.get("since");

  if (!client) return NextResponse.json([]);

  let sql = `SELECT id, client, email, name, body, created_at FROM messages WHERE client = $1`;
  const values: unknown[] = [client];

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

  let body: { client?: string; name?: string; body?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.body?.trim();
  if (!text || !body.client) {
    return NextResponse.json({ error: "client and body required" }, { status: 400 });
  }

  await execute(
    `INSERT INTO messages (client, email, name, body) VALUES ($1, LOWER($2), $3, $4)`,
    [body.client, email, body.name ?? email, text],
  );
  return NextResponse.json({ ok: true });
}
