import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";

// GET /api/auth/session — Return the current authenticated user (or null)
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}
