import { NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireUser, canAccess } from "@/lib/api-auth";

// GET /api/notifications?email= — List notifications for a user (self, or staff)
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!(await canAccess(email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await query(
    `SELECT id, email, title, body, read, created_at
     FROM notifications WHERE LOWER(email) = LOWER($1)
     ORDER BY created_at DESC LIMIT 50`,
    [email],
  );
  return NextResponse.json(rows ?? []);
}

// POST /api/notifications — Add a notification (self, or staff)
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { email?: string; title?: string; body?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.title) {
    return NextResponse.json({ error: "email and title required" }, { status: 400 });
  }
  if (!(await canAccess(body.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await execute(
    `INSERT INTO notifications (email, title, body) VALUES (LOWER($1), $2, $3)`,
    [body.email, body.title, body.body ?? ""],
  );
  return NextResponse.json({ ok: true });
}
