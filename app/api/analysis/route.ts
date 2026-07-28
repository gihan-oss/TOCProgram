import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/analysis-prompt";

// Cohort worksheet analysis, powered by Claude (claude-opus-4-8). Without an
// ANTHROPIC_API_KEY it returns a plain deterministic summary so the feature
// still works — the page also always shows the compiled answers regardless.

export const maxDuration = 60;

interface Payload {
  participantCount?: number;
  worksheets?: { module: string; title: string; prompts: { prompt: string; answers: string[] }[] }[];
}

function demoSummary(p: Payload): string {
  const worksheets = p.worksheets ?? [];
  const prompts = worksheets.reduce((s, w) => s + w.prompts.length, 0);
  const answers = worksheets.reduce((s, w) => s + w.prompts.reduce((t, pr) => t + pr.answers.length, 0), 0);
  return [
    "## AI analysis isn't switched on yet",
    "",
    "This is a compiled overview. To get a written group analysis — themes, common gaps, assumptions to pressure-test and next-session focus — an admin needs to add an `ANTHROPIC_API_KEY` in the deployment settings.",
    "",
    "## What's here so far",
    `- **${p.participantCount ?? 0}** participants in the cohort.`,
    `- **${answers}** answers across **${prompts}** prompts with at least one response.`,
    `- Worksheets with responses: ${worksheets.length ? worksheets.map((w) => `“${w.title}”`).join(", ") : "none yet"}.`,
    "",
    "Scroll down to read everyone's answers grouped by prompt, and use **Print** for a facilitator copy.",
  ].join("\n");
}

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const worksheets = body.worksheets ?? [];
  const hasData = worksheets.some((w) => w.prompts.some((p) => p.answers.length > 0));
  if (!hasData) {
    return NextResponse.json({ ok: true, demo: true, reply: "## Not enough data yet\n\nNo worksheet answers have been submitted, so there's nothing to analyse. Once participants start filling in their worksheets, run this again." });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: true, demo: true, reply: demoSummary(body) });
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Here is the cohort's worksheet data as JSON. Write the group analysis.\n\n` +
            "```json\n" + JSON.stringify({ participantCount: body.participantCount ?? 0, worksheets }) + "\n```",
        },
      ],
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ ok: true, reply: reply || "(no response)" });
  } catch (err) {
    const message = err instanceof Anthropic.APIError ? `Claude API error (${err.status})` : "Analysis error";
    console.error("[analysis]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
