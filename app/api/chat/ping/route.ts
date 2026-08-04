import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

// GET /api/chat/ping — Lightweight check if chat is available
export async function GET() {
  if (isDatabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 503 });
}
