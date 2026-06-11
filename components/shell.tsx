"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { navFor } from "@/lib/nav";
import { ROLES, CURRENT_USER } from "@/lib/data";
import { useApp } from "./providers";
import { useAuth } from "./auth";

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const { role, setRole, theme, toggleTheme } = useApp();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const displayName = user?.name || CURRENT_USER.name;
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navFor(role);
  const groups = Array.from(new Set(items.map((i) => i.group)));
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-card transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icons.Compass className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Impact OS</p>
            <p className="text-[11px] text-muted-foreground">Theory of Change Portal</p>
          </div>
        </div>

        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
              {items
                .filter((i) => i.group === group)
                .map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b glass px-4 lg:px-6">
          <button className="rounded-lg p-2 hover:bg-secondary lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Icons.Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground md:flex">
            <Icons.Search className="h-4 w-4" />
            <span>Search programs, indicators, evidence…</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Role switcher (demo) */}
            <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1">
              <Icons.UserCog className="h-4 w-4 text-muted-foreground" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="bg-transparent text-sm font-medium outline-none"
                aria-label="Switch role"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={toggleTheme} className="rounded-lg border bg-background p-2 hover:bg-secondary" aria-label="Toggle theme">
              {theme === "dark" ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: `hsl(${CURRENT_USER.avatarColor})` }}>
                {initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-medium">{displayName}</p>
                <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
              </div>
            </div>

            <button onClick={() => signOut()} className="rounded-lg border bg-background p-2 hover:bg-secondary" aria-label="Sign out" title="Sign out">
              <Icons.LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
