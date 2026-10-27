"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Quote, CheckCircle2, BookOpen, Sparkles } from "lucide-react";
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
    role: "RN Candidate",
    pathway: "RN",
    studyFocus: "Next Gen Clinical Case Studies",
    content: "The rationales in PrepFord helped me understand not just the right answer, but why the distractors were unsafe in a clinical scenario. The 6-part unfolding cases mirrored the actual decision-making needed on the NGN.",
    date: "October 2026",
  },
  {
    id: "test-2",
    name: "Sam K., LPN",
    role: "PN Candidate",
    pathway: "PN",
    studyFocus: "Cardiovascular & Pharmacology",
    content: "Clear explanations and a question bank that genuinely reflected the exam format. The medication antidote tables and client monitoring questions gave me confidence on test day.",
    date: "September 2026",
  },
  {
    id: "test-3",
    name: "Jordan M., RN",
    role: "RN Candidate",
    pathway: "RN",
    studyFocus: "Clinical Judgment Measurement Model",
    content: "PrepFord helped me focus on clinical reasoning, not just memorisation. Instead of guessing facts, I learned how to recognize cues, prioritize hypotheses, and evaluate outcomes.",
    date: "September 2026",
  },
  {
    id: "test-4",
    name: "Taylor D., LPN",
    role: "PN Candidate",
    pathway: "PN",
    studyFocus: "Infection Control & Safety",
    content: "The targeted diagnostic quizzes showed me exactly which client need areas required attention. The interface was distraction-free and the explanations were straightforward and evidence-based.",
    date: "August 2026",
  },
  {
    id: "test-5",
    name: "Morgan L., BSN",
    role: "RN Candidate",
    pathway: "RN",
    studyFocus: "Pharmacology & Dosage Calculation",
    content: "Having high-alert medications highlighted with specific client monitoring parameters made a massive difference. PrepFord taught me how to think like a practicing nurse.",
    date: "July 2026",
  },
  {
    id: "test-6",
    name: "Casey P., ADN",
    role: "RN Candidate",
    pathway: "RN",
    studyFocus: "Prioritization & Delegation",
    content: "The breakdown of multi-client prioritization questions was the clearest I've encountered. No confusing tricks—just solid clinical judgment principles.",
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
            <span>Candidate Reflections</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground">
            What Nursing Candidates Say About PrepFord
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Authentic feedback from nursing candidates who used PrepFord’s structured clinical rationales and NGN case studies to prepare for licensure.
          </p>

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
              All Testimonials ({testimonials.length})
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
                      "{t.content}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {t.name}
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
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
              <strong>Candidate Notice:</strong> Individual study experiences reflect personal candidate preparation journeys. Examination outcomes vary according to candidate preparation depth and testing performance.
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
