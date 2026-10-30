"use client";

import Link from "next/link";
import { ArrowRight, Quote, MessageSquarePlus } from "lucide-react";
import { TestimonialCard, type TestimonialData } from "@/components/testimonials/testimonial-card";

const PREVIEW_TESTIMONIALS: TestimonialData[] = [
  {
    id: "prev-1",
    displayName: "Alex R.",
    role: "NCLEX-RN Candidate",
    pathway: "RN",
    studyFocus: "Physiological Adaptation",
    quote: "The clinical rationales helped me understand not just the right answer, but why the distractors were unsafe.",
  },
  {
    id: "prev-2",
    displayName: "Sam K.",
    role: "NCLEX-PN Candidate",
    pathway: "PN",
    studyFocus: "Cardiovascular & Pharmacology",
    quote: "Clear explanations and a question bank that actually reflected the exam format and clinical decision-making.",
  },
];

export function TestimonialsPreview() {
  return (
    <section id="testimonials-preview" className="pt-20 pb-24 px-4 bg-muted/40 lg:pt-32 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto">
          <Quote className="mx-auto h-8 w-8 text-secondary/60" aria-hidden="true" />
          <p className="mt-6 text-xl font-serif text-foreground leading-relaxed sm:text-2xl">
            &ldquo;PrepFord helped me focus on the reasoning behind each answer, not just memorisation.&rdquo;
          </p>
          <p className="mt-4 text-sm text-muted-foreground">— Jordan M., RN candidate</p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {PREVIEW_TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/testimonials"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline transition-colors"
          >
            <span>Explore all candidate reflections</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="hidden sm:inline text-muted-foreground text-xs">•</span>
          <Link
            href="/testimonials"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquarePlus className="h-3.5 w-3.5 text-secondary" />
            <span>Share your study journey</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
