import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth-server";

// GET /api/chat/my-client — Return the current user's client (organization)
export async function GET() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ client: "" });
  const row = await queryOne<{ client: string }>(
    `SELECT client FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  return NextResponse.json({ client: row?.client ?? "" });
}
