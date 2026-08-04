"use client";

// Generic base store with our API + localStorage cache.
// Every operation: try our API first, sync result to localStorage.
// Writes: skip localStorage cache on validation errors (4xx).
// Reads: on success, cache to localStorage; on failure, return localStorage.

import { apiFetch } from "./api-fetch";

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

/** Abstract base for a CRUD store backed by our REST API.
 *
 *  Subclass and set `table`, `fromRow`, `toRow`, and optionally `lsKey`,
 *  `scopeColumn`, and `sortFn`. Then call:
 *    list(scope?), create(input, scope?), update(entity, patch), delete(entity)
 */
export abstract class BaseStore<T extends { id: string }> {
  /** Database table name (required). Used to build the API URL. */
  abstract readonly table: string;

  /** Row → app model (required). */
  abstract fromRow(r: Record<string, unknown>): T;

  /** App model → DB row (required). Keys map to the table's columns. */
  abstract toRow(e: T): Record<string, unknown>;

  /** localStorage key. Pass a function for scoped stores, e.g. `(pid) => \`pm-tasks:\${pid}\``. */
  lsKey: string | ((scope: string) => string) = "";

  /** DB column name for scoping (e.g. `"program_id"`). When set, `list()`
   *  and writes filter by this column and the scope string passed by the caller. */
  scopeColumn?: string;

  /** Optional sorter — applied to list() results from both API and localStorage. */
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

  /** Build the API URL for this store's table. */
  protected apiUrl(path: string = ""): string {
    return `/api/pm/${this.table}${path}`;
  }

  /** True when a fetch error is a network issue (→ cache locally), false for
   *  data-integrity problems (→ don't cache). */
  private static isNetwork(err: unknown): boolean {
    if (err instanceof TypeError && err.message === "Failed to fetch") return true;
    return false;
  }

  // ---- CRUD --------------------------------------------------------------

  /** List all rows, optionally scoped (e.g. by programId). */
  async list(scope?: string): Promise<T[]> {
    try {
      let url = this.apiUrl();
      if (scope !== undefined && this.scopeColumn) {
        url += `?${this.scopeColumn}=${encodeURIComponent(scope)}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const rows: T[] = (await res.json() as Record<string, unknown>[]).map((r) => this.fromRow(r));
        lsWrite(this.resolveKey(scope), rows);
        return this.sortFn ? rows.sort(this.sortFn) : rows;
      }
      return []; // server reachable, but response not OK — don't use cache
    } catch {
      // fetch threw (offline, or 503 = DB not configured) — fall back to the
      // localStorage cache.
    }
    const rows = lsRead<T>(this.resolveKey(scope));
    return this.sortFn ? rows.sort(this.sortFn) : rows;
  }

  /** Create a row. On validation error returns the entity without caching. */
  async create(input: Omit<T, "id">, _scope?: string): Promise<T> {
    const entity = { ...input, id: genId(this.prefix) } as unknown as T;
    const scope = this.scopeKey ? (entity as Record<string, unknown>)[this.scopeKey] as string | undefined : undefined;
    try {
      const res = await apiFetch(this.apiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.toRow(entity)),
      });
      if (res.ok) {
        lsWrite(this.resolveKey(scope), [entity, ...lsRead<T>(this.resolveKey(scope))]);
        return entity;
      }
      if (res.status >= 400 && res.status < 500) return entity; // validation — no cache
    } catch (err) {
      if (!BaseStore.isNetwork(err)) return entity;
    }
    lsWrite(this.resolveKey(scope), [entity, ...lsRead<T>(this.resolveKey(scope))]);
    return entity;
  }

  /** Patch a row. On validation error returns patched entity without caching. */
  async update(entity: T, patch: Partial<T>): Promise<T> {
    const next = { ...entity, ...patch } as T;
    const scope = this.scopeKey ? (entity as Record<string, unknown>)[this.scopeKey] as string | undefined : undefined;
    try {
      const res = await apiFetch(this.apiUrl(`?id=${encodeURIComponent(next.id)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.toRow(next)),
      });
      if (res.ok) {
        lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).map((r: T) => (r.id === next.id ? next : r)));
        return next;
      }
      if (res.status >= 400 && res.status < 500) return next;
    } catch (err) {
      if (!BaseStore.isNetwork(err)) return next;
    }
    lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).map((r: T) => (r.id === next.id ? next : r)));
    return next;
  }

  /** Delete a row. Entity must be provided so scope can be extracted for cache cleanup. */
  async delete(entity: T): Promise<void> {
    const scope = this.scopeKey ? (entity as Record<string, unknown>)[this.scopeKey] as string | undefined : undefined;
    try {
      const res = await apiFetch(this.apiUrl(`?id=${encodeURIComponent(entity.id)}`), { method: "DELETE" });
      if (res.ok) {
        lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).filter((r: T) => r.id !== entity.id));
        return;
      }
      if (res.status >= 400 && res.status < 500) return;
    } catch {}
    lsWrite(this.resolveKey(scope), lsRead<T>(this.resolveKey(scope)).filter((r: T) => r.id !== entity.id));
  }

  /** Fetch all rows across all scopes (e.g. all program IDs). Accepts a list
   *  of scope values to iterate in localStorage fallback mode. */
  async listAll(scopes: string[]): Promise<T[]> {
    try {
      const res = await apiFetch(this.apiUrl());
      if (res.ok) {
        const rows: T[] = (await res.json() as Record<string, unknown>[]).map((r) => this.fromRow(r));
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
      return []; // server reachable, but response not OK — don't use cache
    } catch { /* fall through */ }
    const all: T[] = [];
    for (const s of scopes) all.push(...lsRead<T>(this.resolveKey(s)));
    return this.sortFn ? all.sort(this.sortFn) : all;
  }

  /** List rows filtered by any column, with its own localStorage cache key.
   *  Useful for ad-hoc scoping (e.g. by email) beyond the primary scopeColumn. */
  async listBy(field: string, value: string): Promise<T[]> {
    const cacheKey = `${this.resolveKey()}:${field}:${value}`;
    try {
      const res = await apiFetch(this.apiUrl(`?${encodeURIComponent(field)}=${encodeURIComponent(value)}`));
      if (res.ok) {
        const rows: T[] = (await res.json() as Record<string, unknown>[]).map((r) => this.fromRow(r));
        lsWrite(cacheKey, rows);
        return this.sortFn ? rows.sort(this.sortFn) : rows;
      }
      return []; // server reachable, but response not OK — don't use cache
    } catch { /* fall through */ }
    const rows = lsRead<T>(cacheKey);
    return this.sortFn ? rows.sort(this.sortFn) : rows;
  }
}
