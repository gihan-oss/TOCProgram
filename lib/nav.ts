import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  group: string;
  roles: Role[]; // which roles can see it
}

const ALL: Role[] = ["admin", "facilitator", "coordinator", "participant", "executive"];

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", group: "Overview", roles: ALL },

  { href: "/learning", label: "Learning Modules", icon: "GraduationCap", group: "Learn", roles: ["admin", "facilitator", "coordinator", "participant"] },
  { href: "/assessments", label: "Assessments", icon: "ClipboardCheck", group: "Learn", roles: ["admin", "facilitator", "coordinator", "participant"] },

  { href: "/toc", label: "Theory of Change", icon: "Workflow", group: "Build", roles: ["admin", "facilitator", "participant"] },
  { href: "/logframe", label: "Logframe", icon: "Table2", group: "Build", roles: ["admin", "facilitator", "participant"] },
  { href: "/assumptions", label: "Assumption Registry", icon: "ShieldAlert", group: "Build", roles: ["admin", "facilitator", "participant"] },
  { href: "/measurement", label: "Measurement Plan", icon: "Ruler", group: "Build", roles: ["admin", "facilitator", "participant"] },

  { href: "/impact", label: "Impact Dashboard", icon: "TrendingUp", group: "Measure", roles: ALL },
  { href: "/implementation", label: "Implementation", icon: "Rocket", group: "Measure", roles: ALL },
  { href: "/package", label: "Implementation Package", icon: "PackageCheck", group: "Measure", roles: ["admin", "facilitator", "coordinator", "participant"] },
  { href: "/evidence", label: "Evidence Repository", icon: "FolderOpen", group: "Measure", roles: ["admin", "facilitator", "coordinator", "participant"] },

  { href: "/cohorts", label: "Cohorts & People", icon: "Users", group: "Manage", roles: ["admin", "facilitator", "coordinator"] },
  { href: "/reports", label: "Reporting", icon: "FileBarChart", group: "Manage", roles: ["admin", "facilitator", "coordinator", "executive"] },
  { href: "/knowledge", label: "Knowledge Base", icon: "BookOpen", group: "Manage", roles: ALL },
  { href: "/assistant", label: "AI Assistant", icon: "Sparkles", group: "Manage", roles: ["admin", "facilitator", "participant"] },
];

export function navFor(role: Role) {
  return NAV.filter((n) => n.roles.includes(role));
}
