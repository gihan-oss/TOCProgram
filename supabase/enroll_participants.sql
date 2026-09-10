-- ============================================================================
-- Enroll participants so their names appear in the public worksheet dropdown
-- ----------------------------------------------------------------------------
-- Each row added here shows up in the "/w/<module>" name picker AND lets that
-- email sign in to the portal. Answers they save are keyed to their email, so
-- they appear on the live responses wall and when they later sign in.
--
-- HOW TO USE
--   1. Replace the example rows below with your real participants
--      (email first, then their display name). Add or remove rows freely.
--   2. Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--   3. Re-running is safe: an email already enrolled just gets its name
--      refreshed; existing roles/status are left untouched.
--
-- NOTE: this does NOT set a password. People can either use the public
-- worksheet link (no sign-in needed) or set a password via "Forgot password"
-- on the sign-in screen. Emails on the amalandcompany.com domain are already
-- treated as admins regardless of this table.
-- ============================================================================

insert into public.members (email, name, role, status) values
  ('participant1@example.org', 'First Last',   'participant', 'Active'),
  ('participant2@example.org', 'First Last',   'participant', 'Active'),
  ('participant3@example.org', 'First Last',   'participant', 'Active')
  -- ('another@example.org',   'Their Name',   'participant', 'Active'),
on conflict (email) do update
  set name = excluded.name;
