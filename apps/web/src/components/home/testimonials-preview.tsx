"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
];

export function TestimonialsPreview() {
  return (
    <section id="testimonials-preview" className="pt-20 pb-24 px-4 bg-green-dark lg:pt-32 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-2xl mx-auto">
          <Quote className="mx-auto h-8 w-8 text-green/40" aria-hidden="true" />
          <p className="mt-6 text-xl font-serif text-white/90 leading-relaxed sm:text-2xl">
            Preform helped me focus on the reasoning behind each answer, not just memorisation.
          </p>
          <p className="mt-4 text-sm text-green/60">— Jordan M., RN candidate</p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-green/30 bg-white/5">
              <CardContent className="pb-4">
                <Quote className="mb-4 h-5 w-5 text-green/40" aria-hidden="true" />
                <p className="text-sm text-white/80 leading-relaxed">{t.content}</p>
              </CardContent>
              <CardFooter className="pt-0 border-t border-green/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{t.name}</span>
                  <span className="text-xs text-green/60">&middot; {t.role}</span>
                </div>
                <BadgeInline pathway={t.pathway} />
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/testimonials"
            className="inline-flex items-center gap-1 text-sm font-medium text-white underline underline-offset-4 hover:text-green/80"
          >
            Read all testimonials <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function BadgeInline({ pathway }: { pathway: "RN" | "PN" }) {
  return (
    <span className="inline-flex items-center rounded-md border border-green/30 bg-green/10 px-2 py-0.5 text-xs font-semibold text-green">
      {pathway}
    </span>
  );
}
