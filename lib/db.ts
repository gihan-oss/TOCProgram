// PostgreSQL connection pool — SERVER-ONLY (never imported in client code).
// Uses the standard DATABASE_URL env var (set in docker-compose.yml).
// When DATABASE_URL is absent, returns null so callers fall back gracefully.
//
// Schema: idempotent schema setup runs lazily on first query (per process), so
// a fresh database works with no manual migration step — and an existing one
// gets new tables/columns added automatically. In Docker the same schema is
// also mounted into /docker-entrypoint-initdb.d via db/init/01-schema.sql.

import { Pool, type PoolClient } from "pg";

/** True when a PostgreSQL connection string is configured. */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// Declare globals to survive dev-server HMR (avoids pool/schema re-init leaks).
declare global {
  // eslint-disable-next-line no-var
  var __toc_pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __toc_pgSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool | null {
  if (!isDatabaseConfigured()) return null;
  if (!global.__toc_pgPool) {
    global.__toc_pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    global.__toc_pgPool.on("error", (err) => {
      console.error("[db] Unexpected pool error", err);
    });
  }
  return global.__toc_pgPool;
}

// ---- Idempotent schema setup ----------------------------------------------
// Runs once per process, lazily on the first query. Mirrors db/init/01-schema.sql.
const SCHEMA_SQL = `
create table if not exists members (
  email text primary key, name text not null default '',
  role text not null default 'participant', status text not null default 'Invited',
  temp_password text not null default '', client text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  email text primary key, name text not null default '',
  role_type text not null default '', department text not null default '',
  commitment text not null default '', tenure text not null default '',
  skills text[] not null default '{}', onboarded boolean not null default false,
  avatar_url text not null default '', updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key default gen_random_uuid()::text, email text not null, title text not null,
  body text not null default '', read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_email_idx on notifications (email, created_at desc);

create table if not exists course (
  id text primary key default 'default', modules jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists course_progress (
  email text primary key, done text[] not null default '{}',
  meta jsonb not null default '{}', updated_at timestamptz not null default now()
);

create table if not exists clients (
  id text primary key default 'default', data jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists programs (
  id text primary key, data jsonb, email text,
  name text not null default '', area text not null default '', sub_focus text,
  question_zero text, input text not null default '', baseline text not null default '',
  target text, outcome text not null default '', decision text not null default 'Keep',
  status text not null default 'Not Started', budget numeric not null default 0,
  department text, region text, team text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists program_tasks (
  id text primary key, program_id text not null, title text not null default '',
  description text not null default '', status text not null default 'in_progress',
  due_date text, assignee text not null default '', priority text not null default 'medium',
  completed_at text, created_at timestamptz not null default now()
);
create index if not exists program_tasks_program_idx on program_tasks (program_id);

create table if not exists program_financials (
  id text primary key, program_id text not null, type text not null default 'expense',
  amount numeric not null default 0, description text not null default '',
  category text not null default '', date text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists program_financials_program_idx on program_financials (program_id);

create table if not exists program_indicators (
  id text primary key, email text, program_id text,
  name text not null default '', description text not null default '',
  type text not null default 'Quantitative', level text not null default 'output',
  unit text not null default '', baseline numeric not null default 0,
  target numeric not null default 0, current numeric not null default 0,
  target_date text, frequency text not null default '',
  means_of_verification text not null default '', measurements jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists program_indicators_program_idx on program_indicators (program_id);
create index if not exists program_indicators_email_idx on program_indicators (email);

create table if not exists program_budget_lines (
  id text primary key, program_id text not null, category text not null default '',
  description text not null default '', amount numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists program_budget_lines_program_idx on program_budget_lines (program_id);

create table if not exists assumptions (
  id text primary key, email text, statement text not null default '',
  owner text not null default '', status text not null default 'Unverified',
  risk text not null default 'Low', linked_outcome text not null default '',
  linked_evidence jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assumptions_email_idx on assumptions (email);

create table if not exists evidence (
  id text primary key, email text, name text not null default '',
  kind text not null default 'URL', tags jsonb not null default '[]',
  linked_to text not null default '', uploaded_by text not null default '',
  date text not null default '', created_at timestamptz not null default now()
);
create index if not exists evidence_email_idx on evidence (email);

create table if not exists toc (
  email text primary key, data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key default gen_random_uuid()::text, client text not null default '', email text not null,
  name text not null default '', body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_client_idx on messages (client, created_at);

create table if not exists dms (
  id text primary key default gen_random_uuid()::text, from_email text not null, to_email text not null,
  from_name text not null default '', body text not null,
  read boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists dms_pair_idx on dms (from_email, to_email, created_at);
create index if not exists dms_to_idx on dms (to_email, created_at desc);
`;

function ensureSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (!global.__toc_pgSchemaReady) {
    global.__toc_pgSchemaReady = (async () => {
      const pool = getPool();
      if (!pool) return;
      try {
        await pool.query(SCHEMA_SQL);
      } catch (err) {
        console.error("[db] schema setup failed", err);
      }
    })();
  }
  return global.__toc_pgSchemaReady;
}

/** Run a query and return rows. Returns `null` when the database is not configured. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[] | null> {
  await ensureSchema();
  const p = getPool();
  if (!p) return null;
  const result = await p.query(text, params);
  return result.rows as T[];
}

/** Run a query and return the first row, or null. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows?.[0] ?? null;
}

/** Execute a statement and return row count. Returns -1 when DB is not configured. */
export async function execute(
  text: string,
  params?: unknown[],
): Promise<number> {
  await ensureSchema();
  const p = getPool();
  if (!p) return -1;
  const result = await p.query(text, params);
  return result.rowCount ?? 0;
}

/** Acquire a client from the pool for transactions. Returns null when DB is not configured. */
export async function getClient(): Promise<PoolClient | null> {
  await ensureSchema();
  const p = getPool();
  if (!p) return null;
  return p.connect();
}

