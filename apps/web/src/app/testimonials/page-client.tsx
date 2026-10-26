"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";

interface TestimonialProps {
  name: string;
  role: string;
  pathway: "RN" | "PN";
  content: string;
}

const testimonials: TestimonialProps[] = [
  {
    name: "Alex R.",
    role: "RN candidate",
    pathway: "RN",
    content: "The rationales helped me understand not just the right answer, but why the distractors were wrong.",
  },
  {
    name: "Sam K.",
    role: "PN candidate",
    pathway: "PN",
    content: "Clear explanations and a question bank that actually reflected the exam format.",
  },
  {
    name: "Jordan M.",
    role: "RN candidate",
    pathway: "RN",
    content: "Preform helped me focus on clinical reasoning, not just memorisation.",
  },
];

export function TestimonialsPageClient() {
  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-3xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-green">
              Student experiences
            </p>
            <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
              What learners say
            </h2>
            <p className="mt-6 text-muted max-w-xl mx-auto lg:text-lg">
              Individual experiences shared by nursing candidates. Results vary
              and do not guarantee identical outcomes.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name}>
                <CardContent className="pb-4">
                  <Quote className="mb-4 h-5 w-5 text-green/40" aria-hidden="true" />
                  <p className="text-sm text-muted leading-relaxed">{t.content}</p>
                  <div className="mt-4 flex items-start gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{t.name}</p>
                      <p className="text-xs text-muted">{t.role}</p>
                    </div>
                    <BadgeInline pathway={t.pathway} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-green transition-colors"
            >
              Explore courses <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function BadgeInline({ pathway }: { pathway: "RN" | "PN" }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-white px-2 py-0.5 text-xs font-semibold text-ink">
      {pathway}
    </span>
  );
}
