"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { useAuth } from "./auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Icons.Compass className="h-8 w-8 animate-pulse text-primary" />
          <Icons.Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
