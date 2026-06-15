// MAS GLA (Muslim American Society — Greater Los Angeles) strategic framework,
// from the Amal & Company "Vision 2026" strategy report. This is the real
// model the platform is built around — not generic LMS content.

export const MAS = {
  org: "MAS GLA",
  orgFull: "Muslim American Society — Greater Los Angeles",
  partner: "Amal & Company",
  vision: "Vision 2026",
  northStar: "To move people and nurture lifelong, God-centered agents of change.",
};

// The 6-layer strategy methodology (the "Strategy House" cascade).
export const METHODOLOGY = [
  { n: 1, name: "Vision", desc: "The long-term aspiration that anchors everything." },
  { n: 2, name: "Mission", desc: "Move people and nurture lifelong, God-centered agents of change." },
  { n: 3, name: "Area of Focus", desc: "The six pillars the work is organized around." },
  { n: 4, name: "Operational Plan", desc: "How each area is executed on the ground." },
  { n: 5, name: "Resource Allocation", desc: "People, time and budget aligned to priorities." },
  { n: 6, name: "Performance Review", desc: "Measuring what matters and adjusting course." },
];

export interface AreaOfFocus {
  id: string;
  name: string;
  verbs: [string, string, string];
  icon: string;
  tone: string;
}

// The 6 Areas of Focus (Strategy House pillars).
export const AREAS_OF_FOCUS: AreaOfFocus[] = [
  { id: "islam-muslims", name: "Islam to Muslims", verbs: ["Develop", "Produce", "Distribute"], icon: "BookOpen", tone: "text-accent bg-accent/10" },
  { id: "leadership", name: "Leadership Development", verbs: ["Train", "Equip", "Support"], icon: "Users", tone: "text-primary bg-primary/10" },
  { id: "community", name: "Community Mobilization", verbs: ["Identify", "Organize", "Anchor"], icon: "Megaphone", tone: "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)]" },
  { id: "social-justice", name: "Social Justice", verbs: ["Train", "Advocate", "Develop"], icon: "Scale", tone: "text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.14)]" },
  { id: "islam-nonmuslims", name: "Islam to Non-Muslims", verbs: ["Connect", "Develop", "Distribute"], icon: "Handshake", tone: "text-accent bg-accent/10" },
  { id: "excellence", name: "Operate with Excellence", verbs: ["Foster", "Communicate", "Optimize"], icon: "Sparkles", tone: "text-primary bg-primary/10" },
];

export interface WorkstreamTask {
  name: string;
  progress: number | null; // null = no tasks yet
}
export interface Workstream {
  id: string;
  title: string;
  objective: string;
  tasks: WorkstreamTask[];
}

// Transformation workstreams ("Connecting the Dots"). Empty by default — add
// your own workstreams and tasks; no fabricated progress.
export const WORKSTREAMS: Workstream[] = [];

