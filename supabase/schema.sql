-- Impact Portal — Supabase schema
-- Safe to run multiple times: every policy is dropped-if-exists before create,
-- and tables use create-if-not-exists. Run the whole file any time.
-- Re-running also REMOVES the older, more permissive policies from earlier
-- versions of this file (open member reads/writes, learner-editable course…),
-- so after pulling an update always run the whole file once.
-- (Auth — sign-up/sign-in — is handled by Supabase Auth automatically.)

-- ===========================================================================
-- Members / invitations — the access allowlist (shared & permanent)
-- ===========================================================================
-- Rows contain invite temp passwords, so reading and writing this table is
-- STAFF-ONLY. The login screen checks the allowlist through check_access()
-- below, which reveals only allowed/role — never the stored password.

create table if not exists public.members (
  email         text primary key,
  name          text not null default '',
  role          text not null default 'participant',
  status        text not null default 'Invited',
  temp_password text not null default '',
  created_at    timestamptz not null default now()
);
alter table public.members enable row level security;
-- Which client (organization) an invited member belongs to.
alter table public.members add column if not exists client text not null default '';

-- Who counts as "staff" (may read everyone's data and manage shared content):
-- anyone on an admin email domain, or a member explicitly stored with
-- role = 'admin'. SECURITY DEFINER so the check can read `members` regardless
-- of that table's own policies.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select
    coalesce(lower(split_part(auth.jwt() ->> 'email', '@', 2)) = 'amalandcompany.com', false)
    or exists (
      select 1 from public.members m
      where lower(m.email) = lower(auth.jwt() ->> 'email') and m.role = 'admin'
    );
$$;

-- Pre-auth allowlist check for the login screen (callable by anon): given an
-- email, is it invited and with which role? Never returns the temp password.
create or replace function public.check_access(p_email text)
returns table(allowed boolean, member_role text)
language sql stable security definer set search_path = public as $$
  select true, m.role from public.members m
  where lower(m.email) = lower(trim(p_email))
  limit 1;
$$;
grant execute on function public.check_access(text) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- Remove the old open policies (earlier versions let ANYONE read the member
-- list — including temp passwords — and write rows, i.e. self-grant admin).
drop policy if exists "members read" on public.members;
drop policy if exists "members insert" on public.members;
drop policy if exists "members update" on public.members;
drop policy if exists "members delete" on public.members;

drop policy if exists "members staff read" on public.members;
create policy "members staff read"   on public.members for select using (public.is_staff());
drop policy if exists "members staff insert" on public.members;
create policy "members staff insert" on public.members for insert with check (public.is_staff());
drop policy if exists "members staff update" on public.members;
create policy "members staff update" on public.members for update using (public.is_staff());
drop policy if exists "members staff delete" on public.members;
create policy "members staff delete" on public.members for delete using (public.is_staff());

-- ---- Member profiles ("Know Our Members") -------------------------------
create table if not exists public.profiles (
  email       text primary key,
  name        text not null default '',
  role_type   text not null default '',
  department  text not null default '',
  commitment  text not null default '',
  tenure      text not null default '',
  skills      text[] not null default '{}',
  onboarded   boolean not null default false,
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.jwt() ->> 'email' = email);
drop policy if exists "upsert own profile" on public.profiles;
create policy "upsert own profile" on public.profiles
  for insert with check (auth.jwt() ->> 'email' = email);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.jwt() ->> 'email' = email);
-- Staff may READ all profiles (learners still own their writes).
drop policy if exists "profiles staff read" on public.profiles;
create policy "profiles staff read" on public.profiles for select using (public.is_staff());

