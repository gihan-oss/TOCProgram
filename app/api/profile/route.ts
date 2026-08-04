import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth-server";
import { requireUser, canAccess } from "@/lib/api-auth";

// GET /api/profile?email= — Read a profile (self, or staff)
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (!(await canAccess(email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const row = await queryOne(
    `SELECT email, name, role_type, department, commitment, tenure, skills, onboarded, avatar_url, updated_at
     FROM profiles WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  return NextResponse.json(row ?? null);
}

// PUT /api/profile — Upsert a profile (self only)
export async function PUT(req: Request) {
  const sessionEmail = await getSessionEmail();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email as string)?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // Must be signed in, and can only update own profile (unless staff).
  if (!sessionEmail) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (sessionEmail.toLowerCase() !== email && !(await canAccess(email))) {
    return NextResponse.json({ error: "Can only update your own profile" }, { status: 403 });
  }

  const skills = Array.isArray(body.skills) ? body.skills : [];
  await execute(
    `INSERT INTO profiles (email, name, role_type, department, commitment, tenure, skills, onboarded, avatar_url, updated_at)
     VALUES (LOWER($1), $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name, role_type = EXCLUDED.role_type,
       department = EXCLUDED.department, commitment = EXCLUDED.commitment,
       tenure = EXCLUDED.tenure, skills = EXCLUDED.skills,
       onboarded = EXCLUDED.onboarded, avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()`,
    [
      email,
      (body.name as string) ?? "",
      (body.role_type as string) ?? "",
      (body.department as string) ?? "",
      (body.commitment as string) ?? "",
      (body.tenure as string) ?? "",
      skills,
      (body.onboarded as boolean) ?? false,
      (body.avatar_url as string) ?? "",
    ],
  );
  return NextResponse.json({ ok: true });
}