export function workstreamProgress(w: Workstream) {
  const vals = w.tasks.map((t) => t.progress).filter((p): p is number => p !== null);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// 12 desired defined outcomes + 4 metrics of success.
export const DESIRED_OUTCOMES = [
  "Knowledge", "Behavioral", "Capacity", "Influence", "Network", "Scale",
  "Connect", "Move", "Authentic Image", "Accepting Islam", "Welcoming", "Strategic Alignment",
];

export const SUCCESS_METRICS = [
  { name: "Authentic Knowledge Proficiency", icon: "GraduationCap" },
  { name: "Foundational Worship Practice", icon: "Heart" },
  { name: "Leadership Quality & Quantity", icon: "Users" },
  { name: "Exponential Growth & Impact", icon: "TrendingUp" },
];

// Diagnostic finding: the shift.
export const THE_SHIFT = {
  previous: [
    { label: "Reactive Execution", desc: "Programs launched without consistent alignment to mission or long-term impact." },
    { label: "Operational Strain", desc: "Heavy reliance on informal communication and unclear roles strained volunteers and resources." },
    { label: "Fragmented Leadership", desc: "Alignment challenges and cultural friction hindered collaboration." },
  ],
  forward: [
    { label: "Intentional Strategy", desc: "All initiatives are vetted for alignment with the mission and Tarbiya focus before approval." },
    { label: "Structured Systems", desc: "Professional systems for communication, performance tracking and accountability." },
    { label: "Unified Culture", desc: "A collaborative environment that empowers leaders and embraces a shared strategic direction." },
  ],
};

// ---- "Know Our Members" profile fields (rich signup) ----
export const MEMBER_ROLE_TYPES = [
  "Volunteer",
  "Team Lead",
  "Staff",
  "Department Head",
  "Leadership / Board",
  "Community Member",
];

export const DEPARTMENTS = [
  ...AREAS_OF_FOCUS.map((a) => a.name),
  "Operations",
  "Finance",
  "Communications",
];

export const COMMITMENT_LEVELS = [
  "Under 2 hrs / week",
  "2–5 hrs / week",
  "5–10 hrs / week",
  "10+ hrs / week",
];

export const TENURE_OPTIONS = ["New (< 6 months)", "6–12 months", "1–3 years", "3+ years"];

// ---- Question Zero flow (Who? → What? → Result? → Change? → Ultimate WHY?) ----
export const QUESTION_ZERO = [
  { step: "Who?", desc: "Who is the target audience — the Input?" },
  { step: "What?", desc: "What will we actually do — the activity?" },
  { step: "Result?", desc: "What immediate result / output do we expect?" },
  { step: "Change?", desc: "What change (outcome) does it create in people?" },
  { step: "Ultimate WHY?", desc: "How does it move people as lifelong, God-centered agents of change?" },
];

// ---- Programs / TOC Dashboard ----
export const DECISION_STATUS = ["Keep", "Modify", "Cancel"] as const;
export type Decision = (typeof DECISION_STATUS)[number];

export const PROGRAM_STATUS = ["On Track", "Completed", "At Risk", "Not Started"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUS)[number];

export interface Program {
  id: string;
  name: string;
  area: string; // Area of Focus name
  subFocus?: string; // Develop / Train / Equip / ...
  questionZero?: string; // the if-then statement
  input: string; // who (target audience)
  baseline: string; // current output
  target?: string; // goal output
  outcome: string; // desired change
  decision: Decision;
  status: ProgramStatus;
  budget: number;
  department?: string; // Youth / Tarbiya / PACE / Corona Center / Convention
  region?: string; // GLA / IE / OC / LA
  team: string[]; // Person ids assigned to the program
}

// People directory (seed for "Know Our Members"). Programs link to these.
export interface Person {
  id: string;
  name: string;
  roleType: string;
  department: string;
}
// People directory — empty by default; populated from "Know Our Members".
export const PEOPLE: Person[] = [];

// Real MAS GLA programs (example seed). Columns: name, area, sub-focus,
// question zero, input(who), baseline, target, outcome, budget, decision,
// department, region, status.
const SEED: Array<[string, string, string, string, string, string, string, string, number, Decision, string, string, ProgramStatus]> = [
  ["Revive and Reflect Qiyam - End of the Year Program", "Islam to Muslims", "Develop", "If we create programs that guide youth to reflect spiritually at the end of the year, then they will begin the new year with renewed purpose and a stronger connection to Allah.", "High School Juniors and Seniors, College Students, Young Professionals", "150 attendees. 2 Masajid", "4 major events in each locality. 100 attendees per event. Clear structure in forming new habits for the next year and how to implement tracking and accountability.", "Behavioral", 5000, "Keep", "Youth", "GLA", "Completed"],
  ["Agents of Change - Revivers of the Ummah", "Leadership Development", "Train", "If we nurture MSA students and leaders to see themselves as carriers of Islamic revival, then they will develop long-term commitment to uplifting their communities.", "College MSA Members and Leaders", "1 campus event. 50 attendees", "5 Campus events. 30 attendees each. Focused on training the leadership of the MSAs.", "Capacity", 0, "Keep", "Youth", "IE", "Not Started"],
  ["The Effective Muslim Activist", "Leadership Development", "Train", "If we equip youth with prophetic frameworks for activism, then they will advocate with integrity, compassion, and moral clarity.", "College Students in MSA or Social Justice Roles", "1 campus event. 50 attendees.", "5 Campus events. 30 attendees each. Focused on training the leadership of the MSAs.", "Capacity", 0, "Keep", "Youth", "IE", "Not Started"],
  ["Tarbiya and Ilm Camp", "Leadership Development", "Equip", "If we immerse college-aged youth in discipline-based mentorship camps, then they will emerge as consistent Islamic workers and mentors.", "College Juniors/Seniors, Recent Graduates in Mentorship Roles", "100 attendees.", "20 New usrah members from the TI Camp.", "Influence", 30000, "Keep", "Youth", "GLA", "Not Started"],
  ["Brazilian Jiu Jitsu classes at the MAS Corona Center", "Islam to Muslims", "Develop", "If we provide halal martial arts spaces for young men, then they will develop brotherhood, physical discipline, and emotional maturity for the sake of Allah.", "High School and College Males, Interested in Jiu Jitsu", "5 attendees.", "30 regular participants. Social programs beyond the BJJ", "Behavioral", 640, "Modify", "Youth", "IE", "Not Started"],
  ["From the Crescent to the Crown", "Islam to Muslims", "Develop", "If we teach Islamic history through immersive storytelling, then youth will strengthen their Muslim identity and take pride in their heritage.", "High School and College Youth, Interested in Islamic History, interested in video games", "30 attendees.", "An event such as this in each major area. 4 events per region and 50 attendees each.", "Knowledge", 250, "Modify", "Youth", "IE", "Not Started"],
  ["Fontana Masjid Youth Group Support", "Islam to Muslims", "Develop", "If we offer consistent mentorship and programs in underserved masajid, then high schoolers will stay connected to Islamic spaces and community life.", "High School Youth from Underserved Communities", "25 attendees. Program 4 times a year.", "Program 12 times a year. Once per month. 50 participants per event.", "Knowledge", 0, "Cancel", "Youth", "IE", "Not Started"],
  ["Youth Camp", "Islam to Muslims", "Train", "If we provide spiritually intense retreats for high schoolers in the scenic nature of the Angelus Oaks National Forest, then they will form meaningful bonds, and gain positive mentorship in Islam, inshAllah.", "High School Students, Spiritually Active", "120 participants.", "100 Youth Camp attendees that have been carefully vetted and interviewed.", "Behavioral", 50000, "Keep", "Youth", "GLA", "On Track"],
  ["All Masjid Ramadan Qiyam at ISOC", "Islam to Muslims", "Develop", "If we organize unified Ramadan Qiyams, then youth will feel a shared spiritual uplift and stronger sense of Muslim unity.", "High School, College, and Young Professionals", "2500 attendees.", "5000 attendees. Invite famous scholars and speakers.", "Knowledge", 4000, "Modify", "Youth", "OC", "Not Started"],
  ["Youth Qiyam at Various Masajid", "Islam to Muslims", "Develop", "If we create consistent masjid-based spiritual programs, then youth will build lasting spiritual habits and community bonds.", "High School, College, and Young Professionals", "1000 attendees. 15 Masajid.", "25 Masajid. 2000 attendees.", "Knowledge", 5000, "Modify", "Youth", "GLA", "Not Started"],
  ["Youth Usrah in Yorba Linda", "Islam to Muslims", "Distribute", "If we establish regular brotherhood/sisterhood circles, then youth will develop deep bonds rooted in learning and reflection.", "High School Youth", "12 attendees.", "Expanding youth usrahs. 10 Youth Usrahs. 10 attendees each across GLA.", "Behavioral", 100, "Keep", "Youth", "OC", "Not Started"],
  ["Youth Iftar in Ramadan", "Islam to Muslims", "Develop", "If we host shared Ramadan iftars with youth, then they will feel spiritually connected and a sense of belonging.", "High School Youth", "50 attendees.", "One iftar in each region. 100 attendees per iftar. 400 total.", "Behavioral", 2000, "Keep", "Youth", "GLA", "Not Started"],
  ["Salatul Istisqa", "Community Mobilization", "Connect", "If the community prays collectively during hardship, then they will strengthen their reliance on Allah and communal solidarity.", "All Ages in the Muslim Community", "10 Masajid involved.", "20 Masajid involved.", "Network", 0, "Cancel", "Youth", "GLA", "Not Started"],
  ["Voices Unveiled Spirituality and Activism for Palestine", "Social Justice", "Advocate", "If we teach youth about Palestine through a spiritual justice lens, then they will feel empowered to advocate with purpose and principle.", "College Students in MSA, Interested in Palestine Advocacy", "70 attendees.", "200 attendees.", "Move", 1000, "Keep", "Youth", "IE", "Not Started"],
  ["MAS Convention Youth Program", "Islam to Muslims", "Develop", "If we include youth in major community events, then they will take initiative and feel connected to the broader Muslim movement.", "High School and College Youth", "100 attendees.", "300 attendees.", "Behavioral", 0, "Modify", "Youth", "IE", "Not Started"],
  ["Inland Empire Islamic Knowledge Competition", "Community Mobilization", "Organize", "If we prepare youth for friendly Islamic competitions, then they will improve their Islamic literacy and gain peer motivation.", "Middle and High School Students in Competitions", "50", "200", "Network", 500, "Cancel", "Youth", "IE", "Not Started"],
  ["Lighthouse Young Professionals Conference", "Community Mobilization", "Organize", "If we mentor young professionals with faith-based training, then they will become principled leaders in their fields and communities.", "College Seniors and Young Professionals", "100 attendees", "500 attendees.", "Scale", 15000, "Modify", "Youth", "OC", "Not Started"],
  ["Youth Conference", "Islam to Muslims", "Develop", "If we send youth to Islamic conferences, then they will strengthen their connection to Islam, be exposed to diverse Muslim voices, and feel inspired to live as confident Muslims.", "High School and College Youth", "150 attendees.", "300 attendees.", "Knowledge", 10000, "Keep", "Youth", "LA", "On Track"],
  ["Brotherhood Night: Lion of the Desert", "Islam to Muslims", "Develop", "If we create spaces for young men to reflect through faith and media, then they will develop a healthy Islamic masculine identity.", "High School and College Males", "15 attendees", "50 attendees. Regular movie nights each month.", "Behavioral", 300, "Keep", "Youth", "IE", "Not Started"],
  ["MAS Breakroom", "Islam to Muslims", "Develop", "If we create programs that guide people to form close bonds for the sake of Allah then Muslims will have stronger support systems, engage in deeper reflection, and see their friendships as a means of getting closer to Allah (aka: act of worship).", "Adults between the ages of 18 to 35 who are seeking to strengthen their understanding of Islam and build friendships with like-minded growing Muslims.", "80 attendees", "150 attendees regularly.", "Behavioral", 10000, "Keep", "Youth", "IE", "Not Started"],
  ["Men's Camp", "Leadership Development", "Develop", "If we provide men with a focused Islamic retreat, they will build stronger brotherhood and grow spiritually in a distraction-free environment.", "Adult Muslim Men who are in Usrahs", "", "", "Behavioral", 1000, "Keep", "Tarbiya", "", "Not Started"],
  ["Women's Camp", "Leadership Development", "Train", "If we provide women with a focused Islamic retreat, they will strengthen their spiritual foundation and develop lasting sisterhood bonds.", "Adult Muslim Women", "", "", "Capacity", 0, "Keep", "Tarbiya", "", "Not Started"],
  ["OC Sisters Qiyam", "Islam to Muslims", "Develop", "If sisters participate in reflective Qiyam nights, they will feel spiritually rejuvenated and more connected to Allah and each other.", "Sisters, High School & College", "", "", "Capacity", 0, "Keep", "Tarbiya", "", "Not Started"],
  ["IE Qiyam Corona", "Islam to Muslims", "Equip", "If youth attend local Qiyams, they will be more spiritually grounded and engaged with their masjid community.", "Usrah members who live in the Inland Empire", "", "", "Influence", 30000, "Keep", "Tarbiya", "", "Not Started"],
  ["Naqeeb Training", "Islam to Muslims", "Develop", "If Naqeebs receive structured training, they will lead more impactful and effective usrahs.", "Current and New Naqeebs", "", "", "Behavioral", 640, "Modify", "Tarbiya", "", "Not Started"],
  ["Subject Training", "Islam to Muslims", "Develop", "If members are trained in relevant Islamic subjects, they will be better equipped to lead, mentor, and serve their communities.", "Active Members & Naqeebs", "", "", "Knowledge", 250, "Modify", "Tarbiya", "", "Not Started"],
  ["Naqeeb Council Meetings", "Islam to Muslims", "Develop", "If Naqeebs meet regularly as a council, they will be more aligned, collaborative, and effective in leading local units.", "All Naqeebs Across Regions", "", "", "Knowledge", 0, "Cancel", "Tarbiya", "", "Not Started"],
  ["Membership Surveys", "Islam to Muslims", "Distribute", "If we regularly assess member engagement and growth, we can improve our programs and better meet the spiritual needs of our community.", "All Members in the Tarbiya Path", "", "", "Behavioral", 20000, "Keep", "Tarbiya", "", "Not Started"],
  ["Pace Advocacy training", "Islam to Muslims", "", "", "", "", "", "Behavioral", 1000, "Keep", "PACE", "", "Not Started"],
  ["Arabic Class", "Islam to Muslims", "Develop", "If we teach Arabic in a spiritually grounded environment, then students will deepen their relationship with the Qur'an and develop love for the language of revelation.", "Anyone looking to learn arabic", "", "", "Behavioral", 1000, "Keep", "Corona Center", "", "Not Started"],
  ["Kung Fu", "Leadership Development", "Train", "If we offer martial arts programs like Kung Fu, then youth will grow in discipline, confidence, and character rooted in Islamic values.", "Middle and High School Youth and Adults Interested in Martial Arts", "", "", "Capacity", 0, "Keep", "Corona Center", "", "Not Started"],
  ["Men's Brazilian JiuJitsu", "Leadership Development", "Train", "If we create safe and structured Brazilian Jiu Jitsu spaces for men, then they will build discipline, emotional maturity, and brotherhood for the sake of Allah.", "High School, College, and Young Professional Brothers", "", "", "Capacity", 0, "Keep", "Corona Center", "", "Not Started"],
  ["Women's Brazilian Jiu Jitsu", "Leadership Development", "Equip", "If we offer faith-centered Brazilian Jiu Jitsu classes for women, then they will gain strength, confidence, and a supportive sisterhood grounded in Islam.", "High School, College, and Young Professional Sisters", "", "", "Influence", 30000, "Keep", "Corona Center", "", "Not Started"],
  ["Youth Brazilian Jiu Jitsu", "Islam to Muslims", "Develop", "If we introduce youth to Brazilian Jiu Jitsu in a Muslim enviornment, then they will develop physical discipline, self-confidence, and Islamic values of respect and perseverance.", "Boys and Girls Interested in Martial Arts", "", "", "Behavioral", 640, "Modify", "Corona Center", "", "Not Started"],
  ["Quran Class", "Islam to Muslims", "Develop", "If we teach Qur'an with love, consistency, and spiritual reflection, then students will grow in their recitation, understanding, and personal connection to the Book of Allah.", "Elementary to College-Aged Youth, New and Continuing Students of Qur'an", "", "", "Knowledge", 250, "Modify", "Corona Center", "", "Not Started"],
  ["MAS Convention - Attendees (Adults)", "Islam to Muslims", "Develop", "", "", "", "", "Behavioral", 1000, "Keep", "Convention", "", "Not Started"],
  ["MAS Convention - Speakers, Performers, Guests", "Leadership Development", "Train", "", "", "", "", "Capacity", 0, "Keep", "Convention", "", "Not Started"],
  ["MAS Convention - Attendees (Adults) [LD]", "Leadership Development", "Train", "", "", "", "", "Capacity", 0, "Keep", "Convention", "", "Not Started"],
  ["MAS Convention - Volunteers", "Leadership Development", "Equip", "", "", "", "", "Influence", 30000, "Keep", "Convention", "", "Not Started"],
  ["MAS Convention - Committee Heads", "Islam to Muslims", "Develop", "", "", "", "", "Behavioral", 640, "Modify", "Convention", "", "Not Started"],
  ["MAS Convention - Vendors and Sponsors", "Islam to Muslims", "Develop", "", "", "", "", "Knowledge", 250, "Modify", "Convention", "", "Not Started"],
  ["MAS Convention - Parents with young children", "Islam to Muslims", "Develop", "", "", "", "", "Knowledge", 0, "Cancel", "Convention", "", "Not Started"],
];

export const PROGRAMS: Program[] = SEED.map(([name, area, subFocus, questionZero, input, baseline, target, outcome, budget, decision, department, region, status], i) => ({
  id: `p${i + 1}`, name, area, subFocus, questionZero, input, baseline, target, outcome, decision, status, budget, department, region, team: [],
}));

export const PROGRAM_SUMMARY = {
  total: PROGRAMS.length,
  onTrack: PROGRAMS.filter((p) => p.status === "On Track").length,
  completed: PROGRAMS.filter((p) => p.status === "Completed").length,
  budget: PROGRAMS.reduce((s, p) => s + p.budget, 0),
};
export const DECISION_TOTALS = {
  Keep: PROGRAMS.filter((p) => p.decision === "Keep").length,
  Modify: PROGRAMS.filter((p) => p.decision === "Modify").length,
  Cancel: PROGRAMS.filter((p) => p.decision === "Cancel").length,
};
