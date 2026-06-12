import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  group: string;
  roles: Role[]; // which roles can see it
}

const STAFF: Role[] = ["admin", "facilitator", "coordinator", "executive"];

export const NAV: NavItem[] = [
  // ---- Learner: journey-first, not everything open at once ----
  { href: "/journey", label: "My Journey", icon: "Footprints", group: "Overview", roles: ["participant"] },

  // ---- Staff overview ----
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", group: "Overview", roles: STAFF },

  // ---- Administration (admins only) ----
  { href: "/admin", label: "Admin Console", icon: "ShieldCheck", group: "Administration", roles: ["admin"] },
  { href: "/admin/access", label: "People & Access", icon: "UserPlus", group: "Administration", roles: ["admin"] },

  // ---- Learn ----
  { href: "/learning", label: "Learning Modules", icon: "GraduationCap", group: "Learn", roles: ["admin", "facilitator", "coordinator", "participant"] },
  { href: "/assessments", label: "Assessments", icon: "ClipboardCheck", group: "Learn", roles: ["admin", "facilitator", "coordinator", "participant"] },

  // ---- Build ----
  { href: "/toc", label: "Theory of Change", icon: "Workflow", group: "Build", roles: ["admin", "facilitator", "participant"] },
  { href: "/logframe", label: "Logframe", icon: "Table2", group: "Build", roles: ["admin", "facilitator", "participant"] },
  { href: "/assumptions", label: "Assumption Registry", icon: "ShieldAlert", group: "Build", roles: ["admin", "facilitator", "participant"] },
  { href: "/measurement", label: "Measurement Plan", icon: "Ruler", group: "Build", roles: ["admin", "facilitator", "participant"] },

  // ---- Measure ----
  { href: "/impact", label: "Impact Dashboard", icon: "TrendingUp", group: "Measure", roles: STAFF },
  { href: "/implementation", label: "Implementation", icon: "Rocket", group: "Measure", roles: STAFF },
  { href: "/package", label: "Implementation Package", icon: "PackageCheck", group: "Measure", roles: ["admin", "facilitator", "coordinator", "participant"] },
  { href: "/evidence", label: "Evidence Repository", icon: "FolderOpen", group: "Measure", roles: ["admin", "facilitator", "coordinator", "participant"] },

  // ---- Manage / resources ----
  { href: "/cohorts", label: "Cohorts & People", icon: "Users", group: "Manage", roles: ["admin", "facilitator", "coordinator"] },
  { href: "/reports", label: "Reporting", icon: "FileBarChart", group: "Manage", roles: ["admin", "facilitator", "coordinator", "executive"] },
  { href: "/knowledge", label: "Knowledge Base", icon: "BookOpen", group: "Resources", roles: ["admin", "facilitator", "coordinator", "participant", "executive"] },
  { href: "/assistant", label: "AI Assistant", icon: "Sparkles", group: "Resources", roles: ["admin", "facilitator", "participant"] },
];

export function navFor(role: Role) {
  return NAV.filter((n) => n.roles.includes(role));
}

// Can this role reach this path? Learners only see their journey-focused set.
export function canAccess(role: Role, pathname: string) {
  const allowed = navFor(role).map((n) => n.href);
  return allowed.some((href) => pathname === href || pathname.startsWith(href + "/"));
}

// Where each role lands after sign-in.
export function homeFor(role: Role) {
  if (role === "participant") return "/journey";
  if (role === "admin") return "/admin";
  return "/dashboard";
}
