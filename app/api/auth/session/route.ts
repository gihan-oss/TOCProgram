import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { execute } from "@/lib/db";

// GET /api/auth/session — Return the current authenticated user (or null)
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  // Bump last_sign_in_at on every visit (throttled: max once per 5 minutes).
  // Don't await — fire-and-forget so the response isn't delayed.
  execute(
    `UPDATE users SET last_sign_in_at = NOW(), updated_at = NOW()
     WHERE LOWER(email) = LOWER($1)
       AND (last_sign_in_at IS NULL OR last_sign_in_at < NOW() - INTERVAL '5 minutes')`,
    [user.email],
  ).catch(() => {});
  return NextResponse.json({ user });
}
