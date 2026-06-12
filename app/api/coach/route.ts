import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { COACH_SYSTEM_PROMPT } from "@/lib/coach-prompt";

// The AI Assistant — a MAS GLA Theory of Change Coach powered by Claude
// (claude-opus-4-8). Without ANTHROPIC_API_KEY it returns a guided scripted
// reply so the experience still works before the key is configured.

export const maxDuration = 60;

const DEMO_REPLY =
  "Assalamu alaikum, and welcome. I'm your Theory of Change Coach — together we'll shape your program one step at a time, inshaAllah (about 10 minutes).\n\n**To go live, an admin needs to add an `ANTHROPIC_API_KEY` in the deployment settings.** Once that's set, I'll coach you through Question Zero to a complete, fundable Theory of Change.\n\nLet's still begin: **Who is your program's target audience — and how would you describe them *behaviorally* (e.g. \"distant / un-mosqued Muslims in their 20s–30s\"), not just by age?**";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  let body: { messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter((m) => m.content?.trim());
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: "No messages provided" }, { status: 400 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: true, demo: true, reply: DEMO_REPLY });
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: COACH_SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ ok: true, reply: reply || "(no response)" });
  } catch (err) {
    const message = err instanceof Anthropic.APIError ? `Claude API error (${err.status})` : "Assistant error";
    console.error("[coach]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
