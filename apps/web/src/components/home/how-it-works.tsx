"use client";

import Link from "next/link";
import { ArrowRight } from "lucide.react";

interface StepProps {
  number: number;
  title: string;
  description: string;
}

const steps: StepProps[] = [
  {
    number: 1,
    title: "Choose your pathway",
    description: "Select NCLEX-RN or NCLEX-PN to see the content and assessments built for your exam.",
  },
  {
    number: 2,
    title: "Explore a subscription or sample",
    description: "Compare plans, try sample questions, or start a free learning experience.",
  },
  {
    number: 3,
    title: "Build a study routine",
    description: "Work through question banks, review rationales, and track progress by topic.",
  },
  {
    number: 4,
    title: "Practise and review rationales",
    description: "Answer questions, read detailed explanations, and identify weak areas.",
  },
  {
    number: 5,
    title: "Monitor performance",
    description: "View accuracy trends, readiness indicators, and recommended revision topics.",
  },
  {
    number: 6,
    title: "Continue targeted revision",
    description: "Return to weak topics, retake assessments, and measure readiness over time.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-green">
            How Preform works
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
            A clear path to exam day
          </h2>
          <p className="mt-6 text-muted max-w-xl mx-auto lg:text-lg">
            Work through a structured learning journey that adapts to your
            progress and keeps you focused on what matters most.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.number} className="flex flex-col gap-4">
              <div className="flex shrink-0 items-center justify-center rounded-full border border-line bg-white p-1 text-ink font-serif font-bold text-xl">
                {s.number}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            href="/subscriptions"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Explore subscriptions <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
