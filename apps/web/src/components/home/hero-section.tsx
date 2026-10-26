"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const pathwayOptions = [
  {
    id: "rn",
    label: "NCLEX-RN",
    description: "Registered Nurse preparation",
    code: "RN",
  },
  {
    id: "pn",
    label: "NCLEX-PN",
    description: "Practical / Vocational Nurse preparation",
    code: "PN",
  },
] as const;

export function HeroSection() {
  const [selectedPathway, setSelectedPathway] = React.useState<string | null>(null);

  return (
    <section
      id="main-content"
      className="relative pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-4xl lg:mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-green">
            <span className="relative -top-[1px] h-1.5 w-1.5 rounded-full bg-green" />
            For NCLEX-RN and NCLEX-PN candidates
          </p>
          <h1 className="mt-6 text-4xl font-serif font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Prepare with clarity.{" "}
            <span className="block text-green italic">Progress with purpose.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed lg:mx-auto lg:text-xl">
            A focused learning platform for future nurses—built around sound
            clinical reasoning, original study content, and honest measures of
            progress.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/subscriptions">
                Buy Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/sign-up">
                Try Now <Play className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted">
            Independent preparation platform. Not affiliated with or endorsed by
            NCSBN.
          </p>
        </div>

        {/* Pathway selector */}
        <div className="mt-16 max-w-2xl mx-auto space-y-4">
          <p className="text-sm font-medium text-muted uppercase tracking-wider">
            Select your pathway
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pathwayOptions.map((p) => {
              const selected = selectedPathway === p.id;
              return (
                <Button
                  key={p.id}
                  variant={selected ? "default" : "outline"}
                  size="lg"
                  className="w-full justify-between text-left border-2 transition-all"
                  onClick={() => setSelectedPathway(p.id)}
                  aria-pressed={selected}
                >
                  <div>
                    <span className="block text-sm font-semibold text-ink">
                      {p.label}
                    </span>
                    <span className="text-xs text-muted">{p.description}</span>
                  </div>
                  {selected ? (
                    <ChevronRight className="h-4 w-4 text-primary-foreground" />
                  ) : null}
                </Button>
              );
            })}
          </div>
          {selectedPathway && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-green/10 px-3 py-2 text-xs text-green-dark">
              <span className="relative -top-[1px] h-1.5 w-1.5 rounded-full bg-green-dark" />
              Selected{" "}
              <span className="font-medium">{selectedPathway.toUpperCase()}</span>{" "}
              pathway
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
