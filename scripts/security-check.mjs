#!/usr/bin/env node
// Multi-user security check for the Impact Portal's Supabase project.
//
// Verifies the row-level-security posture defined in supabase/schema.sql
// against the LIVE database, from the outside, exactly the way a browser
// (or an attacker with the public anon key) would reach it:
//
//   1. Anonymous  — cannot read members/profiles/progress/TOCs/clients/course,
//                   cannot write anywhere, CAN call the check_access RPC.
//   2. Learner A  — sees only their own rows; cannot edit the course, the
//                   client directory, or the member allowlist.
//   3. Learner B  — same isolation, from the other side.
//   4. Admin      — can read members and every learner's progress + TOCs.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or
//   ..._ANON_KEY) must be set — .env.local is read automatically.
//   Signed-in tests run only when test-account credentials are provided:
//     TEST_LEARNER_A_EMAIL / TEST_LEARNER_A_PASSWORD
//     TEST_LEARNER_B_EMAIL / TEST_LEARNER_B_PASSWORD
//     TEST_ADMIN_EMAIL     / TEST_ADMIN_PASSWORD
//   (Create the accounts first: invite the emails in People & Access, then
//   sign each one up once at /login.)
//
//   npm run test:security

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// ---- env (load .env.local like Next.js does, without overriding real env) --
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / key — set them (or .env.local) and re-run.");
  process.exit(1);
}

// ---- tiny test harness ------------------------------------------------------
let pass = 0, fail = 0, skip = 0;
const failures = [];
function ok(name, condition, detail = "") {
  if (condition) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}
function skipped(name, why) { skip++; console.log(`  ⏭️  ${name} (${why})`); }
const fresh = () => createClient(url, anonKey, { auth: { persistSession: false } });

async function signIn(email, password) {
  const sb = fresh();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return sb;
}

// A select is "blocked" if it errors OR returns zero rows (RLS filters rows).
async function selectBlocked(sb, table) {
  const { data, error } = await sb.from(table).select("*").limit(5);
  return Boolean(error) || (data ?? []).length === 0;
}

// ---- 1. anonymous ------------------------------------------------------------
console.log("\n— Anonymous (public anon key, no session) —");
{
  const sb = fresh();
  for (const table of ["members", "profiles", "course_progress", "toc", "clients", "course"]) {
    ok(`anon cannot read ${table}`, await selectBlocked(sb, table));
  }

  const probe = `rls-probe-${Date.now()}@example.com`;
  const { error: insErr, data: insData } = await sb.from("members")
    .insert({ email: probe, role: "admin" }).select();
  ok("anon cannot insert into members (self-grant admin)", Boolean(insErr) || (insData ?? []).length === 0);
  if (!insErr) await sb.from("members").delete().eq("email", probe); // clean up if it got through

  const { error: noteErr, data: noteData } = await sb.from("notifications")
    .insert({ email: probe, title: "spam" }).select();
  ok("anon cannot insert notifications", Boolean(noteErr) || (noteData ?? []).length === 0);

  const { error: rpcErr, data: rpcData } = await sb.rpc("check_access", { p_email: probe });
  ok("anon CAN call check_access (login allowlist check)", !rpcErr, rpcErr?.message);
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  ok("check_access never returns a password", !row || !("temp_password" in row));
}

// ---- 2 & 3. learners ----------------------------------------------------------
const aEmail = process.env.TEST_LEARNER_A_EMAIL, aPass = process.env.TEST_LEARNER_A_PASSWORD;
const bEmail = process.env.TEST_LEARNER_B_EMAIL, bPass = process.env.TEST_LEARNER_B_PASSWORD;

async function learnerSuite(label, email, password, otherEmail) {
  console.log(`\n— ${label} (${email}) —`);
  const sb = await signIn(email, password);
  const me = email.toLowerCase();

  const { data: prog } = await sb.from("course_progress").select("email");
  ok("sees only their own course progress", (prog ?? []).every((r) => r.email === me));

  const { data: tocs } = await sb.from("toc").select("email");
  ok("sees only their own Theory of Change", (tocs ?? []).every((r) => r.email === me));

  const { data: profs } = await sb.from("profiles").select("email");
  ok("sees only their own profile", (profs ?? []).every((r) => r.email === me));

  if (otherEmail) {
    const { data: other } = await sb.from("toc").select("email").eq("email", otherEmail.toLowerCase());
    ok(`cannot read ${otherEmail}'s TOC directly`, (other ?? []).length === 0);
  }

  const { data: course, error: courseErr } = await sb.from("course").select("id").limit(1);
  ok("CAN read the course modules", !courseErr, courseErr?.message);

  if ((course ?? []).length > 0) {
    const { data: upd, error: updErr } = await sb.from("course")
      .update({ updated_at: new Date().toISOString() }).eq("id", course[0].id).select();
    ok("cannot edit the course", Boolean(updErr) || (upd ?? []).length === 0);
  }

  ok("cannot read the member allowlist", await selectBlocked(sb, "members"));
  ok("cannot read the client directory", await selectBlocked(sb, "clients"));

  const probe = `rls-probe-${Date.now()}@example.com`;
  const { error: insErr, data: insData } = await sb.from("members")
    .insert({ email: probe, role: "admin" }).select();
  ok("cannot invite themselves as admin", Boolean(insErr) || (insData ?? []).length === 0);
  if (!insErr) await sb.from("members").delete().eq("email", probe);

  await sb.auth.signOut();
}

if (aEmail && aPass) await learnerSuite("Learner A", aEmail, aPass, bEmail);
else skipped("Learner A suite", "set TEST_LEARNER_A_EMAIL / TEST_LEARNER_A_PASSWORD");
if (bEmail && bPass) await learnerSuite("Learner B", bEmail, bPass, aEmail);
else skipped("Learner B suite", "set TEST_LEARNER_B_EMAIL / TEST_LEARNER_B_PASSWORD");

// ---- 4. admin -----------------------------------------------------------------
const admEmail = process.env.TEST_ADMIN_EMAIL, admPass = process.env.TEST_ADMIN_PASSWORD;
if (admEmail && admPass) {
  console.log(`\n— Admin (${admEmail}) —`);
  const sb = await signIn(admEmail, admPass);
  const { error: mErr } = await sb.from("members").select("email").limit(1);
  ok("admin can read the member allowlist", !mErr, mErr?.message);
  const { error: pErr } = await sb.from("course_progress").select("email").limit(1);
  ok("admin can read learner progress", !pErr, pErr?.message);
  const { error: tErr } = await sb.from("toc").select("email").limit(1);
  ok("admin can read learner TOCs", !tErr, tErr?.message);
  const { error: cErr } = await sb.from("clients").select("id").limit(1);
  ok("admin can read the client directory", !cErr, cErr?.message);
  await sb.auth.signOut();
} else {
  skipped("Admin suite", "set TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD");
}

// ---- summary ------------------------------------------------------------------
console.log(`\n${pass} passed · ${fail} failed · ${skip} skipped`);
if (fail > 0) {
  console.log("\nFailed checks:");
  for (const f of failures) console.log(`  • ${f}`);
  console.log("\nMost failures mean supabase/schema.sql hasn't been re-run — run the whole file in the Supabase SQL Editor and try again.");
  process.exit(1);
}
