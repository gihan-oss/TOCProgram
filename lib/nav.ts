import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  group: string;
  roles: Role[];
}

// Deliberately small menus. Participants get a focused path; admins get a
// console + the course builder + people. Admins can reach everything else, it's
// just not cluttering the menu (see canAccess + the Admin console cards).
export const NAV: NavItem[] = [
  // ---- Participant ----
  { href: "/learning", label: "My Learning", icon: "GraduationCap", group: "Learn", roles: ["participant"] },
  { href: "/assistant", label: "AI Coach", icon: "Sparkles", group: "Learn", roles: ["participant"] },

  // ---- Admin ----
  { href: "/admin", label: "Admin Home", icon: "LayoutDashboard", group: "Administration", roles: ["admin"] },
  { href: "/learning", label: "Course Builder", icon: "BookMarked", group: "Administration", roles: ["admin", "facilitator"] },
  { href: "/admin/access", label: "People & Access", icon: "UserPlus", group: "Administration", roles: ["admin"] },
  { href: "/assistant", label: "AI Coach", icon: "Sparkles", group: "Administration", roles: ["admin", "facilitator"] },

  // ---- Facilitator / coordinator / executive (kept light) ----
  { href: "/cohorts", label: "People", icon: "Users", group: "Manage", roles: ["facilitator", "coordinator"] },
  { href: "/reports", label: "Reports", icon: "FileBarChart", group: "Manage", roles: ["coordinator", "executive"] },
  { href: "/impact", label: "Impact", icon: "TrendingUp", group: "Manage", roles: ["executive"] },
];

export function navFor(role: Role) {
  return NAV.filter((n) => n.roles.includes(role));
}

// Admins can reach any route (their menu is just trimmed for clarity).
// Other roles are confined to what's in their menu.
export function canAccess(role: Role, pathname: string) {
  if (role === "admin") return true;
  const allowed = navFor(role).map((n) => n.href);
  return allowed.some((href) => pathname === href || pathname.startsWith(href + "/"));
}

export function homeFor(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "participant") return "/learning";
  if (role === "executive") return "/impact";
  if (role === "coordinator") return "/reports";
  return "/learning"; // facilitator → course builder
}
