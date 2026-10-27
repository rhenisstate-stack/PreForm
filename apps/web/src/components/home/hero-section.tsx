"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const pathwayOptions = [
  {
    id: "rn",
    label: "NCLEX-RN",
    description: "Registered Nurse preparation",
    code: "RN",
    overviewHref: "/nclex-rn",
    enrollHref: "/cart?add=rn-pro",
  },
  {
    id: "pn",
    label: "NCLEX-PN",
    description: "Practical / Vocational Nurse preparation",
    code: "PN",
    overviewHref: "/nclex-pn",
    enrollHref: "/cart?add=pn-pro",
  },
] as const;

export function HeroSection() {
  const [selectedPathway, setSelectedPathway] = React.useState<string | null>(null);

  const activeOption = pathwayOptions.find((p) => p.id === selectedPathway);

  return (
    <section
      id="main-content"
      className="relative pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-4xl lg:mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-secondary">
            <span className="relative -top-[1px] h-1.5 w-1.5 rounded-full bg-secondary" />
            For NCLEX-RN and NCLEX-PN candidates
          </p>
          <h1 className="mt-6 text-4xl font-serif font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Prepare with clarity.{" "}
            <span className="block text-secondary italic">Progress with purpose.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed lg:mx-auto lg:text-xl">
            A focused learning platform for future nurses—built around sound
            clinical reasoning, original study content, and honest measures of
            progress.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
              <Link href="/courses">
                <BookOpen className="mr-2 h-4 w-4" />
                Explore Courses
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto font-medium">
              <Link href="#course-finder">
                <Sparkles className="mr-2 h-4 w-4 text-secondary" />
                Find Your Course
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Independent preparation platform. Not affiliated with or endorsed by NCSBN.
          </p>
        </div>

        {/* Pathway selector */}
        <div className="mt-16 max-w-2xl mx-auto space-y-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center sm:text-left">
            Select your licensure pathway
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pathwayOptions.map((p) => {
              const selected = selectedPathway === p.id;
              return (
                <Button
                  key={p.id}
                  variant={selected ? "default" : "outline"}
                  size="lg"
                  className="w-full justify-between text-left border-2 transition-all h-auto py-3.5"
                  onClick={() => setSelectedPathway(selected ? null : p.id)}
                  aria-pressed={selected}
                >
                  <div>
                    <span className={`block text-sm font-semibold ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                      {p.label}
                    </span>
                    <span className={`text-xs ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {p.description}
                    </span>
                  </div>
                  {selected ? (
                    <ChevronRight className="h-4 w-4 text-primary-foreground shrink-0" />
                  ) : null}
                </Button>
              );
            })}
          </div>

          {activeOption && (
            <div className="mt-3 rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-xs text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-secondary shrink-0" />
                <span>
                  Selected <strong className="text-foreground">{activeOption.label}</strong>: Tailored study materials &amp; CAT assessment packs.
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={activeOption.overviewHref}
                  className="font-medium text-secondary hover:underline"
                >
                  View Details →
                </Link>
                <Link
                  href={activeOption.enrollHref}
                  className="inline-flex items-center rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Enroll Now
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
