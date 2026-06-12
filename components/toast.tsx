"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import * as Icons from "lucide-react";

type ToastKind = "success" | "info" | "error";
interface Toast { id: number; message: string; kind: ToastKind }

const Ctx = createContext<{ toast: (message: string, kind?: ToastKind) => void } | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? Icons.CheckCircle2 : t.kind === "error" ? Icons.AlertCircle : Icons.Info;
          const tone = t.kind === "success" ? "text-[hsl(var(--success))]" : t.kind === "error" ? "text-[hsl(var(--danger))]" : "text-accent";
          return (
            <div key={t.id} className="animate-fade-up pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 shadow-lg">
              <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
              <span className="text-sm font-medium">{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
