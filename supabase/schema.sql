-- Impact Portal — Supabase schema
-- Safe to run multiple times: every policy is dropped-if-exists before create,
-- and tables use create-if-not-exists. Run the whole file any time.
-- (Auth — sign-up/sign-in — is handled by Supabase Auth automatically.)

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
drop policy if exists "insert notifications" on public.notifications;
create policy "insert notifications" on public.notifications
  for insert with check (true);
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
  for select using (true);
drop policy if exists "write assignments" on public.program_assignments;
create policy "write assignments" on public.program_assignments
  for insert with check (true);
drop policy if exists "delete assignments" on public.program_assignments;
create policy "delete assignments" on public.program_assignments
  for delete using (true);

-- ---- Members / invitations (the access allowlist, shared & permanent) ----
create table if not exists public.members (
  email         text primary key,
  name          text not null default '',
  role          text not null default 'participant',
  status        text not null default 'Invited',
  temp_password text not null default '',
  created_at    timestamptz not null default now()
);
alter table public.members enable row level security;

drop policy if exists "members read" on public.members;
create policy "members read"   on public.members for select using (true);
drop policy if exists "members insert" on public.members;
create policy "members insert" on public.members for insert with check (true);
drop policy if exists "members update" on public.members;
create policy "members update" on public.members for update using (true);
drop policy if exists "members delete" on public.members;
create policy "members delete" on public.members for delete using (true);

-- ===========================================================================
-- Course content (shared, permanent)
-- ===========================================================================

-- The whole course is one shared JSON document everyone reads and admins edit.
create table if not exists public.course (
  id          text primary key default 'default',
  modules     jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);
alter table public.course enable row level security;

drop policy if exists "course read" on public.course;
create policy "course read"   on public.course for select using (true);
drop policy if exists "course insert" on public.course;
create policy "course insert" on public.course for insert to authenticated with check (true);
drop policy if exists "course update" on public.course;
create policy "course update" on public.course for update to authenticated using (true);

-- Per-learner progress (which resources they've completed).
create table if not exists public.course_progress (
  email       text primary key,
  done        text[] not null default '{}',
  updated_at  timestamptz not null default now()
);
alter table public.course_progress enable row level security;

drop policy if exists "progress read own" on public.course_progress;
create policy "progress read own"   on public.course_progress for select using (auth.jwt() ->> 'email' = email);
drop policy if exists "progress insert own" on public.course_progress;
create policy "progress insert own" on public.course_progress for insert with check (auth.jwt() ->> 'email' = email);
drop policy if exists "progress update own" on public.course_progress;
create policy "progress update own" on public.course_progress for update using (auth.jwt() ->> 'email' = email);

-- Storage bucket for uploaded files (PDFs, slides, images…).
insert into storage.buckets (id, name, public) values ('course-files', 'course-files', true)
  on conflict (id) do nothing;

drop policy if exists "course-files read" on storage.objects;
create policy "course-files read"   on storage.objects for select using (bucket_id = 'course-files');
drop policy if exists "course-files upload" on storage.objects;
create policy "course-files upload" on storage.objects for insert to authenticated with check (bucket_id = 'course-files');
