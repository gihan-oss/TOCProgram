// The real MASGLA Theory of Change program, ready to load into the Course
// Builder in one click: five sequential modules (one per session). Each module
// is the session's reading broken into article sections (they render as one
// flowing article), then its fillable worksheet, then a knowledge check.
// Content is drawn from the MASGLA × Amal & Company "Five-Session Walkthrough".

import type { CourseModule } from "./content";

export const MASGLA_STARTER: CourseModule[] = [
  // ===================================================================== M1
  {
    id: "m-toc-1",
    title: "Module 1 — Why This Matters & Intro to TOC",
    summary: "Build a shared language and walk the full five-level Theory of Change framework.",
    resources: [
      {
        id: "m1-why",
        type: "Note",
        title: "Why a Theory of Change?",
        body:
`"Your program — does it actually work?" Most of us answer by describing what we DO ("we run Youth Camp"). But the real question is: what changes in someone's life because of what you do — and can you prove it?

A Theory of Change (TOC) is your answer. In one sentence:

IF we do the right things, for the right people, in the right way… THEN specific, measurable change will happen in their lives — and we can prove it.

WHY MASGLA NEEDS THIS

Our Program Dashboard tells us what we ran and how many attended — not what changed. That gap costs us four ways:
• It limits funding — funders ask for evidence of impact, not a list of events.
• It makes decisions instinct-based — we can't prove which programs work, so Keep / Modify / Cancel becomes guesswork.
• It blocks learning across regions — IE and OC can't compare what works without a shared framework.
• It weakens our story — without centering impact we lose the storytelling that builds affiliation, funding, and volunteers.

A Theory of Change doesn't replace your passion — it gives your passion a structure others can see, measure, and fund.

WHAT YOU'LL WALK AWAY WITH
• A shared TOC vocabulary — the five levels in active memory
• Your own program placed in an Area of Focus, an outcome category, and a Tarbiyah outcome
• A first-pass five-level map of your program

Tarbiyah outcome this session serves: Lifelong Learner.`,
      },
      {
        id: "m1-levels",
        type: "Note",
        title: "The Five Levels of a Theory of Change",
        body:
`Every TOC has five levels, each building on the one before (examples shown for Youth Camp):

1. INPUTS — the WHO: the specific people you serve (not budget or staff). e.g. high-school juniors/seniors, spiritually active, vetted; 120 participants.
2. ACTIVITIES — what your team delivers. e.g. a 5-day, spiritually structured retreat at Angelus Oaks with Islamic mentorship.
3. OUTPUTS — countable results, tracked as Baseline · Metric · Target. e.g. baseline 40% salah pre-camp; metric % salah at 3-month follow-up; target 100 completions and 65% salah.
4. OUTCOMES — what changes in a person in 6–18 months (behavior, knowledge, capacity). e.g. youth form lasting Islamic bonds and keep trackable spiritual habits after camp.
5. IMPACT — long-term community transformation over 3–5 years. e.g. a generation carrying Islamic identity into adult Muslim leadership.

THE COMPOUNDING COST OF NOT MEASURING
• It starts here: we don't capture our impact.
• Which means: we can't tell the story of the change we create.
• Which leads to: weaker affiliation with the organization.
• And ends in: less support — funding and volunteers fall away.

A TOC interrupts this chain at the first link — it makes the work legible to people who weren't in the room.`,
      },
      {
        id: "m1-areas",
        type: "Note",
        title: "Six Areas of Focus & the Tarbiyah Outcomes",
        body:
`MASGLA organizes its work across six Areas of Focus. Your program's TOC should connect to one, and target its outcome category:
• Islam to Muslims — KNOWLEDGE; BEHAVIORAL. (Youth Camp, Qiyam, Usrah, BJJ, Quran/Arabic, MAS Breakroom.)
• Leadership Development — CAPACITY; INFLUENCE. (Agents of Change, Effective Muslim Activist, TI Camp, Men's/Women's Camp.)
• Community Mobilization — NETWORK; SCALE. (Lighthouse YP Conference, Islamic Knowledge Competition.)
• Social Justice — PARTNERSHIP; STRATEGIC ALIGNMENT. (Voices Unveiled, PACE Advocacy.)
• Islam for non-Muslims — POSITIVE IMAGE; ACCEPTING ISLAM. (Da'wah, interfaith, public campaigns.)
• Operate with Excellence — WELCOMING CULTURE; STRATEGIC ALIGNMENT; FINANCIAL SUSTAINABILITY.

THE FOUR TARBIYAH OUTCOMES
Underneath every program sit four cross-cutting outcomes — the kind of Muslim each program helps shape. Your Outcomes row (Session 3) and indicators (Session 5) should ladder up to one or more:
• Lifelong Learner — keeps seeking beneficial knowledge; treats learning as worship.
• Bearer of the Message — carries and conveys Islam through word, character, practice.
• Agent of Change — acts on what they know; improves self, family, community; stands for justice.
• Exemplary Citizen — principled, productive, engaged in wider society; models Islam at work and in civic life.`,
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

  // ===================================================================== M2
  {
    id: "m-toc-2",
    title: "Module 2 — Q-Zero",
    summary: "Sharpen your program into a clean, testable If–Then statement.",
    resources: [
      {
        id: "m2-what",
        type: "Note",
        title: "What is Q-Zero?",
        body:
`Q-Zero is the most important question about your program: why does it produce change — in a single, testable sentence?

THE Q-ZERO FORMULA
IF we do [approach or philosophy], THEN [specific behavioral or condition change] will occur.

What's NOT in it: no event names, no attendance numbers, no logistics. Just a philosophy (the IF) and the change it produces (the THEN).

WHAT YOU'LL WALK AWAY WITH
• A polished, mission-tied Q-Zero for your own program
• The Three Laws + Traffic Light as a reusable quality check
• The ability to spot when an IF is still an event, and a THEN still a delivery

Tarbiyah outcome this session serves: Bearer of the Message.`,
      },
      {
        id: "m2-laws",
        type: "Note",
        title: "The Three Laws of Q-Zero",
        body:
`Your Q-Zero must pass all three gates before it's ready.

LAW 1 — LIBERATE THE IF
Name a philosophy, not an event. If you could swap in another program and the IF still fits, it's too generic.
• Wrong: "If we run BJJ classes…"
• Right: "If we create consistent, faith-framed physical-discipline environments for young men…"

LAW 2 — DEMAND A BEHAVIORAL THEN
Describe what changes in a person, not what you deliver. Test: "If the program ran perfectly but nothing changed in anyone's life, would this THEN still be true?" If yes, it's still an output.
• Wrong: "…then 100 youth will attend camp."
• Right: "…then youth adopt structured spiritual habits they continue independently after camp."

LAW 3 — TIE TO MISSION
The THEN must connect to MASGLA's mission — Islamic identity, community revival, principled leadership. If it could belong to any sports club or nonprofit, it doesn't yet have MASGLA's fingerprint.
• Wrong: "…then youth will feel more confident."
• Right: "…then youth feel grounded in their Islamic identity and make decisions anchored in their values as Muslims."`,
      },
      {
        id: "m2-traffic",
        type: "Note",
        title: "The Traffic-Light Check",
        body:
`After writing your Q-Zero, rate it before sharing with the group:
• Red — IF names an event; THEN is attendance/delivery; no mission link. Start over: what's the philosophy behind the event?
• Yellow — behavioral THEN but vague ("grow spiritually"), or the IF is still logistics. Sharpen: how would you know it happened? What would you see, hear, or measure?
• Green — IF names a philosophy; THEN is a specific, attributable change; clearly mission-tied. You're ready — bring it to the group to strengthen further.`,
      },
      {
        id: "m2-examples",
        type: "Note",
        title: "Before & After — real MASGLA examples",
        body:
`YOUTH CAMP
Before: "If we provide spiritually intense retreats for high schoolers, then they will form meaningful bonds and gain positive mentorship."
After: "If we immerse carefully selected high schoolers in a spiritually structured, nature-based retreat with Islamic mentorship, then they will develop lasting brotherhood bonds and return home with specific, trackable spiritual habits they continue independently."

BJJ CLASSES
Before: "If we provide halal martial arts spaces for young men, then they will develop brotherhood, physical discipline, and emotional maturity."
After: "If we create consistent, faith-framed martial arts environments for young men, then they will develop self-discipline, emotional regulation, and Islamic brotherhood that extends beyond the mat into their daily lives."

MAS BREAKROOM
Before: "If we create programs that guide people to form close bonds for the sake of Allah, then Muslims will have stronger support systems."
After: "If we create intentional, faith-centered social environments for adults 18–35, then participants form Islamic friendships that function as mutual accountability structures — deepening their deen outside the program."`,
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
          { prompt: "A green traffic-light rating means…", options: ["IF is a philosophy, THEN is a specific attributable change, and it's mission-tied", "The program is fully funded", "All sessions are scheduled", "The worksheet is submitted"], answer: 0 },
        ],
      },
    ],
  },

  // ===================================================================== M3
  {
    id: "m-toc-3",
    title: "Module 3 — The Impact Pathway",
    summary: "Expand your Q-Zero into the full five-level causal chain, with assumptions at every link.",
    resources: [
      {
        id: "m3-spine",
        type: "Note",
        title: "From your Q-Zero to the full chain",
        body:
`Your Q-Zero is the spine of your TOC. The impact pathway gives it detail: five levels, each building on the last.

Every arrow in the chain is a causal claim ("because of this, that happens") and rests on an assumption — a condition that must be true for the chain to hold. If an assumption breaks, the chain breaks. Documenting assumptions is the most strategic thing you can do.

WHAT YOU'LL WALK AWAY WITH
• A complete five-level impact pathway for your program
• At least one named assumption per causal link, by type
• A working Output-vs-Outcome distinction you can apply on the fly

Tarbiyah outcomes this session serves: Bearer of the Message + Agent of Change.`,
      },
      {
        id: "m3-levels",
        type: "Note",
        title: "The five levels & their common mistakes",
        body:
`• INPUTS (the WHO) — your audience: who they are before the program starts. Mistake: listing resources (budget, staff, venue) instead of people.
• ACTIVITIES — what your team delivers. Mistake: confusing activities with outputs.
• OUTPUTS — countable results (Baseline · Metric · Target). Mistake: writing outcomes here — "300 youth felt more connected" is an outcome, not an output.
• OUTCOMES — what changes in a person in 6–18 months. Mistake: being vague — "youth will grow spiritually" is a wish, not an outcome.
• IMPACT — community transformation over 3–5 years. Mistake: claiming impact one program can't achieve alone — impact is a contribution.`,
      },
      {
        id: "m3-bmt",
        type: "Note",
        title: "Baseline, Metric, Target",
        body:
`The Output level has three parts — keep them precise:
• BASELINE — the current state before the program runs. e.g. 40% of participants report consistent salah at intake.
• METRIC — the exact unit you count or measure. e.g. % reporting consistent salah at a 3-month follow-up.
• TARGET — the specific, time-bound value you aim for. e.g. 100 completions and 65% consistent salah at the 3-month survey.

Remember: set your baseline BEFORE the program begins — you can't know if you hit the target without knowing where you started.`,
      },
      {
        id: "m3-assumptions",
        type: "Note",
        title: "The four assumption types",
        body:
`Every arrow rests on an assumption. There are four types:
• PARTICIPANT — readiness, motivation, circumstances of the people you serve. e.g. families allow overnight camp attendance.
• ENVIRONMENTAL — external conditions: masjid partnerships, campus climate, regional context. e.g. masjid facilities stay accessible.
• ORGANIZATIONAL — MASGLA's own capacity: staff, volunteers, coordination. e.g. trained naqeebs are consistently available.
• CAUSAL — whether the causal claim itself is true. e.g. physical discipline in a halal environment actually transfers to emotional maturity outside the gym.`,
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

  // ===================================================================== M4
  {
    id: "m-toc-4",
    title: "Module 4 — Building the Logframe",
    summary: "Convert your impact pathway into a formal 4×4 Logical Framework Matrix.",
    resources: [
      {
        id: "m4-what",
        type: "Note",
        title: "What is a logframe? Two kinds of logic",
        body:
`The logframe takes your impact pathway and organizes it into a table — the same information, structured so funders and leadership can read it at a glance.

VERTICAL LOGIC (top to bottom) — the causal chain. Activities produce Outputs; Outputs enable Outcomes; Outcomes drive the Goal. Check it bottom-to-top: "If we do these Activities, does it make sense we'd produce these Outputs?" Work upward; a gap means your logic is broken.

HORIZONTAL LOGIC (left to right) — for each level: (1) Narrative Summary (what it is), (2) Indicator (how you'll know), (3) Baseline + Target (from where, to where), (4) Means of Verification (how you collect the evidence). Check: "If the indicator hits target, does that prove this level happened?"

WHAT YOU'LL WALK AWAY WITH
• A draft 4×4 logframe for your program
• Vertical & horizontal checks running in your head as you build
• A funder-ready structure that turns your pathway into a defendable artifact

Tarbiyah outcome this session serves: Exemplary Citizen.`,
      },
      {
        id: "m4-structure",
        type: "Note",
        title: "The standard 4×4 structure",
        body:
`Four rows (levels) × four columns (Narrative Summary · Indicator · Baseline + Target · Means of Verification):
• GOAL — the 3–5 year community change you contribute to. Tracked annually. MoV: community surveys, longitudinal/alumni data.
• OUTCOME — what changes in a person in 6–18 months. MoV: pre/post surveys, interviews, follow-up calls.
• OUTPUT — the countable deliverable (Baseline → Target). MoV: attendance logs, program reports, the Dashboard.
• ACTIVITY — what you deliver. MoV: calendars, staff and facilitator logs.`,
      },
      {
        id: "m4-worked",
        type: "Note",
        title: "Worked example — Youth Camp logframe",
        body:
`GOAL — High schoolers who carry Islamic identity and brotherhood into adult Muslim life.
• Indicator: % of camp alumni still active in an Islamic community space 2 years after camp.
• Baseline → Target: not yet tracked → 70% active at 2-year follow-up.
• MoV: annual alumni survey; usrah enrollment records.

OUTCOME — Participants form lasting Islamic bonds and keep trackable spiritual habits after camp.
• Indicator: % reporting consistent salah AND one active Islamic friendship at 3 months.
• Baseline → Target: 40% consistent salah at intake → 65% at the 3-month follow-up.
• MoV: 3-month post-camp survey; facilitator check-in calls.

OUTPUT — 100 vetted high schoolers complete the full camp.
• Indicator: # completing the 5-day camp; # of 1:1 mentorship sessions.
• Baseline → Target: 80 last year → 100 completions; avg 2 mentorship sessions each.
• MoV: attendance logs; vetting records; mentor logs.

ACTIVITY — A 5-day structured retreat with mentorship, bonding, and worship programming.
• Indicator: camp delivered on schedule; all mentors briefed and present Day 1.
• Target: 100% of planned sessions delivered.
• MoV: camp schedule; mentor prep records; facilitator debrief.

Inputs (WHO): high-school juniors/seniors, spiritually active, vetted; 100–120 across GLA chapters.`,
      },
      {
        id: "m4-mistakes",
        type: "Note",
        title: "The five most common logframe mistakes",
        body:
`1. Outputs dressed as outcomes — "300 youth attended Qiyam" in the outcome row. Fix: write what CHANGED in those youth.
2. Goals too vague to verify — "strong Muslim youth." Fix: add population + behavior + timeframe.
3. No means of verification — an indicator with no source. Fix: name WHO collects, WHAT tool, WHEN, WHERE it's stored.
4. Activities confused with outputs — "we held 4 events" is an activity; the output is what they produced (e.g. "1,200 attendances across 4 events").
5. Outcomes not attributable to your program — name the participants, the period, and the specific change you produced.`,
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

  // ===================================================================== M5
  {
    id: "m-toc-5",
    title: "Module 5 — Measuring & Validating Impact",
    summary: "Build a measurement plan with SMART indicators, baselines, targets, and assumption tracking.",
    resources: [
      {
        id: "m5-hierarchy",
        type: "Note",
        title: "The measurement hierarchy",
        body:
`There are four levels of measurement. Most MASGLA programs sit at Level 2; the goal is Level 3 by December 2026.
• LEVEL 1 — Activity tracking: did we deliver? (Did we run the camp?) Easy; tells you little about impact.
• LEVEL 2 — Output measurement: how much? (How many participants/sessions?) What the Dashboard mostly captures today.
• LEVEL 3 (TARGET) — Outcome assessment: what changed in people's lives? Where the real proof of impact lives.
• LEVEL 4 — Attribution: can we prove WE caused the change? Needs comparison groups; valuable for large grants.

WHAT YOU'LL WALK AWAY WITH
• At least one SMART outcome indicator for your program
• A means-of-verification plan and an assumption register with risk ratings
• The Keep / Modify / Cancel protocol, ready to run on real data

Tarbiyah outcome this session serves: Agent of Change.`,
      },
      {
        id: "m5-smart",
        type: "Note",
        title: "SMART indicators",
        body:
`An indicator is only useful if it's SMART:
• SPECIFIC — exact population, behavior, context (not "stronger faith").
• MEASURABLE — collectable with a defined tool (survey, observation, interview).
• ACHIEVABLE — realistic for your scope and duration (a one-week camp can't produce a 5-year transformation).
• RELEVANT — directly measures the outcome in your Q-Zero, not a convenient proxy.
• TIME-BOUND — states exactly WHEN it's collected.

Example: "By end of Q4 2026, at least 65% of TI Camp participants are actively mentoring at least one person in their community, per the December survey."`,
      },
      {
        id: "m5-risk",
        type: "Note",
        title: "Assumption types & risk",
        body:
`Categorize the assumptions you wrote in Session 3 and rate their risk:
• PARTICIPANT — often HIGH risk; largely outside your control. If they break, the whole chain breaks.
• ENVIRONMENTAL — MEDIUM to HIGH; external factors can shift without warning.
• ORGANIZATIONAL — MEDIUM; within MASGLA's control but capacity-dependent.
• CAUSAL — MEDIUM; your measurement plan exists to test these.`,
      },
      {
        id: "m5-kmc",
        type: "Note",
        title: "Keep / Modify / Cancel + the review cycle",
        body:
`When data comes in, run the four-step protocol:
1. FLAG — when an indicator persistently misses, mark the assumption "Under Review." Don't wait for annual planning.
2. DIAGNOSE — is the assumption invalid (causal logic broken), or was implementation inadequate (we didn't run it well enough to test the theory)?
3. DECIDE — KEEP (assumption valid; improve implementation), MODIFY (revise the Q-Zero/logframe to a more accurate theory), or CANCEL (logic is flawed or the need is gone).
4. DOCUMENT — record the decision, the evidence, and the revised TOC version. This is your learning trail and your credibility with donors.

THE REVIEW CYCLE — your TOC is a living document:
• Monthly — program leads review output data; flag programs below target.
• Quarterly — directors review outcome indicators and assumptions; make Keep / Modify / Cancel decisions.
• Annually — full TOC version review; update baselines; publish the annual impact report.

THE DECEMBER 2026 GOAL
100% of MASGLA program leads with a completed, reviewed TOC package — Q-Zero, impact pathway, logframe, and measurement plan — for their actual program. Not an exam: evidence you can think strategically about your program and measure its impact.`,
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
