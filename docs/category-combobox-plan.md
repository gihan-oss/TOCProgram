# Program Detail — Combo-Box Inputs Plan

> **Source:** `TOCPortal/docs/programs-ux-remediation-plan.md` — Future Considerations  
> **Date:** 2026-08-11  
> **Status:** Not started  
> **Files touched:** 3 | **New API endpoint:** 1 | **Schema changes:** 0

---

## Overview

The program detail page (`/programs/[id]`) has several free-text `<input>` fields
that benefit from **combo-box behaviour** — suggesting known values while still
allowing free-form entry. All use the native HTML `<datalist>` element, which is
zero-dependency and accessible.

### Fields to convert

| # | Tab | Field | Source of suggestions | Strategy |
|---|-----|-------|-----------------------|----------|
| 1 | Financial | **Category** (budget line, transaction, edit row) | Distinct categories from all `program_budget_lines` | API-backed |
| 2 | Tasks | **Assignee** (add, edit row) | Distinct assignees from all `program_tasks` | API-backed |
| 3 | M&E | **Unit** (add, edit row) | Common measurement units | Constant |

Each uses a `<datalist>` — suggestions only, no restriction on free-form entry.

---

## Strategy A — API-Backed (Category, Assignee)

For suggestions that grow organically as users add data across all programs,
fetch the distinct values from the database once on page load.

### New API endpoint: `GET /api/pm/suggestions`

```ts
// Returns { categories: string[], assignees: string[] }
```

A single endpoint returns both lists to avoid two round-trips. The SQL:

```sql
SELECT DISTINCT category FROM program_budget_lines
WHERE category != '' ORDER BY category;

SELECT DISTINCT assignee FROM program_tasks
WHERE assignee != '' ORDER BY assignee;
```

### Store function (`lib/pm-store.ts`)

```ts
export async function fetchSuggestions(): Promise<{
  categories: string[]; assignees: string[];
}> { /* calls /api/pm/suggestions */ }
```

In localStorage/demo mode, returns empty arrays — the datalists render empty
and inputs behave as plain text (no regression).

### Page-level fetch

In `ProgramDetail` (the top-level component), add a `useEffect` that calls
`fetchSuggestions()` once on mount. Pass the results down:

- `categories` → `FinancialTab`
- `assignees` → `TasksTab`

---

## Strategy B — Constant (Unit)

For a small, stable set of known values, define a constant.

### New constant (`lib/pm-types.ts`)

```ts
export const INDICATOR_UNITS = [
  "%", "Count", "USD", "Hours", "Participants", "Score",
  "Ratio", "Days", "Sessions", "People", "Dollars",
] as const;
```

Imported in the detail page and fed into `<datalist>` in `MeTab` and
`IndicatorRow`.

---

## Implementation Steps

### Step 1 — Add `INDICATOR_UNITS` to `lib/pm-types.ts`

After the `BudgetLine` interface (~line 120):

```ts
export const INDICATOR_UNITS = [
  "%", "Count", "USD", "Hours", "Participants", "Score",
  "Ratio", "Days", "Sessions", "People", "Dollars",
] as const;
```

### Step 2 — Add `GET /api/pm/suggestions`

New file: `app/api/pm/suggestions/route.ts`

```ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  if (!(await requireUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const [catRows, assignRows] = await Promise.all([
      query("SELECT DISTINCT category FROM program_budget_lines WHERE category != '' ORDER BY category"),
      query("SELECT DISTINCT assignee FROM program_tasks WHERE assignee != '' ORDER BY assignee"),
    ]);
    return NextResponse.json({
      categories: (catRows ?? []).map((r: Record<string, unknown>) => r.category as string),
      assignees: (assignRows ?? []).map((r: Record<string, unknown>) => r.assignee as string),
    });
  } catch {
    return NextResponse.json({ categories: [], assignees: [] });
  }
}
```

### Step 3 — Add `fetchSuggestions()` to `lib/pm-store.ts`

