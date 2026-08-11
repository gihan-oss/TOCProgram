import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/pm/suggestions
// Returns distinct categories and assignees from all programs for
// <datalist> combo-box suggestions in the program detail page.

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
    // DB not configured or query failed — return empty lists.
    // The datalists render empty and inputs behave as plain text.
    return NextResponse.json({ categories: [], assignees: [] });
  }
}
