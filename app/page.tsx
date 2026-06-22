import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, FloatingIcons } from "@/components/ui";
import { Logo } from "@/components/logo";
import { TransformationMap } from "@/components/transformation-map";
import { MAS } from "@/lib/mas";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header — just the brand, no competing buttons */}
      <header className="border-b glass">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-4">
          <Logo subtitle="Impact Portal" size="md" />
        </div>
      </header>

      {/* Hero: one message, one button, the picture underneath */}
      <main className="relative flex-1 overflow-hidden">
        <div className="mesh absolute inset-0" />
        <FloatingIcons />
        <section className="relative mx-auto max-w-4xl px-6 py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> {MAS.org} · {MAS.vision}
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Our home for the{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">whole transformation</span>
            {" "}— not just our Theory of Change
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            From our vision and six areas of focus to learning, implementation, measurement and impact —
            this is where the entire work of our chapter comes together. The Theory of Change is one tool
            inside it, not the whole story.
          </p>

          <div className="mt-9 flex justify-center">
            <Link href="/login">
              <Button size="lg">Launch the portal <ArrowRight className="h-5 w-5" /></Button>
            </Link>
          </div>

          {/* The picture: a visual graphic of the comprehensiveness of the work */}
          <div className="mt-12 text-left animate-fade-up">
            <TransformationMap />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-muted-foreground">
          {MAS.orgFull} · {MAS.vision} · in partnership with {MAS.partner}
        </div>
      </footer>
    </div>
  );
}
