// The real MASGLA Theory of Change program, ready to load into the Course
// Builder in one click: five sequential modules (one per session), each with
// the session reading, its fillable worksheet, and a knowledge check. Content
// is drawn from the MASGLA × Amal & Company TOC Training documents.

import type { CourseModule } from "./content";

export const MASGLA_STARTER: CourseModule[] = [
  {
    id: "m-toc-1",
    title: "Module 1 — Why This Matters & Intro to TOC",
    summary: "Build a shared language and walk the full five-level Theory of Change framework.",
    resources: [
      {
        id: "m1-read",
        type: "Note",
        title: "Read first — Why a Theory of Change?",
        body:
`If someone asked "your program — does it actually work?", most of us answer by describing what we DO ("we run Youth Camp"). But the real question is: what changes in someone's life because of what you do — and can you prove it?

A Theory of Change (TOC) is your answer. In one sentence:
IF we do the right things, for the right people, in the right way… THEN specific, measurable change will happen in their lives — and we can prove it.

Why MASGLA needs this: our Program Dashboard tells us what we ran and how many attended — not what changed. That gap limits funding, makes decisions instinct-based, blocks learning across regions, and weakens our story.

THE FIVE LEVELS (each builds on the last):
1. INPUTS — the WHO: the specific people you serve (not budget or staff).
2. ACTIVITIES — what your team delivers (sessions, retreats, classes).
3. OUTPUTS — what activities produce, counted as Baseline · Metric · Target.
4. OUTCOMES — what changes in a person in 6–18 months (the heart of impact).
5. IMPACT — the long-term community transformation over 3–5 years.

MASGLA's six Areas of Focus: Islam to Muslims · Leadership Development · Community Mobilization · Social Justice · Islam for non-Muslims · Operate with Excellence. Your program's TOC should connect to one — and ladder up to one of the four Tarbiyah outcomes: Lifelong Learner, Bearer of the Message, Agent of Change, Exemplary Citizen.

This is adult learning: bring your real program. Every worksheet is filled in for your own assigned program — never a hypothetical.`,
      },
      {
        id: "m1-ws",
        type: "Worksheet",
        title: "Session 1 Worksheet — Place Your Program",
        body: "Map your own assigned program onto the framework. First pass — no editing.",
        fields: [
          { id: "program", label: "Program name", required: true },
          { id: "area", label: "Area of Focus", hint: "Islam to Muslims / Leadership Development / Community Mobilization / Social Justice / Islam for non-Muslims / Operate with Excellence", required: true },
          { id: "outcomeCat", label: "Outcome category you most directly target", hint: "e.g. KNOWLEDGE, BEHAVIORAL, CAPACITY, INFLUENCE, NETWORK, SCALE, PARTNERSHIP, POSITIVE IMAGE…" },
          { id: "tarbiya", label: "Which Tarbiyah outcome does it most serve?", hint: "Lifelong Learner / Bearer of the Message / Agent of Change / Exemplary Citizen" },
          { id: "inputs", label: "1. INPUTS — the WHO", long: true, required: true },
          { id: "activities", label: "2. ACTIVITIES — what you deliver", long: true, required: true },
          { id: "outputs", label: "3. OUTPUTS — what you count", long: true },
          { id: "outcomes", label: "4. OUTCOMES — what changes in 6–18 months", long: true },
          { id: "impact", label: "5. IMPACT — the community in 3–5 years", long: true },
          { id: "unsure", label: "One thing I'm unsure about going into Session 2", long: true },
        ],
      },
      {
        id: "m1-quiz",
        type: "Quiz",
        title: "Knowledge check — Intro to TOC",
        questions: [
          { prompt: "In a Theory of Change, what do INPUTS represent?", options: ["The specific people (audience) your program serves", "Your budget and staff", "The venue and equipment", "The activities you deliver"], answer: 0 },
          { prompt: "Which is the correct order of the five TOC levels?", options: ["Inputs → Activities → Outputs → Outcomes → Impact", "Activities → Inputs → Outputs → Impact → Outcomes", "Inputs → Outputs → Activities → Outcomes → Impact", "Goals → Activities → Outputs → Outcomes → Inputs"], answer: 0 },
          { prompt: "What best describes an OUTPUT?", options: ["A countable, measurable result of your activities", "A long-term change in a person's life", "The philosophy behind your program", "The community's 3–5 year transformation"], answer: 0 },
          { prompt: "How many Areas of Focus does MASGLA organize its work across?", options: ["Six", "Four", "Five", "Eight"], answer: 0 },
          { prompt: "Why can't the Program Dashboard alone answer a donor's question?", options: ["It shows what we ran and attendance, not what changed in people's lives", "It is not updated often enough", "It only covers one region", "It has no budget figures"], answer: 0 },
        ],
      },
    ],
  },
  {
    id: "m-toc-2",
    title: "Module 2 — Q-Zero",
    summary: "Sharpen your program into a clean, testable If–Then statement.",
    resources: [
      {
        id: "m2-read",
        type: "Note",
        title: "Read first — The Three Laws of Q-Zero",
        body:
`Q-Zero asks the most important question about your program: why does it produce change — in a single, testable sentence?

THE FORMULA: IF we do [approach or philosophy], THEN [specific behavioral or condition change] will occur. No event names, no attendance, no logistics — just a philosophy (the IF) and the change it produces (the THEN).

THE THREE LAWS (quality gates):
• Law 1 — Liberate the IF. Name a philosophy, not an event. If swapping in another program still fits, it's too generic. ❌ "If we run BJJ classes…"  ✓ "If we create consistent, faith-framed physical-discipline environments for young men…"
• Law 2 — Demand a behavioral THEN. Describe what changes in a person, not what you deliver. Test: "If the program ran perfectly but nothing changed in anyone's life, would this THEN still be true?" If yes, it's still an output. ❌ "…then 100 youth will attend."  ✓ "…then youth adopt structured spiritual habits they continue independently after camp."
• Law 3 — Tie to mission. The THEN must connect to Islamic identity, community revival, and principled leadership — MASGLA's fingerprint.

TRAFFIC-LIGHT CHECK before sharing:
🔴 Red — IF is an event, THEN is delivery, no mission link. Start over.
🟡 Yellow — behavioral THEN but vague ("grow spiritually") or IF still logistics. Sharpen: how would you know it happened?
🟢 Green — IF is a philosophy, THEN is a specific attributable change, mission-tied. Ready.`,
      },
      {
        id: "m2-ws",
        type: "Worksheet",
        title: "Session 2 Worksheet — Your Q-Zero",
        body: "Write, self-rate, and revise the Q-Zero for your own program.",
        fields: [
          { id: "program", label: "Program name", required: true },
          { id: "area", label: "Area of Focus", hint: "Islam to Muslims / Leadership Development / Community Mobilization / Social Justice / Islam for non-Muslims / Operate with Excellence" },
          { id: "philosophy", label: "Step 1 — The philosophy (no event names, no logistics)", long: true, required: true },
          { id: "ifStmt", label: "Step 2 — Draft IF statement (IF we…)", long: true, required: true },
          { id: "thenStmt", label: "Step 3 — Draft THEN statement (a change in a person, not a delivery)", long: true, required: true },
          { id: "traffic", label: "Traffic-light self-rating", hint: "Red / Yellow / Green" },
          { id: "revisedIf", label: "Step 4 — Revised IF after group feedback", long: true },
          { id: "revisedThen", label: "Step 4 — Revised THEN after group feedback", long: true },
        ],
      },
      {
        id: "m2-quiz",
        type: "Quiz",
        title: "Knowledge check — Q-Zero",
        questions: [
          { prompt: "In a Q-Zero, the IF should name…", options: ["A philosophy or approach", "A specific event or service", "An attendance number", "A budget line"], answer: 0 },
          { prompt: "The THEN of a Q-Zero must describe…", options: ["A behavioral or condition change in a person", "How many people attend", "What your program delivers", "The cost of the program"], answer: 0 },
          { prompt: "Law 3 of Q-Zero requires the THEN to…", options: ["Tie to MASGLA's mission", "Be under ten words", "Name a venue", "Include a budget"], answer: 0 },
          { prompt: "Why does 'If we host Youth Camp, then 100 youth will attend' fail?", options: ["The IF names an event and the THEN is attendance, not a change", "It is too long", "It mentions youth", "It has no date"], answer: 0 },
          { prompt: "A 🟢 Green traffic-light rating means…", options: ["IF is a philosophy, THEN is a specific attributable change, and it's mission-tied", "The program is fully funded", "All sessions are scheduled", "The worksheet is submitted"], answer: 0 },
        ],
      },
    ],
  },
  {
    id: "m-toc-3",
    title: "Module 3 — The Impact Pathway",
    summary: "Expand your Q-Zero into the full five-level causal chain, with assumptions at every link.",
    resources: [
      {
        id: "m3-read",
        type: "Note",
        title: "Read first — The five-level causal chain",
        body:
`Your Q-Zero is the spine of your TOC. The impact pathway gives it detail: five levels, each building on the last. Every arrow is a causal claim ("because of this, that happens") and rests on an assumption. If an assumption breaks, the chain breaks — so documenting assumptions is the most strategic thing you can do.

THE LEVELS & their common mistakes:
• INPUTS (the WHO) — your audience. Mistake: listing resources (budget, staff, venue) instead of people.
• ACTIVITIES — what you deliver. Mistake: confusing activities with outputs.
• OUTPUTS — countable results, as Baseline · Metric · Target. Mistake: writing outcomes in the output row.
• OUTCOMES — what changes in a person in 6–18 months. Mistake: being vague ("youth will grow spiritually").
• IMPACT — community transformation in 3–5 years. Mistake: claiming impact one program can't achieve alone.

BASELINE · METRIC · TARGET — be precise:
• Baseline = the current state before the program (your "before" picture).
• Metric = the exact unit you'll count or measure.
• Target = the specific, time-bound value you're aiming for. (Set the baseline BEFORE the program — you can't know if you hit the target without it.)

FOUR ASSUMPTION TYPES: Participant (readiness/motivation), Environmental (partnerships, campus/political climate), Organizational (MASGLA's own capacity), Causal (is the causal claim itself true?).`,
      },
      {
        id: "m3-ws",
        type: "Worksheet",
        title: "Session 3 Worksheet — Your Impact Pathway",
        body: "Draft all five chain levels for your program, with at least one assumption per link.",
        fields: [
          { id: "program", label: "Program name", required: true },
          { id: "qzero", label: "Your Q-Zero (from Session 2)", long: true },
          { id: "inputs", label: "INPUTS — the WHO (who, how many, starting circumstance)", long: true, required: true },
          { id: "activities", label: "ACTIVITIES — what your team delivers", long: true, required: true },
          { id: "baseline", label: "OUTPUTS — Baseline", long: true },
          { id: "metric", label: "OUTPUTS — Metric", long: true },
          { id: "target", label: "OUTPUTS — Target", long: true },
          { id: "outcomes", label: "OUTCOMES — what changes in a person in 6–18 months", long: true, required: true },
          { id: "impact", label: "IMPACT — the community in 3–5 years", long: true },
          { id: "aInputsAct", label: "Assumption: Inputs → Activities", long: true },
          { id: "aActOut", label: "Assumption: Activities → Outputs", long: true },
          { id: "aOutOutcome", label: "Assumption: Outputs → Outcomes", long: true },
          { id: "aOutcomeImpact", label: "Assumption: Outcomes → Impact", long: true },
        ],
      },
      {
        id: "m3-quiz",
        type: "Quiz",
        title: "Knowledge check — Impact Pathway",
        questions: [
          { prompt: "The most common mistake at the INPUTS level is…", options: ["Listing resources (budget, staff, venue) instead of the audience", "Naming too many people", "Forgetting the date", "Using percentages"], answer: 0 },
          { prompt: "Every arrow in the causal chain is…", options: ["A causal claim that rests on an assumption", "A budget transfer", "An activity", "A means of verification"], answer: 0 },
          { prompt: "What does BASELINE mean?", options: ["The current state before the program runs", "The goal you're aiming for", "The number who attended", "The long-term impact"], answer: 0 },
          { prompt: "Which of these is an OUTPUT (not an outcome)?", options: ["100 participants complete the camp", "Youth feel more connected to their faith", "Youth adopt lifelong spiritual habits", "The community is transformed"], answer: 0 },
          { prompt: "An assumption is…", options: ["A condition that must be true for one level to produce the next", "A type of indicator", "A funding source", "A staff role"], answer: 0 },
        ],
      },
    ],
  },
  {
    id: "m-toc-4",
    title: "Module 4 — Building the Logframe",
    summary: "Convert your impact pathway into a formal 4×4 Logical Framework Matrix.",
    resources: [
      {
        id: "m4-read",
        type: "Note",
        title: "Read first — The 4×4 logframe",
        body:
`The logframe takes your impact pathway and organizes it into a table — the same information, structured so funders and leadership can read it at a glance. It has two kinds of logic:

• VERTICAL LOGIC (top↔bottom): the causal chain. Activities produce Outputs; Outputs enable Outcomes; Outcomes drive the Goal. Check it by reading bottom-to-top.
• HORIZONTAL LOGIC (left→right): for each level — (1) Narrative Summary (what it is), (2) Indicator (how you'll know), (3) Baseline + Target (from where, to where), (4) Means of Verification (how you collect the evidence).

THE FOUR ROWS: GOAL (3–5 yr community change) · OUTCOME (6–18 mo change in a person) · OUTPUT (countable deliverable: Baseline→Target) · ACTIVITY (what you deliver).

THE FIVE MOST COMMON MISTAKES:
1. Outputs dressed as outcomes ("300 youth attended" in the outcome row) → write what CHANGED in those youth.
2. Goals too vague to verify → add population + behavior + timeframe.
3. No means of verification → every indicator needs WHO collects, WHAT tool, WHEN, WHERE stored.
4. Activities confused with outputs ("we held 4 events" is an activity; the output is what they produced).
5. Outcomes not attributable to your program → name the participants, period, and specific change.`,
      },
      {
        id: "m4-ws",
        type: "Worksheet",
        title: "Session 4 Worksheet — Your Logframe",
        body: "Draft your 4×4 logframe. For each row, fill all four columns.",
        fields: [
          { id: "program", label: "Program name", required: true },
          { id: "inputs", label: "INPUTS — the WHO", long: true },
          { id: "goal", label: "GOAL row", hint: "Narrative summary · Indicator · Baseline + Target · Means of Verification", long: true, required: true },
          { id: "outcome", label: "OUTCOME row", hint: "Narrative summary · Indicator · Baseline + Target · Means of Verification", long: true, required: true },
          { id: "output", label: "OUTPUT row", hint: "Narrative summary · Indicator · Baseline + Target · Means of Verification", long: true, required: true },
          { id: "activity", label: "ACTIVITY row", hint: "Narrative summary · Indicator · Baseline + Target · Means of Verification", long: true },
        ],
      },
      {
        id: "m4-quiz",
        type: "Quiz",
        title: "Knowledge check — The Logframe",
        questions: [
          { prompt: "The two types of logic in a logframe are…", options: ["Vertical and horizontal", "Top and bottom", "Internal and external", "Input and output"], answer: 0 },
          { prompt: "How do you check vertical logic?", options: ["Read bottom-to-top: do Activities produce Outputs, Outputs enable Outcomes, Outcomes drive the Goal?", "Count the columns", "Check the budget", "Read left-to-right only"], answer: 0 },
          { prompt: "A Means of Verification must specify…", options: ["Who collects it, what tool, when, and where it's stored", "Only the cost", "Just the indicator name", "The facilitator's name"], answer: 0 },
          { prompt: "Why is '300 youth attended Qiyam' wrong in the OUTCOME row?", options: ["Attendance is a count (an output), not a change in people", "It's too specific", "It names a program", "It has a number"], answer: 0 },
          { prompt: "The four columns of a logframe row are…", options: ["Narrative Summary, Indicator, Baseline + Target, Means of Verification", "Who, What, When, Where", "Goal, Outcome, Output, Activity", "Cost, Time, People, Place"], answer: 0 },
        ],
      },
    ],
  },
  {
    id: "m-toc-5",
    title: "Module 5 — Measuring & Validating Impact",
    summary: "Build a measurement plan with SMART indicators, baselines, targets, and assumption tracking.",
    resources: [
      {
        id: "m5-read",
        type: "Note",
        title: "Read first — SMART indicators & Keep/Modify/Cancel",
        body:
`THE MEASUREMENT HIERARCHY: Level 1 Activity tracking (did we deliver?) · Level 2 Output measurement (how much?) · Level 3 ✓ Outcome assessment (what changed in people?) · Level 4 Attribution (did WE cause it?). Most MASGLA programs sit at Level 2. The goal is to reach Level 3 by December 2026.

SMART INDICATORS:
• Specific — exact population, behavior, context (not "stronger faith").
• Measurable — collectable with a defined tool (survey, observation, interview).
• Achievable — realistic for your scope and duration.
• Relevant — directly measures the outcome in your Q-Zero (not a convenient proxy).
• Time-bound — states exactly WHEN it's collected.

ASSUMPTION RISK: Participant (often High — outside your control), Environmental (Medium–High), Organizational (Medium), Causal (Medium — your plan tests it).

KEEP / MODIFY / CANCEL PROTOCOL: 1) FLAG the assumption "Under Review" when an indicator persistently misses. 2) DIAGNOSE — was the assumption invalid, or was implementation inadequate? 3) DECIDE — Keep (improve implementation), Modify (revise the theory), or Cancel (logic is flawed / need is gone). 4) DOCUMENT the decision, evidence, and revised TOC version. Your TOC is a living document — review monthly (outputs), quarterly (outcomes + decisions), annually (full version review).`,
      },
      {
        id: "m5-ws",
        type: "Worksheet",
        title: "Session 5 Worksheet — Your Measurement Plan",
        body: "Build the measurement plan that completes your implementation package.",
        fields: [
          { id: "program", label: "Program name", required: true },
          { id: "baseline", label: "Output — Baseline (current state)", long: true },
          { id: "metric", label: "Output — Metric (what you count)", long: true },
          { id: "target", label: "Output — Target (specific goal, by when)", long: true },
          { id: "smart", label: "SMART outcome indicator", hint: "S: exact population + behavior · M: tool · A: realistic? · R: ties to your Q-Zero? · T: when collected", long: true, required: true },
          { id: "mov", label: "Means of Verification", hint: "Who collects · what tool · how often · where stored", long: true, required: true },
          { id: "a1", label: "Assumption 1 (+ risk: Low / Medium / High)", long: true, required: true },
          { id: "a2", label: "Assumption 2 (+ risk)", long: true },
          { id: "a3", label: "Assumption 3 (+ risk)", long: true },
        ],
      },
      {
        id: "m5-quiz",
        type: "Quiz",
        title: "Knowledge check — Measuring Impact",
        questions: [
          { prompt: "SMART stands for…", options: ["Specific, Measurable, Achievable, Relevant, Time-bound", "Simple, Modern, Accurate, Real, Tested", "Strategic, Measured, Aligned, Reviewed, Tracked", "Specific, Major, Actionable, Realistic, Timely"], answer: 0 },
          { prompt: "Which measurement level is this program's TARGET?", options: ["Level 3 — Outcome assessment", "Level 1 — Activity tracking", "Level 2 — Output measurement", "Level 4 — Attribution"], answer: 0 },
          { prompt: "In the Keep / Modify / Cancel protocol, the first step is to…", options: ["FLAG the assumption as 'Under Review'", "Cancel the program", "Increase the budget", "Publish the annual report"], answer: 0 },
          { prompt: "Participant assumptions are generally rated…", options: ["High risk — largely outside your control", "Low risk — always reliable", "No risk — internal only", "Medium risk — fully controllable"], answer: 0 },
          { prompt: "An indicator being Time-bound means…", options: ["It specifies exactly when the measurement is collected", "It expires after a year", "It takes little time to collect", "It is measured continuously forever"], answer: 0 },
        ],
      },
    ],
  },
];
