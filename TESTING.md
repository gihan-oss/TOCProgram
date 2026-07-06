# Testing the portal with several users

This guide verifies the three things that matter before real cohorts use the
portal: **everything persists to Supabase**, **each learner's projects stay
linked to their account (and visible to staff)**, and **users can't see or
change each other's data**.

## 0. One-time setup

1. Create the Supabase project and put the URL + publishable/anon key in
   `.env.local` (and in Vercel → Settings → Environment Variables). See
   `.env.example`.
2. Run **the whole of `supabase/schema.sql`** in the Supabase SQL Editor.
   Re-run it after every update — it is safe to run repeatedly and also
   *removes* older, more permissive policies.
3. Confirm the app is out of demo mode: the login page should **not** show
   the "demo" hint, and Supabase → Authentication → Users should show real
   accounts after sign-ups.

## 1. Create the test users

In the portal as an admin (any `@amalandcompany.com` account):

1. Go to **Admin → People & Access** and invite:
   - `learner.a@example.org` as **Learner**
   - `learner.b@example.org` as **Learner**
   - a second admin if you want to test staff access separately
2. Each invited person signs **up** once at `/login` with their invited email.
   (Sign-up is only accepted for invited emails.)

## 2. Automated security check (recommended)

```bash
TEST_LEARNER_A_EMAIL=learner.a@example.org TEST_LEARNER_A_PASSWORD=... \
TEST_LEARNER_B_EMAIL=learner.b@example.org TEST_LEARNER_B_PASSWORD=... \
TEST_ADMIN_EMAIL=you@amalandcompany.com   TEST_ADMIN_PASSWORD=... \
npm run test:security
```

Without the `TEST_*` variables it still runs the anonymous-access checks.
It verifies, against the live database:

- anonymous visitors can read **no** member, profile, progress, TOC, client
  or course data, and cannot write anywhere (including inviting themselves
  as admin);
- each learner sees **only their own** progress, profile and Theory of
  Change — and cannot edit the course, the client directory, or the member
  allowlist;
- admins **can** read the allowlist, all learner progress and all TOCs.

Every check should pass. If several fail, `supabase/schema.sql` hasn't been
re-run since this update.

## 3. Manual multi-user walkthrough

Use two browsers (or one normal + one private window): **A** = learner A,
**B** = learner B, plus an admin window.

### Data persists to Supabase
- [ ] As A: complete a resource in **Learning** Module 1, take the quiz,
      fill a worksheet. Sign out, sign back in **on another device or
      browser** — progress, quiz stars and worksheet answers are all there.
- [ ] As A: finish onboarding at `/welcome`. Sign in from a different
      browser — you land on your dashboard, **not** back on `/welcome`.
- [ ] As admin: edit a module in **Learning** (Course Builder), sign out and
      back in elsewhere — the edit persisted.

### Modules are all present
- [ ] **Learning** shows the 5 MASGLA modules (Why This Matters, Q-Zero,
      Impact Pathway, Logframe, Measuring & Validating), each with a
      slidedeck, reading, a worksheet and a knowledge check.
- [ ] As a learner, Module 2 stays locked until Module 1 is fully complete.
- [ ] Supabase → Table Editor → `course` has a `default` row whose `modules`
      JSON contains the 5 modules (an admin visiting Learning seeds it
      automatically).

### Projects are linked to the right people
- [ ] As A: in the **TOC Builder**, create two programs (projects) and add
      nodes/edges to each. Switch between them — each keeps its own canvas.
- [ ] As B: the TOC Builder starts fresh — none of A's programs appear.
- [ ] As admin: **Admin → Learners** lists A and B with their own progress
      and their own TOC programs.
- [ ] Supabase → Table Editor → `toc` has one row per learner email.

### Community chat (per-client rooms)
- [ ] As A and B (same client): open **Community Chat**. A message A sends
      appears for B **live**, without refreshing, and vice-versa.
- [ ] Invite a learner under a *different* client and confirm they do **not**
      see this room's messages (Supabase → Table Editor → `messages` shows a
      `client` column; a query as that user returns only their own client's
      rows — verify with the RLS in mind).
- [ ] As admin/staff: the room picker lets you switch between client rooms and
      read/post in each.
- [ ] Supabase → Database → Replication shows `messages` in the
      `supabase_realtime` publication (the schema does this automatically).

### Branding / logos
- [ ] The **Amal & Company** logo shows in the header on every LMS page.
- [ ] As admin: **Admin → Clients → edit a client → Upload logo**. The client
      logo then appears beside the Amal logo in the header, and on the client
      card. Uploaded logos persist (Supabase Storage `course-files`, or a data
      URL in demo mode).

### Quiz answers
- [ ] In any module quiz, the correct answer is **not** always the first tile —
      options are shuffled each play. Replay a quiz; the correct option moves.

### Isolation & roles
- [ ] As B: you cannot see A's worksheet answers, quiz scores or programs
      anywhere in the UI.
- [ ] As a learner: no **Admin** section in the navigation; opening
      `/admin/access` directly shows nothing useful and, crucially, the
      database refuses the reads (see script above — UI hiding is cosmetic,
      RLS is the enforcement).
- [ ] As admin: invite + remove a test member in **People & Access**; the
      change survives sign-out (it's in the `members` table).
- [ ] An email that was never invited cannot sign in **or** sign up.

## 4. Known limitations (by design, for now)

- **Prototype screens:** Assessments, Evidence, Measurement, Logframe,
  Impact, Cohorts and Reports currently render the built-in sample dataset
  (`lib/data.ts`) — work entered there is not yet saved per-user. The saved,
  per-learner surfaces are: Learning progress, quizzes, worksheets, the TOC
  Builder, profiles and notifications.
- **Temp passwords** are stored in the `members` table so admins can re-send
  them. They are staff-only readable and are just the *suggested* first
  password — the invitee chooses their real password at sign-up.
- `check_access` necessarily reveals whether a given email is invited and
  its role (needed for the pre-login allowlist check). It never reveals
  passwords or any other member data.
