import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  group: string;
  roles: Role[];
}

// Richer than the bare version, but grouped and tidy. The icon rail keeps it
// compact; hovering reveals the labels and group headings.
export const NAV: NavItem[] = [
  // ---- Participant: a guided path ----
  { href: "/journey", label: "My Journey", icon: "Footprints", group: "Overview", roles: ["participant"] },
  { href: "/learning", label: "My Learning", icon: "GraduationCap", group: "Learn", roles: ["participant"] },
  { href: "/assessments", label: "Assessments", icon: "ClipboardCheck", group: "Learn", roles: ["participant"] },
  { href: "/certificate", label: "My Certificate", icon: "Award", group: "Learn", roles: ["participant"] },
  { href: "/toc", label: "Theory of Change", icon: "Workflow", group: "Build", roles: ["participant"] },
  { href: "/logframe", label: "Logframe", icon: "Table2", group: "Build", roles: ["participant"] },
  { href: "/assumptions", label: "Assumption Registry", icon: "ShieldAlert", group: "Build", roles: ["participant"] },
  { href: "/measurement", label: "Measurement", icon: "Ruler", group: "Build", roles: ["participant"] },
  { href: "/package", label: "My Package", icon: "PackageCheck", group: "Build", roles: ["participant"] },
  { href: "/evidence", label: "Evidence Repository", icon: "FolderOpen", group: "Build", roles: ["participant"] },

  // ---- Facilitator: run the cohort ----
  { href: "/plan", label: "Facilitator Plan", icon: "ClipboardList", group: "Facilitate", roles: ["facilitator", "admin"] },
  { href: "/cohorts", label: "Participants", icon: "Users", group: "Facilitate", roles: ["facilitator"] },
  { href: "/assessments", label: "Assessments", icon: "ClipboardCheck", group: "Facilitate", roles: ["facilitator", "admin"] },

  // ---- Admin / staff: administration ----
  { href: "/admin", label: "Admin Home", icon: "LayoutDashboard", group: "Administration", roles: ["admin"] },
  { href: "/admin/clients", label: "Clients", icon: "Building2", group: "Administration", roles: ["admin"] },
  { href: "/learning", label: "Course Builder", icon: "BookMarked", group: "Administration", roles: ["admin", "facilitator"] },
  { href: "/admin/access", label: "People & Access", icon: "UserPlus", group: "Administration", roles: ["admin"] },
  { href: "/admin/learners", label: "Learner Tracking", icon: "UserCheck", group: "Administration", roles: ["admin", "facilitator", "coordinator"] },

  // ---- Insights / dashboards ----
  { href: "/dashboard", label: "Dashboard", icon: "Gauge", group: "Insights", roles: ["admin", "facilitator", "coordinator", "executive"] },
  { href: "/impact", label: "Impact", icon: "TrendingUp", group: "Insights", roles: ["admin", "facilitator", "coordinator", "executive"] },
  { href: "/implementation", label: "Implementation", icon: "Rocket", group: "Insights", roles: ["admin", "facilitator", "executive"] },

  // ---- Strategy & Programs ----
  { href: "/strategy", label: "Strategy House", icon: "Building2", group: "Strategy", roles: ["admin", "facilitator", "coordinator", "executive", "participant"] },
  { href: "/programs", label: "Programs (TOC)", icon: "FolderKanban", group: "Strategy", roles: ["admin", "facilitator", "coordinator", "participant"] },

  // ---- Help (everyone) ----
  { href: "/knowledge", label: "Knowledge Base", icon: "BookOpen", group: "Help", roles: ["participant", "admin", "facilitator", "coordinator", "executive"] },
  { href: "/assistant", label: "AI Coach", icon: "Sparkles", group: "Help", roles: ["participant", "admin", "facilitator"] },
];

// The "Build" stage — and the certificate that bridges into it — stay locked
// for participants until all learning modules are complete.
export const GATED_GROUP = "Build";
export const GATED_HREFS = ["/toc", "/logframe", "/assumptions", "/measurement", "/package", "/evidence", "/certificate"];
export function isGatedPath(pathname: string) {
  return GATED_HREFS.some((h) => pathname === h || pathname.startsWith(h + "/"));
}

export function navFor(role: Role) {
  // de-dupe by href (a couple of routes appear with role-specific labels)
  const seen = new Set<string>();
  return NAV.filter((n) => n.roles.includes(role)).filter((n) => {
    const k = `${n.group}:${n.href}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Admins can reach any route; their menu is just curated.
export function canAccess(role: Role, pathname: string) {
  if (role === "admin") return true;
  const allowed = navFor(role).map((n) => n.href);
  return allowed.some((href) => pathname === href || pathname.startsWith(href + "/"));
}

export function homeFor(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "participant") return "/journey";
  if (role === "executive") return "/dashboard";
  if (role === "coordinator") return "/dashboard";
  return "/plan"; // facilitator → their cohort plan
}
