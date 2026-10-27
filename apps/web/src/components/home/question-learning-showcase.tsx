"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, ArrowRight, BrainCircuit, Activity, BarChart3, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepSlide {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  bulletPoints: string[];
  imageSrc: string;
  imageAlt: string;
  badge: string;
}

const LEARNING_STEPS: StepSlide[] = [
  {
    id: "step-1",
    stepNumber: "Step 01",
    title: "Clinical Scenario & Unfolding EHR Data",
    description:
      "Every Next Generation NCLEX question immerses you in a real clinical scenario. Review progressive nurses' notes, vital sign flowsheets, and diagnostic laboratory values formatted exactly like clinical electronic health records.",
    bulletPoints: [
      "Authentic multi-tabbed electronic health record interface",
      "Dynamic vital sign trend charts and laboratory reference ranges",
      "Realistic unfolding client cues across multiple clinical shifts",
    ],
    imageSrc: "/image6.jpg",
    imageAlt: "Candidate reviewing Next Generation NCLEX electronic health record scenario",
    badge: "1. Recognize Cues",
  },
  {
    id: "step-2",
    stepNumber: "Step 02",
    title: "Active Clinical Decision Making",
    description:
      "Move beyond simple memorization. Test your cognitive operations through Extended Multiple Response, Dropdown Cloze, Drag-and-Drop Matrix, and Highlight items that mirror the NCSBN test plan.",
    bulletPoints: [
      "All approved NCSBN Next Gen item formats supported",
      "Prioritization of acute vs chronic clinical manifestations",
      "Realistic testing interface with strike-through and highlight tools",
    ],
    imageSrc: "/image5.jpg",
    imageAlt: "NCLEX exam simulation screen displaying clinical response options",
    badge: "2. Generate Solutions",
  },
  {
    id: "step-3",
    stepNumber: "Step 03",
    title: "In-Depth Pathophysiologic Rationales",
    description:
      "Understand why the correct answer saves the client and why alternate choices are unsafe. Every item provides full rationale breakdowns, clinical pearls, and high-yield pharmacological warnings.",
    bulletPoints: [
      "Detailed explanations for correct choices and all distractors",
      "Integrated pathophysiology diagrams and clinical mechanisms",
      "Key clinical takeaways highlighting common exam pitfalls",
    ],
    imageSrc: "/image7.jpg",
    imageAlt: "Nurse candidate studying detailed clinical rationale and pharmacology guide",
    badge: "3. Evaluate Outcomes",
  },
  {
    id: "step-4",
    stepNumber: "Step 04",
    title: "Actionable Readiness Analytics",
    description:
      "Receive objective performance metrics mapped directly to the NCSBN Client Need categories. Monitor your clinical judgment readiness signals to guide targeted remediation before test day.",
    bulletPoints: [
      "Breakdowns by Safe and Effective Care, Physiological Integrity, and more",
      "Time per question pacing analytics and historical accuracy trends",
      "Objective readiness indicators based on practice exam performance",
    ],
    imageSrc: "/image8.jpg",
    imageAlt: "Candidate performance dashboard displaying readiness signals and topic proficiency",
    badge: "4. Readiness Insights",
  },
];

export function QuestionLearningShowcase() {
  const [activeStep, setActiveStep] = React.useState(0);

  const handlePrev = () => {
    setActiveStep((prev) => (prev === 0 ? LEARNING_STEPS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % LEARNING_STEPS.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  };

  const currentStep = LEARNING_STEPS[activeStep];

  return (
    <section className="py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-card/50 border-t border-border">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
            The PrepFord Learning Method
          </p>
          <h2 className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl">
            Practice NCLEX-Style Questions. Understand the Why.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            PrepFord is designed to build clinical reasoning through step-by-step rationales, authentic EHR data tabs, and comprehensive pathophysiologic explanations.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto" role="tablist">
          {LEARNING_STEPS.map((step, idx) => (
            <button
              key={step.id}
              role="tab"
              aria-selected={activeStep === idx}
              onClick={() => setActiveStep(idx)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeStep === idx
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {step.badge}
            </button>
          ))}
        </div>

        {/* Showcase Interactive Carousel Box */}
        <div
          className="mt-8 rounded-2xl border border-border bg-card shadow-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-secondary/50"
          tabIndex={0}
          role="region"
          aria-label="Question Learning Carousel"
          onKeyDown={handleKeyDown}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[480px]">
            {/* Left Content Column */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-secondary uppercase tracking-widest">
                    {currentStep.stepNumber}
                  </span>
                  <span className="text-xs font-semibold bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full">
                    {currentStep.badge}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-foreground leading-snug">
                  {currentStep.title}
                </h3>

                <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {currentStep.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {currentStep.bulletPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Navigation Controls */}
              <div className="pt-6 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Step carousel indicators">
                  {LEARNING_STEPS.map((step, idx) => (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(idx)}
                      role="tab"
                      aria-selected={activeStep === idx}
                      aria-label={`Go to ${step.badge}`}
                      className={`h-2 rounded-full transition-all ${
                        activeStep === idx ? "w-8 bg-secondary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous step"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next step"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Visual Column */}
            <div className="lg:col-span-6 relative h-72 sm:h-96 lg:h-full min-h-[320px] bg-muted overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentStep.imageSrc}
                alt={currentStep.imageAlt}
                className="w-full h-full object-cover transition-opacity duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent lg:hidden pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
          >
            <Link href="/courses">
              Explore All PrepFord Question Modules
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