-- ---- In-app notifications ------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  title       text not null,
  body        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_email_idx on public.notifications (email, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select using (auth.jwt() ->> 'email' = email);
-- Signed-in users may create notifications (admins notify invitees; users
-- notify themselves). Anonymous visitors may not.
drop policy if exists "insert notifications" on public.notifications;
create policy "insert notifications" on public.notifications
  for insert to authenticated with check (true);
drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications" on public.notifications
  for update using (auth.jwt() ->> 'email' = email);

-- ---- Program assignments (people <-> programs) ---------------------------
create table if not exists public.program_assignments (
  id          uuid primary key default gen_random_uuid(),
  program_id  text not null,
  email       text not null,
  assigned_by text not null default '',
  created_at  timestamptz not null default now(),
  unique (program_id, email)
);
alter table public.program_assignments enable row level security;

drop policy if exists "read assignments" on public.program_assignments;
create policy "read assignments" on public.program_assignments
  for select to authenticated using (true);
drop policy if exists "write assignments" on public.program_assignments;
create policy "write assignments" on public.program_assignments
  for insert with check (public.is_staff());
drop policy if exists "delete assignments" on public.program_assignments;
create policy "delete assignments" on public.program_assignments
  for delete using (public.is_staff());

-- ===========================================================================
-- Course content (shared, permanent)
-- ===========================================================================

-- The whole course is one shared JSON document everyone reads and STAFF edit.
create table if not exists public.course (
  id          text primary key default 'default',
  modules     jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);
alter table public.course enable row level security;

drop policy if exists "course read" on public.course;
create policy "course read"   on public.course for select to authenticated using (true);
drop policy if exists "course insert" on public.course;
create policy "course insert" on public.course for insert with check (public.is_staff());
drop policy if exists "course update" on public.course;
create policy "course update" on public.course for update using (public.is_staff());

-- Per-learner progress (which resources they've completed).
create table if not exists public.course_progress (
  email       text primary key,
  done        text[] not null default '{}',
  updated_at  timestamptz not null default now()
);
-- Gamification: best quiz scores + saved worksheet answers, per learner.
alter table public.course_progress add column if not exists meta jsonb not null default '{}'::jsonb;
alter table public.course_progress enable row level security;

drop policy if exists "progress read own" on public.course_progress;
create policy "progress read own"   on public.course_progress for select using (auth.jwt() ->> 'email' = email);
drop policy if exists "progress insert own" on public.course_progress;
create policy "progress insert own" on public.course_progress for insert with check (auth.jwt() ->> 'email' = email);
drop policy if exists "progress update own" on public.course_progress;
create policy "progress update own" on public.course_progress for update using (auth.jwt() ->> 'email' = email);
-- Staff may READ all progress (each learner still owns their writes).
drop policy if exists "progress staff read" on public.course_progress;
create policy "progress staff read" on public.course_progress for select using (public.is_staff());

-- ---- Client directory (shared & permanent, STAFF-ONLY) -------------------
-- All clients live in one JSON document that admins read and edit. It holds
-- contacts/notes about client organizations, so it is staff-only end to end.
create table if not exists public.clients (
  id          text primary key default 'default',
  data        jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);
alter table public.clients enable row level security;

drop policy if exists "clients read" on public.clients;
create policy "clients read"   on public.clients for select using (public.is_staff());
drop policy if exists "clients insert" on public.clients;
create policy "clients insert" on public.clients for insert with check (public.is_staff());
drop policy if exists "clients update" on public.clients;
create policy "clients update" on public.clients for update using (public.is_staff());

-- Storage bucket for uploaded files (PDFs, slides, images…). Files are read
-- publicly (the bucket is public); only STAFF may upload.
insert into storage.buckets (id, name, public) values ('course-files', 'course-files', true)
  on conflict (id) do nothing;

drop policy if exists "course-files read" on storage.objects;
create policy "course-files read"   on storage.objects for select using (bucket_id = 'course-files');
drop policy if exists "course-files upload" on storage.objects;
create policy "course-files upload" on storage.objects for insert with check (bucket_id = 'course-files' and public.is_staff());

-- ===========================================================================
-- Per-learner Theory of Change + staff visibility into all learner data
-- ===========================================================================

-- Each learner's saved Theory of Change programs (nodes + edges as JSON).
create table if not exists public.toc (
  email      text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.toc enable row level security;

drop policy if exists "toc self read" on public.toc;
create policy "toc self read"   on public.toc for select using (auth.jwt() ->> 'email' = email);
drop policy if exists "toc staff read" on public.toc;
create policy "toc staff read"  on public.toc for select using (public.is_staff());
drop policy if exists "toc self insert" on public.toc;
create policy "toc self insert" on public.toc for insert with check (auth.jwt() ->> 'email' = email);
drop policy if exists "toc self update" on public.toc;
create policy "toc self update" on public.toc for update using (auth.jwt() ->> 'email' = email);
