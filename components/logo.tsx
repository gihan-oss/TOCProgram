"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Amal & Company logo. Uses the brand lockup in /public (logo.png on light
// surfaces, logo-white.png on dark/inverted ones), falling back to a simple
// wordmark if the images are missing.
export function Logo({
  className,
  invert = false,
  size = "md",
}: {
  className?: string;
  subtitle?: string | null; // accepted for compatibility; lockup has its own tagline
  invert?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [ok, setOk] = useState(true);
  const h = size === "lg" ? "h-12" : size === "sm" ? "h-7" : "h-9";
  const src = invert ? "/logo-white.png" : "/logo.png";

  if (ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Amal & Company — Scaling Social Impact"
        onError={() => setOk(false)}
        className={cn("w-auto object-contain", h, className)}
      />
    );
  }

  // fallback wordmark
  return (
    <span className={cn("font-extrabold tracking-tight", size === "lg" ? "text-xl" : "text-base", invert ? "text-white" : "text-foreground", className)}>
      Amal <span className="font-medium opacity-70">&amp;</span> Company
    </span>
  );
}
