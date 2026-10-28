"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Quote, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestimonialProps {
  id: string;
  name: string;
  role: string;
  pathway: "RN" | "PN";
  studyFocus: string;
  content: string;
  date: string;
}

const testimonials: TestimonialProps[] = [
  {
    id: "test-1",
    name: "Alex R., BSN",
    role: "NCLEX-RN Candidate",
    pathway: "RN",
    studyFocus: "Physiological Adaptation & Prioritization",
    content:
      "The clinical rationales helped me stop memorizing isolated facts and start thinking through priority nursing actions. Breaking down why each distractor was unsafe changed how I approached multisystem questions.",
    date: "October 2026",
  },
  {
    id: "test-2",
    name: "Sam K., LPN",
    role: "NCLEX-PN Candidate",
    pathway: "PN",
    studyFocus: "Cardiovascular & Pharmacology",
    content:
      "Clear explanations and a question bank that genuinely reflected the exam format. The medication antidote tables and client monitoring questions gave me confidence on test day.",
    date: "September 2026",
  },
  {
    id: "test-3",
    name: "Jordan M., RN",
    role: "Registered Nurse Pathway",
    pathway: "RN",
    studyFocus: "Pharmacology & Parenteral Therapies",
    content:
      "Having the Study Guide organized right alongside the question bank made my daily review sessions much calmer. Whenever I missed a pharmacology question, I could review the exact medication class notes in minutes.",
    date: "September 2026",
  },
  {
    id: "test-4",
    name: "Taylor D., LPN",
    role: "NCLEX-PN Candidate",
    pathway: "PN",
    studyFocus: "Infection Control & Safety",
    content:
      "The targeted diagnostic quizzes showed me exactly which client need areas required attention. The interface was distraction-free and the explanations were straightforward and evidence-based.",
    date: "August 2026",
  },
  {
    id: "test-5",
    name: "Morgan L., BSN",
    role: "NCLEX-RN Candidate",
    pathway: "RN",
    studyFocus: "Management of Care & Delegation",
    content:
      "The interface stays clean and distraction-free in both light and dark modes, which made a huge difference during late-evening study blocks after clinical rotations.",
    date: "July 2026",
  },
  {
    id: "test-6",
    name: "Casey P., ADN",
    role: "NCLEX-RN Candidate",
    pathway: "RN",
    studyFocus: "Domain Readiness & Remediation",
    content:
      "I appreciated that the readiness assessments gave me a straightforward breakdown by nursing domain instead of overwhelming charts. I knew right away to spend my final two weeks on maternal-newborn and endocrine care.",
    date: "June 2026",
  },
];

export function TestimonialsPageClient() {
  const [selectedFilter, setSelectedFilter] = React.useState<"ALL" | "RN" | "PN">("ALL");

  const filteredTestimonials = React.useMemo(() => {
    if (selectedFilter === "ALL") return testimonials;
    return testimonials.filter((t) => t.pathway === selectedFilter);
  }, [selectedFilter]);

  return (
    <div className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Page Header */}
      <section className="border-b border-border bg-card/60 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Illustrative Study Scenarios</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground">
            Candidate Learning Reflections &amp; Workflows
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Representative study scenarios and clinical reflections illustrating how nursing candidates leverage PrepFord’s structured rationales and NGN case studies.
          </p>

          {/* Marketing & Provenance Disclosure Safeguard */}
          <div className="mt-6 mx-auto max-w-2xl rounded-xl border border-secondary/20 bg-secondary/5 p-3.5 text-xs text-muted-foreground leading-relaxed text-left">
            <strong className="text-foreground font-semibold">Transparency Notice:</strong> The profiles below reflect representative clinical study workflows and learning journeys. Live verified student reviews will be published as our initial post-examination survey cohorts conclude. Individual examination performance depends on dedicated study and comprehensive nursing clinical knowledge.
          </div>

          {/* Pathway Filter Controls */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setSelectedFilter("ALL")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                selectedFilter === "ALL"
                  ? "bg-secondary text-secondary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Scenarios ({testimonials.length})
            </button>
            <button
              onClick={() => setSelectedFilter("RN")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                selectedFilter === "RN"
                  ? "bg-secondary text-secondary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              NCLEX-RN ({testimonials.filter((t) => t.pathway === "RN").length})
            </button>
            <button
              onClick={() => setSelectedFilter("PN")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                selectedFilter === "PN"
                  ? "bg-secondary text-secondary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              NCLEX-PN ({testimonials.filter((t) => t.pathway === "PN").length})
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTestimonials.map((t) => (
              <Card key={t.id} className="border-border bg-card flex flex-col justify-between hover:border-secondary/50 transition-colors shadow-xs">
                <CardContent className="pt-6 pb-6 flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Quote className="h-6 w-6 text-secondary/40" aria-hidden="true" />
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-bold text-foreground">
                        {t.pathway === "RN" ? "NCLEX-RN" : "NCLEX-PN"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed italic">
                      &ldquo;{t.content}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{t.role} • {t.studyFocus}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">{t.date}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Outcome Disclaimer Callout */}
          <div className="mt-12 rounded-lg border border-border bg-muted/30 p-4 text-center max-w-2xl mx-auto">
            <p className="text-xs text-muted-foreground">
              <strong>Candidate Notice:</strong> Reflections shown above are illustrative candidate study perspectives highlighting PrepFord study workflows. Individual examination outcomes vary according to candidate nursing education and preparation depth.
            </p>
          </div>

          {/* Next Steps CTA Banner */}
          <div className="mt-16 rounded-2xl border border-secondary/20 bg-secondary/5 p-8 text-center sm:p-10 max-w-3xl mx-auto">
            <h2 className="text-2xl font-serif font-bold text-foreground sm:text-3xl">
              Ready to Build Your Clinical Judgment?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
              Explore PrepFord preparation pathways or try sample Next Gen NCLEX questions with immediate rationales.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                <Link href="/courses">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explore PrepFord Courses
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#products">
                  View Preparation Products <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
