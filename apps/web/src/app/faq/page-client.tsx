"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: Record<string, FAQItem[]> = {
  general: [
    {
      question: "What is PrepFord NCLEX?",
      answer:
        "PrepFord NCLEX is a learning platform for candidates preparing for the NCLEX-RN and NCLEX-PN licensure examinations.",
    },
    {
      question: "Is PrepFord affiliated with NCSBN?",
      answer:
        "No. PrepFord is independent and not affiliated with, endorsed by, or sponsored by the National Council of State Boards of Nursing, Inc.",
    },
  ],
  "nclex-rn": [
    {
      question: "What is NCLEX-RN?",
      answer:
        "NCLEX-RN is the National Council Licensure Examination for Registered Nurses.",
    },
    {
      question: "Who is the RN pathway for?",
      answer:
        "Candidates preparing for registered nurse licensure.",
    },
  ],
  "nclex-pn": [
    {
      question: "What is NCLEX-PN?",
      answer:
        "NCLEX-PN is the National Council Licensure Examination for Practical Nurses.",
    },
    {
      question: "Who is the PN pathway for?",
      answer:
        "Candidates preparing for practical/vocational nurse licensure.",
    },
  ],
  subscriptions: [
    {
      question: "How do I choose a subscription?",
      answer:
        "Select the pathway matching your exam (RN or PN), then compare available plans by access duration, included features, and price.",
    },
    {
      question: "Can I cancel my subscription?",
      answer:
        "Yes. You can manage or cancel your subscription from your account settings.",
    },
  ],
};

export function FAQPageClient() {
  const [activeCategory, setActiveCategory] = React.useState("general");

  const categories = [
    { id: "general", label: "General" },
    { id: "nclex-rn", label: "NCLEX-RN" },
    { id: "nclex-pn", label: "NCLEX-PN" },
    { id: "subscriptions", label: "Subscriptions" },
  ];

  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-3xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Frequently asked questions
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Questions learners ask
            </h1>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  activeCategory === c.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background border border-border text-foreground hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-12 space-y-3 lg:max-w-2xl lg:mx-auto">
            {faqs[activeCategory].map((f) => (
              <Card key={f.question}>
                <CardHeader className="py-3 cursor-pointer">
                  <div className="flex w-full items-center justify-between">
                    <CardTitle className="text-base font-serif">{f.question}</CardTitle>
                    <span className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
