# Impact OS — Theory of Change Portal

A strategic operating system for nonprofit impact — built for nonprofits, foundations,
associations, ministries, charities, faith-based organizations and social enterprises.

The objective is **not** simply delivering training. It is to move participants from
**Learning → Application → Implementation → Measurement → Organizational Impact**, and
to measure *implementation evidence* rather than content consumption.

## What's inside

A Next.js (App Router) + TypeScript + Tailwind CSS app that combines:

| Surface | Route | Highlights |
| --- | --- | --- |
| **Dashboard** | `/dashboard` | Role-aware overview, implementation pipeline, outcome health, the four strategic questions |
| **Learning Management** | `/learning` | Cohort modules (Q-Zero → TOC → Logframe → Measurement) with **sequential unlocking**; completion requires video + quiz + assignment |
| **Pre/Post Assessments** | `/assessments` | Registration, knowledge & confidence assessments, automatic improvement %, Learning Growth Dashboard |
| **Theory of Change Builder** | `/toc` | Interactive draggable canvas, directional connections, **real-time logic validation** (orphan activities, unsupported outcomes, missing assumptions) |
| **Logframe Builder** | `/logframe` | Auto-generated from the TOC, inline editing, bidirectional sync, PDF/Word/Excel export hooks |
| **Assumption Registry** | `/assumptions` | Every assumption is a managed object; failed assumptions trigger alerts + revision workflow |
| **Measurement Plan** | `/measurement` | SMART indicators (quantitative & qualitative) with baselines, targets, frequency, means of verification |
| **Impact Dashboard** | `/impact` | Output & outcome performance with traffic-light status |
| **Implementation Dashboard** | `/implementation` | Implementation Maturity Score (0–100) and artifact completion |
| **Implementation Package** | `/package` | Q-Zero, Causal Chain, Logframe, Measurement Plan — automatic completeness + status flow |
| **Evidence Repository** | `/evidence` | Upload PDF/DOCX/XLSX/Images/URLs, link to outcomes/outputs/indicators/assumptions, search + tag + filter |
| **Cohorts & People** | `/cohorts` | Cohort readiness, participant tracking |
| **Reporting** | `/reports` | Participant, Cohort, Organization and Leadership scopes |
| **Knowledge Base** | `/knowledge` | Searchable nonprofit strategy library |
| **AI Assistant** | `/assistant` | Reviews Q-Zero, weak assumptions, indicators, outputs-vs-outcomes — **recommendations only, never auto-changes work** |

### Cross-cutting

- **Five user types** with role-based navigation: System Administrator, Facilitator,
  Program Coordinator, Participant, Executive/Leadership (read-only). Switch roles via the
  header selector to see the portal adapt.
- **Dark mode**, responsive/mobile-friendly layout, accessible, executive-grade design
  inspired by Notion, Airtable, Asana, Miro and Monday.com.

## Authentication (Supabase, with demo fallback)

Sign-in / sign-up lives at `/login`; the whole portal is gated behind it.

- **Demo mode (default):** with no env vars set, any email + a 6+ char password
  logs you in (stored locally). The app deploys and works immediately.
- **Real auth:** create a free **Supabase** project → Settings → API → copy the
  URL and anon key into env vars (locally `.env.local`, and in Vercel → Settings →
  Environment Variables). See `.env.example`. The app auto-detects them and
  switches `/login` to real Supabase email/password accounts — no code changes.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Auth lives in `components/auth.tsx` (`useAuth()`), the client in `lib/supabase.ts`,
and the route gate in `components/auth-guard.tsx`.

## Lifetime data, email & notifications

- **Profiles ("Know Our Members"):** onboarding captures role type, department,
  commitment, tenure and skills, saved via `lib/store.ts` — to **Supabase**
  (permanent) when configured, localStorage otherwise. Schema: `supabase/schema.sql`
  (run once in the Supabase SQL Editor).
- **Notifications:** in-app notification center (bell in the header), persisted
  the same way. Invites and onboarding generate notifications automatically.
- **Email:** `/api/email` sends via **Resend** when `RESEND_API_KEY` is set
  (see `.env.example`); otherwise emails are simulated so flows keep working.
  Admin invites and the onboarding welcome email use this.

## Design

- **Font:** Montserrat (via `next/font`, self-hosted — no layout shift).
- **Imagery:** nonprofit/community photos in `lib/images.ts`, each rendered through
  `<Photo>` which falls back to a gradient if a host is unreachable (never broken).
- **Motion:** floating decorative icons (`<FloatingIcons>`) and a soft gradient
  `mesh` background on the landing + login pages.
- **Buttons:** a single modern `<Button>` component (`components/ui.tsx`) with
  generous padding, soft radius and subtle press animation.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Deploy to Vercel

This is a standard Next.js app and deploys to Vercel with zero configuration:

1. Push this repo to GitHub (already done on the working branch).
2. In Vercel, **New Project → Import** this repository.
3. Framework preset auto-detects **Next.js** — no env vars required.
4. Deploy. You'll get a direct `*.vercel.app` URL.

## Architecture notes

- `lib/types.ts` defines the full domain model (Organizations, Users, Cohorts, Courses,
  Modules, Lessons, Assignments, Programs, TOCs, Nodes, Edges, Assumptions, Indicators,
  Logframes, Evidence, Reports, Assessments).
- `lib/data.ts` holds a rich, realistic sample dataset (a childhood-literacy program) that
  drives every screen. Swap this for a database/API layer (e.g. Postgres + Prisma, or
  Supabase) without touching the UI — the components read from typed data only.
- State is in-component (React `useState`) so the prototype is fully interactive and
  deployable today with no backend. Versioning/audit-log and persistence are the natural
  next step.

## Success metric

The platform succeeds when a nonprofit leader can answer — within minutes:

1. What change are we trying to create?
2. Why do we believe it will happen?
3. How do we know it is happening?
4. What evidence supports that conclusion?
