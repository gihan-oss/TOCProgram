import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

// GET /api/public/course — Read the course as an anonymous visitor
export async function GET() {
  const row = await queryOne<{ modules: unknown }>(
    `SELECT modules FROM course WHERE id = 'default'`,
  );
  if (row?.modules) {
    return NextResponse.json(row.modules);
  }
  return NextResponse.json([]);
}
