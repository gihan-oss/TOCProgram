"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/lib/types";
import { AuthProvider } from "./auth";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("participant");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedRole = (typeof window !== "undefined" && localStorage.getItem("toc-role")) as Role | null;
    const storedTheme = (typeof window !== "undefined" && localStorage.getItem("toc-theme")) as "light" | "dark" | null;
    if (storedRole) setRoleState(storedRole);
    if (storedTheme) setTheme(storedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("toc-theme", theme);
  }, [theme]);

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem("toc-role", r);
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <Ctx.Provider value={{ role, setRole, theme, toggleTheme }}>
      <AuthProvider>{children}</AuthProvider>
    </Ctx.Provider>
  );
}
