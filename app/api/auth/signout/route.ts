import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth-server";

// POST /api/auth/signout — Clear the session cookie
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
