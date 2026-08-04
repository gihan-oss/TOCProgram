import { NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth-server";

// POST /api/chat/dms/read — Mark MY DMs as read (session user only)
export async function POST(req: Request) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { me?: string; from?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.me || !body.from) {
    return NextResponse.json({ error: "me and from required" }, { status: 400 });
  }
  // Only the session user's own inbox may be marked read.
  if (body.me.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await execute(
    `UPDATE dms SET read = true
     WHERE LOWER(to_email) = LOWER($1) AND LOWER(from_email) = LOWER($2) AND read = false`,
    [body.me, body.from],
  );
  return NextResponse.json({ ok: true });
}
