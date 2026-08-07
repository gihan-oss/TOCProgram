-- Impact Portal — PostgreSQL schema (replaces Supabase)
-- Safe to run multiple times: every table is create-if-not-exists, columns use
-- add-column-if-not-exists, and indexes are idempotent. Mounted into the
-- Postgres container's /docker-entrypoint-initdb.d so it runs on first boot;
-- lib/db.ts also runs an equivalent inline version lazily for non-Docker dev.
--
-- Conventions (mirror the app's data layer):
--   • text primary keys — IDs are generated client-side (crypto.randomUUID)
--   • text dates — the app sends ISO strings
--   • text[] for simple string arrays (skills, done, team)
--   • jsonb for nested objects/arrays (meta, data, modules, measurements)

-- ===========================================================================
-- Authentication accounts (email/password + Google OAuth)
-- ===========================================================================
-- Mirrors Supabase auth.users so the one-time migration (scripts/migrate-auth-
-- users.mjs) maps encrypted_password 1:1. id is a unique uuid for compatibility
-- with auth.users; email remains the primary key for FK references.
-- encrypted_password is NULL for Google OAuth users. name is the display name.
create table if not exists users (
  id                  uuid not null default gen_random_uuid() unique,
  email               text primary key,
  name                text not null default '',
  encrypted_password  text,
  email_confirmed_at  timestamptz,
  last_sign_in_at     timestamptz,
  raw_user_meta_data  jsonb not null default '{}',
  raw_app_meta_data   jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ===========================================================================
-- Members / invitations — the access allowlist
-- ===========================================================================
-- Rows contain invite temp passwords, so reads/writes are staff-gated in the
-- API layer (app/api/members). The login screen checks allowlist via
-- app/api/members/check, which reveals only allowed/role.
-- email references users(email) — a users row is created at invite time
-- (with just name) so the FK is satisfied.
create table if not exists members (
  email         text primary key references users(email),
  name          text not null default '',
  role          text not null default 'participant',
  status        text not null default 'Invited',
  temp_password text not null default '',
  client        text not null default '',
  created_at    timestamptz not null default now()
);

-- ---- Member profiles ("Know Our Members") -------------------------------
create table if not exists profiles (
  email       text primary key,
  name        text not null default '',
  role_type   text not null default '',
  department  text not null default '',
  commitment  text not null default '',
  tenure      text not null default '',
  skills      text[] not null default '{}',
  onboarded   boolean not null default false,
  avatar_url  text not null default '',
  updated_at  timestamptz not null default now()
);

-- ---- In-app notifications ------------------------------------------------
create table if not exists notifications (
  id          text primary key default gen_random_uuid()::text,
  email       text not null,
  title       text not null,
  body        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_email_idx on notifications (email, created_at desc);

-- ===========================================================================
-- Course content (shared, permanent)
-- ===========================================================================
create table if not exists course (
  id          text primary key default 'default',
  modules     jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

-- Per-learner progress (completed resources + gamification meta).
create table if not exists course_progress (
  email       text primary key,
  done        text[] not null default '{}',
  meta        jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ---- Client directory (shared & permanent, staff-only) -------------------
create table if not exists clients (
  id          text primary key default 'default',
  data        jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

-- ---- Programs (row-per-entity) -------------------------------------------
-- The legacy `data` (jsonb) column held the single-doc format; kept for
-- one-time migration (see app/api/programs/legacy) and dropped later.
create table if not exists programs (
  id             text primary key,
  data           jsonb,
  email          text,
  name           text not null default '',
  area           text not null default '',
  sub_focus      text,
  question_zero  text,
  input          text not null default '',
  baseline       text not null default '',
  target         text,
  outcome        text not null default '',
  decision       text not null default 'Keep',
  status         text not null default 'Not Started',
  budget         numeric not null default 0,
  department     text,
  region         text,
  team           text[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---- Program tasks (per-program) -----------------------------------------
create table if not exists program_tasks (
  id           text primary key,
  program_id   text not null,
  title        text not null default '',
  description  text not null default '',
  status       text not null default 'in_progress',
  due_date     text,
  assignee     text not null default '',
  priority     text not null default 'medium',
  completed_at text,
  created_at   timestamptz not null default now()
);
create index if not exists program_tasks_program_idx on program_tasks (program_id);

-- ---- Program financial entries (per-program) ------------------------------
create table if not exists program_financials (
  id          text primary key,
  program_id  text not null,
  type        text not null default 'expense',
  amount      numeric not null default 0,
  description text not null default '',
  category    text not null default '',
  date        text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists program_financials_program_idx on program_financials (program_id);

-- ---- Program indicators / M&E (per-program) ------------------------------
create table if not exists program_indicators (
  id                    text primary key,
  email                 text,
  program_id            text,
  name                  text not null default '',
  description           text not null default '',
  type                  text not null default 'Quantitative',
  level                 text not null default 'output',
  unit                  text not null default '',
  baseline              numeric not null default 0,
  target                numeric not null default 0,
  current               numeric not null default 0,
  target_date           text,
  frequency             text not null default '',
  means_of_verification text not null default '',
  measurements          jsonb not null default '[]',
  created_at            timestamptz not null default now()
);
create index if not exists program_indicators_program_idx on program_indicators (program_id);
create index if not exists program_indicators_email_idx on program_indicators (email);

-- ---- Program budget lines (per-program) -----------------------------------
create table if not exists program_budget_lines (
  id          text primary key,
  program_id  text not null,
  category    text not null default '',
  description text not null default '',
  amount      numeric not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists program_budget_lines_program_idx on program_budget_lines (program_id);

-- ---- Assumptions Registry (TOC Dashboard) --------------------------------
create table if not exists assumptions (
  id              text primary key,
  email           text,
  statement       text not null default '',
  owner           text not null default '',
  status          text not null default 'Unverified',
  risk            text not null default 'Low',
  linked_outcome  text not null default '',
  linked_evidence jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists assumptions_email_idx on assumptions (email);

-- ---- Evidence Repository --------------------------------------------------
create table if not exists evidence (
  id          text primary key,
  email       text,
  name        text not null default '',
  kind        text not null default 'URL',
  tags        jsonb not null default '[]',
  linked_to   text not null default '',
  uploaded_by text not null default '',
  date        text not null default '',
  file_path   text,
  file_url    text,
  created_at  timestamptz not null default now()
);
create index if not exists evidence_email_idx on evidence (email);

-- ===========================================================================
-- Per-learner Theory of Change
-- ===========================================================================
create table if not exists toc (
  email      text primary key,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- Community chat — one room per client (organization)
-- ===========================================================================
create table if not exists messages (
  id         text primary key default gen_random_uuid()::text,
  client     text not null default '',
  email      text not null,
  name       text not null default '',
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_client_idx on messages (client, created_at);

-- ---- 1:1 direct messages --------------------------------------------------
create table if not exists dms (
  id         text primary key default gen_random_uuid()::text,
  from_email text not null,
  to_email   text not null,
  from_name  text not null default '',
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dms_pair_idx on dms (from_email, to_email, created_at);
create index if not exists dms_to_idx on dms (to_email, created_at desc);
