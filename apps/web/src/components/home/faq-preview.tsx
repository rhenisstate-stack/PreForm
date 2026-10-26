"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is the difference between NCLEX-RN and NCLEX-PN?",
    answer:
      "NCLEX-RN is for registered nurse licensure, while NCLEX-PN is for practical/vocational nurse licensure. Each has its own content focus, question blueprint, and readiness expectations.",
  },
  {
    question: "How do I choose a subscription?",
    answer:
      "Select the pathway matching your exam (RN or PN), then compare available plans by access duration, included features, and price.",
  },
  {
    question: "How does the free trial work?",
    answer:
      "Try Now gives you access to sample questions and a limited learning experience. Full question banks and assessments require a subscription.",
  },
  {
    question: "Can I change my pathway later?",
    answer:
      "Yes. Your progress is associated with your account, and you can switch between RN and PN content as needed.",
  },
  {
    question: "Do readiness assessments predict my NCLEX result?",
    answer:
      "No. Readiness indicators are practice-based signals and do not guarantee an official exam outcome.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can manage or cancel your subscription from your account settings. Cancellation takes effect at the end of your billing period.",
  },
];

export function FAQPreview() {
  return (
    <section id="faq-preview" className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between items-end md:flex-col md:items-start gap-6 lg:max-w-3xl lg:mx-auto">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-green">
              Frequently asked questions
            </p>
            <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
              Questions learners ask
            </h2>
          </div>
          <Link
            href="/faq"
            className="inline-flex items-center gap-1 text-sm font-medium text-green transition-colors"
          >
            View all FAQs <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-12 space-y-4 lg:max-w-2xl lg:mx-auto">
          {faqs.map((f) => (
            <Card key={f.question}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle>{f.question}</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted" />
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <p className="text-sm text-muted leading-relaxed">{f.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
