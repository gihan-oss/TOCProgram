import { NextResponse, type NextRequest } from "next/server";

// Without DATABASE_URL the app runs in demo mode. Data API routes can't do
// anything useful, so they answer 503 and the client stores fall back to
// localStorage (see lib/api-fetch.ts). Email and AI endpoints work without a
// database and are let through.
const NO_DB_ALLOWLIST = ["/api/email", "/api/analysis", "/api/coach"];

export function middleware(req: NextRequest) {
  if (process.env.DATABASE_URL) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/") &&
    !NO_DB_ALLOWLIST.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
