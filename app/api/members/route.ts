import { NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSessionEmail, hashPassword } from "@/lib/auth-server";

// Helper: check if the current user is staff
async function isStaff(): Promise<boolean> {
  const email = await getSessionEmail();
  if (!email) return false;
  const row = await queryOne<{ role: string }>(
    `SELECT role FROM members WHERE LOWER(email) = LOWER($1) AND role = 'admin'`,
    [email],
  );
  return !!row;
}

// GET /api/members — List all members (staff only)
export async function GET() {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const rows = await query(
    `SELECT email, name, role, status, temp_password, client, created_at
     FROM members ORDER BY created_at DESC`,
  );
  return NextResponse.json(rows ?? []);
}

// POST /api/members — Upsert a member (staff only)
export async function POST(req: Request) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email as string)?.toLowerCase();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Store invite passwords as bcrypt hashes — never plaintext. (The plaintext
  // is shown to the admin / emailed to the invitee once at invite time.)
  let tempPassword = (body.temp_password as string) ?? "";
  if (tempPassword && !tempPassword.startsWith("$2")) {
    tempPassword = await hashPassword(tempPassword);
  }

  await execute(
    `INSERT INTO members (email, name, role, status, temp_password, client)
     VALUES (LOWER($1), $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name, role = EXCLUDED.role,
       status = EXCLUDED.status, temp_password = EXCLUDED.temp_password,
       client = EXCLUDED.client`,
    [
      email,
      (body.name as string) ?? "",
      (body.role as string) ?? "participant",
      (body.status as string) ?? "Invited",
      tempPassword,
      (body.client as string) ?? "",
    ],
  );
  return NextResponse.json({ ok: true });
}

// DELETE /api/members?email= — Remove a member (staff only)
export async function DELETE(req: Request) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  await execute(`DELETE FROM members WHERE LOWER(email) = LOWER($1)`, [email]);
  return NextResponse.json({ ok: true });
}
