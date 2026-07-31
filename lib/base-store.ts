"use client";

// Generic base store with Supabase + localStorage cache.
// Every operation: try Supabase first, sync result to localStorage.
// Writes: skip localStorage cache on Supabase validation errors (RLS, constraints).
// Reads: on success, cache to localStorage; on failure, return localStorage.

import { getSupabaseBrowserClient } from "./supabase";
import { isNetworkError } from "./utils";

export function genId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export function lsRead<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export function lsWrite<T>(key: string, rows: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(rows)); } catch {}
}

/** Abstract base for a CRUD store backed by a single Supabase table.
 *
 *  Subclass and set `table`, `fromRow`, `toRow`, and optionally `lsKey`,
 *  `scopeColumn`, and `sortFn`. Then call:
 *    list(scope?), create(input, scope?), update(entity, patch), delete(entity)
 */
export abstract class BaseStore<T extends { id: string }> {
  /** Supabase table name (required). */
  abstract readonly table: string;

  /** Row → app model (required). */
  abstract fromRow(r: Record<string, unknown>): T;

  /** App model → Supabase row (required). Keys map to the table's columns. */
  abstract toRow(e: T): Record<string, unknown>;

  /** localStorage key. Pass a function for scoped stores, e.g. `(pid) => \`pm-tasks:\${pid}\``. */
  lsKey: string | ((scope: string) => string) = "";

  /** Supabase column name for scoping (e.g. `"program_id"`). When set, `list()`
   *  and writes filter by this column and the scope string passed by the caller. */
  scopeColumn?: string;

  /** Optional sorter — applied to list() results from both Supabase and localStorage. */
  sortFn?: (a: T, b: T) => number;

  /** Optional id prefix override. Defaults to first letter of `table`. */
  idPrefix?: string;

  // ---- derived -----------------------------------------------------------

  /** CamelCase version of scopeColumn, e.g. "program_id" → "programId". */
  protected get scopeKey(): string | undefined {
    if (!this.scopeColumn) return undefined;
    return this.scopeColumn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  protected resolveKey(scope?: string): string {
    if (typeof this.lsKey === "function") return this.lsKey(scope ?? "default");
    return this.lsKey;
  }

  protected get prefix(): string {
    return this.idPrefix ?? this.table[0];
  }

  // ---- CRUD --------------------------------------------------------------

  /** List all rows, optionally scoped (e.g. by programId). */
  async list(scope?: string): Promise<T[]> {
    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        let q = sb.from(this.table).select("*");
        if (scope !== undefined && this.scopeColumn) q = q.eq(this.scopeColumn, scope);
        const res: { data: Record<string, unknown>[] | null } = await q;
        if (res.data) {
          const rows: T[] = res.data.map((r: Record<string, unknown>) => this.fromRow(r));
          lsWrite(this.resolveKey(scope), rows);
          return this.sortFn ? rows.sort(this.sortFn) : rows;
        }
      } catch { /* fall through */ }
    }
    const rows = lsRead<T>(this.resolveKey(scope));
    return this.sortFn ? rows.sort(this.sortFn) : rows;
  }

  /** Create a row. On validation error returns the entity without caching. */
  async create(input: Omit<T, "id">, _scope?: string): Promise<T> {
    const entity = { ...input, id: genId(this.prefix) } as unknown as T;
    const scope = this.scopeKey ? (entity as Record<string, unknown>)[this.scopeKey] as string | undefined : undefined;
    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        const { error } = await sb.from(this.table).insert(this.toRow(entity));
        if (error) {
          if (!isNetworkError(error)) return entity; // validation — no cache
        } else {
          lsWrite(this.resolveKey(scope), [entity, ...lsRead<T>(this.resolveKey(scope))]);
          return entity;
        }
      } catch (err) {
        if (!isNetworkError(err)) return entity;
      }
    }
    lsWrite(this.resolveKey(scope), [entity, ...lsRead<T>(this.resolveKey(scope))]);
    return entity;
  }

  /** Patch a row. On validation error returns patched entity without caching. */
  async update(entity: T, patch: Partial<T>): Promise<T> {
    const next = { ...entity, ...patch } as T;
    const scope = this.scopeKey ? (entity as Record<string, unknown>)[this.scopeKey] as string | undefined : undefined;
    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        const { error } = await sb.from(this.table).update(this.toRow(next)).eq("id", next.id);
        if (error) {
          if (!isNetworkError(error)) return next;
        } else {
          lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).map((r: T) => (r.id === next.id ? next : r)));
          return next;
        }
      } catch (err) {
        if (!isNetworkError(err)) return next;
      }
    }
    lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).map((r: T) => (r.id === next.id ? next : r)));
    return next;
  }

  /** Delete a row. Entity must be provided so scope can be extracted for cache cleanup. */
  async delete(entity: T): Promise<void> {
    const scope = this.scopeKey ? (entity as Record<string, unknown>)[this.scopeKey] as string | undefined : undefined;
    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        const { error } = await sb.from(this.table).delete().eq("id", entity.id);
        if (error) {
          if (!isNetworkError(error)) return;
        } else {
          lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).filter((r: T) => r.id !== entity.id));
          return;
        }
      } catch (err) {
        if (!isNetworkError(err)) return;
      }
    }
    lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).filter((r: T) => r.id !== entity.id));
  }

  /** Fetch all rows across all scopes (e.g. all program IDs). Accepts a list
   *  of scope values to iterate in localStorage fallback mode. */
  async listAll(scopes: string[]): Promise<T[]> {
    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        const res: { data: Record<string, unknown>[] | null } = await sb.from(this.table).select("*");
        if (res.data) {
          const rows: T[] = res.data.map((r: Record<string, unknown>) => this.fromRow(r));
          if (this.scopeColumn) {
            const byScope = new Map<string, T[]>();
            for (const r of rows) {
              const s = (r as Record<string, unknown>)[this.scopeKey!] as string;
              if (!byScope.has(s)) byScope.set(s, []);
              byScope.get(s)!.push(r);
            }
            for (const [s, list] of byScope) lsWrite(this.resolveKey(s), list);
          } else {
            lsWrite(this.resolveKey(), rows);
          }
          return this.sortFn ? rows.sort(this.sortFn) : rows;
        }
      } catch { /* fall through */ }
    }
    const all: T[] = [];
    for (const s of scopes) all.push(...lsRead<T>(this.resolveKey(s)));
    return this.sortFn ? all.sort(this.sortFn) : all;
  }

  /** List rows filtered by any column, with its own localStorage cache key.
   *  Useful for ad-hoc scoping (e.g. by email) beyond the primary scopeColumn. */
  async listBy(field: string, value: string): Promise<T[]> {
    const cacheKey = `${this.resolveKey()}:${field}:${value}`;
    const sb = getSupabaseBrowserClient();
    if (sb) {
      try {
        const { data, error } = await sb.from(this.table).select("*").eq(field, value);
        if (!error && data) {
          const rows: T[] = (data as Record<string, unknown>[]).map((r) => this.fromRow(r));
          lsWrite(cacheKey, rows);
          return this.sortFn ? rows.sort(this.sortFn) : rows;
        }
      } catch { /* fall through */ }
    }
    const rows = lsRead<T>(cacheKey);
    return this.sortFn ? rows.sort(this.sortFn) : rows;
  }
}