At the bottom of `lib/pm-store.ts`, after the existing exports:

```ts
import { apiFetch } from "./api-fetch";

export async function fetchSuggestions(): Promise<{
  categories: string[]; assignees: string[];
}> {
  try {
    const res = await apiFetch("/api/pm/suggestions");
    if (res.ok) return await res.json();
  } catch {}
  return { categories: [], assignees: [] };
}
```

### Step 4 — Fetch in `ProgramDetail` and thread down

In `ProgramDetail` (the top-level component), add state + useEffect:

```tsx
const [suggestions, setSuggestions] = useState<{ categories: string[]; assignees: string[] }>(
  { categories: [], assignees: [] },
);
useEffect(() => {
  fetchSuggestions().then(setSuggestions);
}, []);
```

Pass into tabs:

| Prop | To |
|------|-----|
| `categories={suggestions.categories}` | `FinancialTab` |
| `assignees={suggestions.assignees}` | `TasksTab` |

### Step 5 — Add `<datalist>` in `FinancialTab` (category)

Add after the `variance` useMemo:

```tsx
<datalist id="cat-list">
  {categories.map((c) => <option key={c} value={c} />)}
</datalist>
```

Wire three inputs with `list="cat-list"`:

| Input | Line |
|-------|------|
| Budget line category `bCat` | ~401 |
| Transaction category `cat`  | ~474 |
| `EntryEditRow` category     | ~490 |

### Step 6 — Add `<datalist>` in `TasksTab` (assignee)

Add a `<datalist id="assignee-list">` in `TasksTab`, and wire two inputs
with `list="assignee-list"`:

| Input | Line |
|-------|------|
| Task add assignee | ~560 |
| `TaskEditRow` assignee | ~621 |

### Step 7 — Add `<datalist>` in `MeTab` + `IndicatorRow` (unit)

Add `<datalist id="unit-list">` in `MeTab` (for the add form) and wire:

| Input | Location |
|-------|----------|
| Add indicator unit | `MeTab`, ~659 |
| Edit indicator unit | `IndicatorRow`, ~713 |

Both use `list="unit-list"` fed from `INDICATOR_UNITS`.

### Step 8 — Verify

| Check | Expected |
|-------|----------|
| Category suggestions populated | Typing in category field shows existing categories from any program |
| Assignee suggestions populated | Typing in assignee field shows people assigned to any task |
| Unit suggestions always present | 11 common units shown, regardless of DB state |
| DB empty / demo mode | All three datalists render empty. Inputs work as plain text. No errors. |
| Free-form entry | Any field accepts values not in the datalist. Data persists. |
| localStorage fallback | `fetchSuggestions` returns `{ categories: [], assignees: [] }`. No effect. |

---

## What Does NOT Change

| Concern | Why |
|---|---|
| `BudgetLine.category` type | Remains `string` |
| `FinancialEntry.category` type | Remains `string \| undefined` |
| `Task.assignee` type | Remains `string \| undefined` |
| `ProgramIndicator.unit` type | Remains `string \| undefined` |
| `lib/pm-types.ts` interfaces | No changes to interfaces — only new constants added |
| `lib/db.ts` schema | No changes |
| `lib/base-store.ts` | No changes |
| Existing API routes | No changes — new endpoint is additive |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| New API endpoint fails (DB down) | Catches and returns empty arrays. Datalists render empty. |
| Many programs → large DISTINCT result | `program_budget_lines` and `program_tasks` are scoped small (dozens, not millions). |
| Duplicate datalist `id` across tabs | Each tab uses a different `id` (`cat-list`, `assignee-list`, `unit-list`). |
| `fetchSuggestions` adds a round-trip | One call replaces what would have been two. Fires once on mount, parallel to existing `Promise.all` for tasks/financials/indicators/budget. |
| localStorage fallback | `fetchSuggestions` catches and returns empty arrays. Datalists are empty; inputs are plain text. |
