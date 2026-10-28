import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ShoppingCart } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FreeDemoSection } from "@/components/home/free-demo-section";
import { HowItWorks } from "@/components/home/how-it-works";

export const metadata: Metadata = {
  title: {
    absolute: "NCLEX-RN Exam Preparation | PrepFord",
  },
  description:
    "Explore PrepFord's NCLEX-RN study resources, practice questions, and nursing learning tools.",
  alternates: {
    canonical: "/nclex-rn",
  },
  openGraph: {
    title: "NCLEX-RN Exam Preparation | PrepFord",
    description:
      "Explore PrepFord's NCLEX-RN study resources, practice questions, and nursing learning tools.",
    url: "/nclex-rn",
    type: "website",
  },
};

const rnFeatures = [
  {
    title: "NCLEX-RN Question Bank",
    description:
      "3,500+ original single-best-answer, multiple-response, bowtie, matrix, and unfolding case study questions written for RN licensure preparation.",
  },
  {
    title: "Detailed Clinical Rationales",
    description:
      "Understand why each nursing intervention is safe and why distractors are less appropriate, complete with pathophysiologic mechanisms.",
  },
  {
    title: "Adaptive CAT Readiness Assessments",
    description:
      "Server-scored adaptive simulations and readiness exams with Client Needs and Clinical Judgment Measurement Model feedback.",
  },
  {
    title: "Topic-Level Progress Tracking",
    description:
      "Monitor accuracy by nursing domain, item format, and pacing with actionable study recommendations.",
  },
];

export default function RNPage() {
  return (
    <>
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:pt-24 lg:pb-24 lg:px-8 bg-gradient-to-b from-slate-100/90 via-teal-50/35 to-background dark:from-slate-950 dark:via-slate-900/80 dark:to-background">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 text-left">
              <p className="inline-flex items-center gap-2 rounded-full bg-teal-500/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                NCLEX-RN Pathway • Registered Nurse Licensure
              </p>
              <h1 className="mt-4 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-5xl leading-tight">
                Registered Nurse (NCLEX-RN) Preparation
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Everything you need to prepare for the National Council Licensure Examination for Registered Nurses — original NGN case studies, detailed clinical rationales, and honest progress measurement.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm font-medium text-foreground/90 max-w-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                  <span>3,500+ Next Gen RN Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                  <span>Unfolding 6-Part EHR Case Studies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                  <span>Adaptive CAT Mock Examinations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                  <span>7-Domain Clinical Study Guide</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm rounded-xl"
                >
                  <Link href="/subscriptions?programme=RN">
                    Explore RN Subscriptions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="font-semibold rounded-xl"
                >
                  <Link href="/cart?add=rn-pro">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Enroll in RN Pro — $59/mo
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="font-semibold rounded-xl"
                >
                  <Link href="/study-guide">
                    <BookOpen className="mr-2 h-4 w-4 text-secondary" />
                    RN Study Notes
                  </Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl overflow-hidden shadow-xl bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/image1.jpg"
                  alt="NCLEX-RN candidate reviewing clinical case studies"
                  className="w-full h-72 sm:h-80 lg:h-96 object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rnFeatures.map((f) => (
              <Card key={f.title} className="bg-card rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-serif font-bold">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed mt-1">
                    {f.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <FreeDemoSection />
      <HowItWorks />
    </>
  );
}
