import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "NCLEX-RN | Registered Nurse Preparation",
  description:
    "Prepare for the NCLEX-RN with original questions, detailed rationales, readiness assessments, and progress tracking built for registered nurse candidates.",
};

const rnFeatures = [
  {
    title: "NCLEX-RN Question Bank",
    description: "Original single-best-answer and multiple-response questions written for RN licensure preparation.",
  },
  {
    title: "Detailed Rationales",
    description: "Understand why each answer is correct and why distractors are less appropriate.",
  },
  {
    title: "Readiness Assessments",
    description: "Server-scored practice exams with topic-level feedback.",
  },
  {
    title: "Progress Tracking",
    description: "Accuracy by topic, question type, and time with explainable recommendations.",
  },
];

export default function RNPage() {
  return (
    <>
      <section className="pt-20 pb-16 px-4 lg:pt-24 lg:pb-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-green">
              NCLEX-RN Pathway
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
              Registered Nurse Preparation
            </h1>
            <p className="mt-6 text-muted max-w-xl mx-auto lg:text-lg">
              Everything you need to prepare for the National Council Licensure
              Examination for Registered Nurses — original questions, detailed
              rationales, and honest progress measurement.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="/subscriptions?programme=RN"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Explore RN Subscriptions <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
            {rnFeatures.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
