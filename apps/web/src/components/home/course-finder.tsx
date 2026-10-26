"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

const questions: QuizQuestion[] = [
  {
    id: "pathway",
    question: "Which exam are you preparing for?",
    options: [
      { id: "rn", label: "NCLEX-RN (Registered Nurse)" },
      { id: "pn", label: "NCLEX-PN (Practical / Vocational Nurse)" },
    ],
  },
  {
    id: "timeline",
    question: "What is your target exam timeline?",
    options: [
      { id: "1", label: "Within 1 month" },
      { id: "3", label: "1–3 months" },
      { id: "6", label: "3–6 months" },
      { id: "12", label: "6+ months" },
    ],
  },
  {
    id: "support",
    question: "What learning support do you prefer?",
    options: [
      { id: "self", label: "Self-paced study resources" },
      { id: "instructor", label: "Instructor-led support" },
      { id: "mix", label: "A combination of both" },
    ],
  },
  {
    id: "focus",
    question: "Which areas do you most want to improve?",
    options: [
      { id: "pharma", label: "Pharmacology" },
      { id: "mgmt", label: "Management & leadership" },
      { id: "safety", label: "Safe & effective care" },
      { id: "psycho", label: "Psychosocial integrity" },
    ],
  },
];

const recommendations: Record<string, { title: string; description: string; href: string }> = {
  rn: {
    title: "NCLEX-RN preparation",
    description: "The RN pathway matches registered nurse licensure preparation.",
    href: "/nclex-rn",
  },
  pn: {
    title: "NCLEX-PN preparation",
    description: "The PN pathway matches practical/vocational nurse licensure preparation.",
    href: "/nclex-pn",
  },
} as const;

export function CourseFinderQuiz() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [completed, setCompleted] = React.useState(false);

  const isLastStep = currentStep === questions.length - 1;
  const progress = ((currentStep) / questions.length) * 100;

  const handleAnswer = (optionId: string) => {
    const q = questions[currentStep];
    setAnswers((prev) => ({ ...prev, [q.id]: optionId }));
    if (isLastStep) {
      setCompleted(true);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  if (completed) {
    const pathway = answers.pathway;
    const rec = recommendations[pathway as keyof typeof recommendations];
    return (
      <section id="course-finder" className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-2xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-green">
              Your recommendation
            </p>
            <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
              Based on your answers
            </h2>
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>{rec?.title ?? "NCLEX preparation"}</CardTitle>
                <CardDescription>
                  {rec?.description ?? ""} This is a recommendation based on your
                  preferences, not a guarantee of exam outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild className="w-full">
                  <Link href={rec?.href ?? "/courses"}>
                    Explore {rec?.title ?? "courses"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => setCompleted(false)} className="mt-4">
              Start over
            </Button>
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
          <p className="text-xs font-medium uppercase tracking-wider text-green">
            Course finder
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
            Find the right preparation for you
          </h2>
          <p className="mt-6 text-muted max-w-lg mx-auto lg:text-lg">
            Answer a few quick questions and we’ll suggest a starting point.
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-md">
            <div className="w-full bg-line rounded-full h-2 mb-6">
              <div className="h-2 bg-green rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted text-center">
              Step {currentStep + 1} of {questions.length}
            </p>
          </div>
        </div>

        <Card className="mt-8 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">{q.question}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {q.options.map((o) => (
              <Button
                key={o.id}
                variant={answers[q.id] === o.id ? "default" : "outline"}
                className="w-full justify-between text-left"
                onClick={() => handleAnswer(o.id)}
              >
                {o.label}
                {answers[q.id] === o.id ? (
                  <span className="text-sm font-medium">Selected</span>
                ) : null}
              </Button>
            ))}
          </CardContent>
          <CardFooter className="pt-4 flex justify-between">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={goBack}>
                Back
              </Button>
            )}
            <Button
              size="sm"
              disabled={!answers[q.id]}
              onClick={() => handleAnswer("")}
            >
              {isLastStep ? "Get recommendation" : "Next"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
