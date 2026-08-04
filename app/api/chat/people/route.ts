import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth-server";

// GET /api/chat/people — List org-mates with progress
export async function GET() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json([]);

  // Get the user's client
  const member = await query<{ client: string; role: string }>(
    `SELECT client, role FROM members WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const isStaff = member?.[0]?.role === "admin";

  let rows;
  if (isStaff) {
    rows = await query(
      `SELECT m.email, u.name, m.role as member_role, m.client,
              p.role_type, p.department, p.avatar_url,
              COALESCE(array_length(cp.done, 1), 0) as done_count
       FROM members m
       LEFT JOIN users u ON LOWER(u.email) = LOWER(m.email)
       LEFT JOIN profiles p ON LOWER(p.email) = LOWER(m.email)
       LEFT JOIN course_progress cp ON LOWER(cp.email) = LOWER(m.email)
       ORDER BY u.name`,
    );
  } else {
    const client = member?.[0]?.client ?? "";
    rows = await query(
      `SELECT m.email, u.name, m.role as member_role, m.client,
              p.role_type, p.department, p.avatar_url,
              COALESCE(array_length(cp.done, 1), 0) as done_count
       FROM members m
       LEFT JOIN users u ON LOWER(u.email) = LOWER(m.email)
       LEFT JOIN profiles p ON LOWER(p.email) = LOWER(m.email)
       LEFT JOIN course_progress cp ON LOWER(cp.email) = LOWER(m.email)
       WHERE m.client = $1
       ORDER BY u.name`,
      [client],
    );
  }

  return NextResponse.json(rows ?? []);
}
