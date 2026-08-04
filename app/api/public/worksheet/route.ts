import { NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { createHash } from "crypto";

// POST /api/public/worksheet — Save worksheet answers (anonymous visitor)
export async function POST(req: Request) {
  let body: { token?: string; worksheets?: Record<string, Record<string, string>>; done?: string[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: "Choose your name first" }, { status: 400 });

  // Resolve the token to an email (token is md5 of email)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token);
  let email: string;

  if (isEmail) {
    email = token.toLowerCase();
    // Verify the email belongs to an active member
    const m = await queryOne<{ email: string }>(
      `SELECT email FROM members WHERE LOWER(email) = LOWER($1) AND status = 'Active'`,
      [email],
    );
    if (!m) return NextResponse.json({ error: "Not an enrolled participant" }, { status: 403 });
  } else {
    // Token lookup: find member whose md5(email) matches
    const rows = await query<{ email: string }>(
      `SELECT email FROM members WHERE status = 'Active'`,
    );
    if (!rows) return NextResponse.json({ error: "Not an enrolled participant" }, { status: 403 });

    const match = rows.find(
      (r) => createHash("md5").update(r.email.toLowerCase()).digest("hex") === token,
    );
    if (!match) return NextResponse.json({ error: "Not an enrolled participant" }, { status: 403 });
    email = match.email.toLowerCase();
  }

  // Merge worksheets into existing meta
  const existing = await queryOne<{ meta: Record<string, unknown>; done: string[] }>(
    `SELECT meta, done FROM course_progress WHERE LOWER(email) = LOWER($1)`,
    [email],
  );

  const currentMeta = (existing?.meta ?? {}) as {
    scores?: Record<string, unknown>;
    worksheets?: Record<string, Record<string, string>>;
    [k: string]: unknown;
  };
  // Answers live under meta.worksheets — the same shape the signed-in learner
  // pages and the old Supabase RPC use. Never merge at the top level of meta.
  const mergedWorksheets = {
    ...(currentMeta.worksheets ?? {}),
    ...(body.worksheets ?? {}),
  };
  const meta = { ...currentMeta, worksheets: mergedWorksheets };

  const currentDone = new Set(existing?.done ?? []);
  (body.done ?? []).forEach((id) => currentDone.add(id));

  await execute(
    `INSERT INTO course_progress (email, done, meta, updated_at)
     VALUES (LOWER($1), $2, $3, NOW())
     ON CONFLICT (email) DO UPDATE SET
       done = EXCLUDED.done, meta = EXCLUDED.meta, updated_at = NOW()`,
    [email, [...currentDone], JSON.stringify(meta)],
  );

  return NextResponse.json({ ok: true });
}
