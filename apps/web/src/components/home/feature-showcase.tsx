"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  label?: string;
}

const features: FeatureProps[] = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="16" height="14" rx="2" /><path d="M2 10h16" /><path d="M6 7h8" /><path d="M10 13h4" /></svg>,
    title: "NCLEX-style question bank",
    description:
      "Original single-best-answer, multiple-response, and NGN-style questions written by nursing educators.",
    href: "/courses",
    label: "Practise",
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 20v-6" /><path d="M14 4h6" /><path d="M10 20H4" /><path d="M16 16l-3-3m3 3l3-3" /></svg>,
    title: "Detailed answer rationales",
    description:
      "Understand why the correct answer is appropriate and why each distractor is less appropriate.",
    href: "/features",
    label: "Review",
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="14" height="14" rx="2" ry="2" /><path d="M8 10h8" /><path d="M10 8v8" /></svg>,
    title: "Readiness assessments",
    description:
      "Server-scored practice exams with topic-level feedback and clear interpretation of results.",
    href: "/features",
    label: "Assess",
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 20a10 10 0 110-20 10 10 0 010 20Z" /><path d="M10 12h4" /><path d="M12 10v4" /></svg>,
    title: "Progress tracking",
    description:
      "Accuracy by topic, question type, and time, with explainable recommendations based on your data.",
    href: "#analytics",
    label: "Track",
  },
];

export function FeatureShowcase() {
  return (
    <section id="features" className="pt-20 pb-24 px-4 bg-white lg:pt-32 lg:pb-32 lg:px-8 border-y border-line">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-green">
            Our features
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
            Everything you need to prepare
          </h2>
          <p className="mt-6 text-muted max-w-xl mx-auto lg:text-lg">
            Structured practice, honest scoring, and clear explanations built
            for NCLEX-RN and NCLEX-PN candidates.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="flex flex-col h-full">
              <CardHeader className="pb-3">
                <div className="flex shrink-0 items-center rounded-md bg-green/10 p-3 text-green" aria-hidden="true">
                  {f.icon}
                </div>
                <CardTitle className="mt-4">{f.title}</CardTitle>
                <CardDescription className="mt-2 text-sm">{f.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-4">
                <Link
                  href={f.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-green transition-colors"
                >
                  {f.label} <ArrowRight className="h-3 w-3" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuestionBankIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="16" height="14" rx="2" />
      <path d="M2 10h16" />
      <path d="M6 7h8" />
      <path d="M10 13h4" />
    </svg>
  );
}

function RationaleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 20v-6" />
      <path d="M14 4h6" />
      <path d="M10 20H4" />
      <path d="M16 16l-3-3m3 3l3-3" />
    </svg>
  );
}

function AssessmentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="2" ry="2" />
      <path d="M8 10h8" />
      <path d="M10 8v8" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 20a10 10 0 110-20 10 10 0 010 20Z" />
      <path d="M10 12h4" />
      <path d="M12 10v4" />
    </svg>
  );
}
