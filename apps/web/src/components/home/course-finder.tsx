"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ShoppingCart, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

const questions: QuizQuestion[] = [
  {
    id: "pathway",
    question: "Which licensure examination are you targeting?",
    options: [
      { id: "rn", label: "NCLEX-RN (Registered Nurse)" },
      { id: "pn", label: "NCLEX-PN (Practical / Vocational Nurse)" },
    ],
  },
  {
    id: "timeline",
    question: "What is your target exam timeline?",
    options: [
      { id: "1", label: "Within 30 days (Intensive preparation)" },
      { id: "3", label: "1 to 3 months (Standard study routine)" },
      { id: "6", label: "3 to 6 months (Comprehensive review)" },
      { id: "12", label: "6+ months (Self-paced study)" },
    ],
  },
  {
    id: "support",
    question: "What style of study support helps you most?",
    options: [
      { id: "cat", label: "Adaptive CAT simulation exams & score prediction" },
      { id: "rationales", label: "In-depth clinical rationales for every question" },
      { id: "ngn", label: "Unfolding NGN case studies & clinical decision-making" },
    ],
  },
  {
    id: "focus",
    question: "Which subject area requires the greatest focus?",
    options: [
      { id: "pharma", label: "Pharmacology & Parenteral Therapies" },
      { id: "mgmt", label: "Management of Care & Safety" },
      { id: "physio", label: "Physiological Adaptation & Reduction of Risk" },
      { id: "psycho", label: "Psychosocial Integrity & Coping" },
    ],
  },
];

const recommendations: Record<
  string,
  { title: string; planName: string; price: number; description: string; href: string; cartHref: string }
> = {
  rn: {
    title: "NCLEX-RN Comprehensive Pro Pathway",
    planName: "NCLEX-RN Complete Preparation",
    price: 59,
    description:
      "Recommended based on your registered nurse examination target. Includes full RN question bank access, 3 readiness assessments, and complete clinical reasoning rationales.",
    href: "/nclex-rn",
    cartHref: "/cart?add=rn-pro",
  },
  pn: {
    title: "NCLEX-PN Complete Preparation Pathway",
    planName: "NCLEX-PN Complete Preparation",
    price: 59,
    description:
      "Recommended based on your practical/vocational nurse target. Includes full PN question bank access, coordinated care analytics, and topic-level readiness assessments.",
    href: "/nclex-pn",
    cartHref: "/cart?add=pn-pro",
  },
};

export function CourseFinderQuiz() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [completed, setCompleted] = React.useState(false);

  const isLastStep = currentStep === questions.length - 1;
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleSelectOption = (optionId: string) => {
    const q = questions[currentStep];
    setAnswers((prev) => ({ ...prev, [q.id]: optionId }));
  };

  const handleNext = () => {
    const q = questions[currentStep];
    if (!answers[q.id]) return;
    if (isLastStep) {
      setCompleted(true);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setCompleted(false);
  };

  if (completed) {
    const pathway = answers.pathway || "rn";
    const rec = recommendations[pathway] || recommendations.rn;

    return (
      <section id="course-finder" className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-2xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Recommendation Summary
            </p>
            <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Your Tailored Study Plan
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Based on your target pathway and preparation timeline, here is the suggested preparation option.
            </p>

            <Card className="mt-8 ring-2 ring-secondary/50 bg-card shadow-md text-left">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge className="bg-secondary text-secondary-foreground font-semibold text-xs">
                    Recommended Plan
                  </Badge>
                  <span className="text-xl font-serif font-bold text-foreground">
                    ${rec.price} <span className="text-xs font-sans text-muted-foreground font-normal">/ month</span>
                  </span>
                </div>
                <CardTitle className="text-xl font-serif text-foreground">{rec.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {rec.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1.5 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>Includes full access to question bank and readiness assessments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>Includes 7-domain Nursing Study Guide &amp; option-by-option rationales</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <Button asChild size="lg" className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                    <Link href={rec.cartHref} className="flex items-center justify-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Add to Cart — ${rec.price}/mo</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link href={rec.href} className="flex items-center justify-center gap-1.5">
                      <span>Explore Pathway</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex items-center justify-between">
                <Link href="/subscriptions" className="text-xs text-secondary hover:underline font-medium">
                  Compare all available plans →
                </Link>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retake quiz</span>
                </button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  const q = questions[currentStep];

  return (
    <section id="course-finder" className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-2xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">
            Course recommendation
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
            Find the right preparation for you
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Answer 4 quick questions about your licensure goals, and we will recommend the optimal study plan and question bank.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-md">
            <div className="w-full rounded-full h-2 mb-3 bg-muted overflow-hidden">
              <div
                className="h-2 bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center font-medium">
              Question {currentStep + 1} of {questions.length}
            </p>
          </div>
        </div>

        <Card className="mt-6 max-w-md mx-auto bg-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-serif text-foreground">
              {q.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {q.options.map((o) => {
              const isSelected = answers[q.id] === o.id;
              return (
                <Button
                  key={o.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full justify-between text-left h-auto py-3 px-3.5 transition-all ${
                    isSelected ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"
                  }`}
                  onClick={() => handleSelectOption(o.id)}
                >
                  <span className="text-xs sm:text-sm">{o.label}</span>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-foreground" />
                  )}
                </Button>
              );
            })}
          </CardContent>
          <CardFooter className="pt-4 flex justify-between">
            {currentStep > 0 ? (
              <Button variant="outline" size="sm" onClick={goBack} className="text-xs">
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              size="sm"
              disabled={!answers[q.id]}
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
            >
              {isLastStep ? "View Recommendation" : "Next Question →"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
