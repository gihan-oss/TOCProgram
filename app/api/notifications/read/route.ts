import { NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireUser, canAccess } from "@/lib/api-auth";

// POST /api/notifications/read — Mark all notifications read for an email
// (self, or staff)
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { email?: string };
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
    `UPDATE notifications SET read = true WHERE LOWER(email) = LOWER($1) AND read = false`,
    [body.email],
  );
  return NextResponse.json({ ok: true });
}
