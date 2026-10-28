"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  FileQuestion,
  RotateCcw,
  Stethoscope,
  BarChart3,
  Calendar,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { PersonalizedWelcome } from "@/components/layout/personalized-welcome";

interface LearningSubject {
  id: string;
  title: string;
  domain: string;
  questionsTotal: number;
  questionsCompleted: number;
  accuracyPercent: number;
}

const sampleSubjects: Record<"rn" | "pn", LearningSubject[]> = {
  rn: [
    {
      id: "rn-1",
      title: "Management of Care & Leadership",
      domain: "Safe and Effective Care Environment",
      questionsTotal: 420,
      questionsCompleted: 294,
      accuracyPercent: 78,
    },
    {
      id: "rn-2",
      title: "Pharmacological & Parenteral Therapies",
      domain: "Physiological Integrity",
      questionsTotal: 580,
      questionsCompleted: 348,
      accuracyPercent: 71,
    },
    {
      id: "rn-3",
      title: "Reduction of Risk Potential",
      domain: "Physiological Integrity",
      questionsTotal: 360,
      questionsCompleted: 216,
      accuracyPercent: 76,
    },
    {
      id: "rn-4",
      title: "Physiological Adaptation & Acute Care",
      domain: "Physiological Integrity",
      questionsTotal: 480,
      questionsCompleted: 240,
      accuracyPercent: 69,
    },
  ],
  pn: [
    {
      id: "pn-1",
      title: "Coordinated Care & Team Nursing",
      domain: "Safe and Effective Care Environment",
      questionsTotal: 380,
      questionsCompleted: 228,
      accuracyPercent: 75,
    },
    {
      id: "pn-2",
      title: "Pharmacological Therapies in Practical Care",
      domain: "Physiological Integrity",
      questionsTotal: 490,
      questionsCompleted: 294,
      accuracyPercent: 73,
    },
    {
      id: "pn-3",
      title: "Basic Care and Comfort",
      domain: "Physiological Integrity",
      questionsTotal: 310,
      questionsCompleted: 217,
      accuracyPercent: 81,
    },
    {
      id: "pn-4",
      title: "Safety and Infection Control",
      domain: "Safe and Effective Care Environment",
      questionsTotal: 340,
      questionsCompleted: 238,
      accuracyPercent: 79,
    },
  ],
};

export function DashboardClient() {
  const auth = useAuth();
  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [selectedPathway, setSelectedPathway] = React.useState<"rn" | "pn" | null>(null);
  const activePathway: "rn" | "pn" = selectedPathway ?? (user?.pathway === "pn" ? "pn" : "rn");

  if (isLoading) {
    return <BrandedLoading message="Loading candidate study workspace..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="w-full py-24 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary mb-6">
          <Stethoscope className="h-8 w-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-3">
          Sign In Required
        </h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-md mx-auto">
          Please sign in to access your PrepFord learning dashboard, question bank, and clinical readiness assessments.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Sign In to Workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const subjects = sampleSubjects[activePathway];
  const totalCompleted = subjects.reduce((acc, s) => acc + s.questionsCompleted, 0);
  const totalQuestions = subjects.reduce((acc, s) => acc + s.questionsTotal, 0);
  const overallAccuracy = Math.round(
    subjects.reduce((acc, s) => acc + s.accuracyPercent * s.questionsCompleted, 0) / (totalCompleted || 1)
  );

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-8 space-y-12 bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Personalized Welcome Banner (Seamless, non-boxed) */}
      <PersonalizedWelcome user={user} />

      {/* Pathway Selector & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            Learning Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your Next-Gen clinical judgment readiness and launch targeted assessment sessions.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60">
          <button
            type="button"
            onClick={() => setSelectedPathway("rn")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activePathway === "rn"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            NCLEX-RN Pathway
          </button>
          <button
            type="button"
            onClick={() => setSelectedPathway("pn")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activePathway === "pn"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            NCLEX-PN Pathway
          </button>
        </div>
      </div>

      {/* Candidate Readiness Metrics (Open Canvas, No Boxed Borders) */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl bg-card/65 p-6 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Questions Answered</span>
            <FileQuestion className="h-4 w-4 text-secondary" />
          </div>
          <p className="text-3xl font-serif font-bold text-foreground">
            {totalCompleted.toLocaleString()}{" "}
            <span className="text-sm font-sans text-muted-foreground font-normal">
              / {totalQuestions.toLocaleString()}
            </span>
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{ width: `${Math.round((totalCompleted / totalQuestions) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Accuracy</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <p className="text-3xl font-serif font-bold text-foreground">
            {overallAccuracy}%
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
            <span>+4.2% above peer average</span>
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Readiness Assessment</span>
            <Award className="h-4 w-4 text-secondary" />
          </div>
          <p className="text-3xl font-serif font-bold text-foreground">
            High Pass Signal
          </p>
          <p className="text-xs text-secondary font-medium">
            Based on 4 simulated CAT modules
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Study Streak</span>
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-serif font-bold text-foreground">
            6 Days
          </p>
          <p className="text-xs text-muted-foreground">
            Consistency benchmark on track
          </p>
        </div>
      </div>

      {/* Action Workspace (Open Interactive Grid) */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Study &amp; Assessment Modes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Launch adaptive testing, focused practice quizzes, or review remediated rationale items
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col justify-between py-1 space-y-4">
            <div className="space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-semibold text-foreground text-xl">
                Custom Practice Quiz
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose question counts, specific nursing client need categories, and toggle Tutor Mode for immediate clinical rationales.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/courses?type=practice"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline transition-colors"
              >
                <span>Configure Practice Session</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between py-1 space-y-4">
            <div className="space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-semibold text-foreground text-xl">
                Computer Adaptive Test (CAT)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Simulate official NCLEX testing conditions with an adaptive question algorithm scaling from 75 to 150 items.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/nclex-rn"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition-colors"
              >
                <span>Launch CAT Simulator</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between py-1 space-y-4">
            <div className="space-y-2.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-semibold text-foreground text-xl">
                Targeted Rationale Review
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Revisit previously missed questions with detailed distractor breakdowns, physiologic principles, and clinical takeaways.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline transition-colors"
              >
                <span>Review 48 Missed Concepts</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Notes & Study Guide Banner (Open Full-Width Integration) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-5 px-6 rounded-2xl bg-teal-500/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-secondary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              PrepFord Clinical Study Guide &amp; Notes
            </span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground">
            Review high-yield clinical notes across 7 nursing domains
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pathophysiology summaries, prioritized nursing interventions, VEAL CHOP fetal monitoring, and delegation rules.
          </p>
        </div>
        <Link
          href="/study-guide"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-secondary/90 transition-colors shadow-xs"
        >
          <span>Open Study Guide</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Curriculum Breakdown by Domain (Continuous Open Canvas) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h2 className="text-xl font-serif font-bold text-foreground">
              Clinical Domain Mastery
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Performance organized by official NCSBN Client Needs categories
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {subjects.length} Core Domains Active
          </span>
        </div>

        <div className="space-y-3">
          {subjects.map((sub) => {
            const pct = Math.round((sub.questionsCompleted / sub.questionsTotal) * 100);
            return (
              <div key={sub.id} className="rounded-xl bg-card/65 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-semibold text-foreground">{sub.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-sm bg-muted text-muted-foreground font-mono">
                      {sub.domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{sub.questionsCompleted} of {sub.questionsTotal} completed ({pct}%)</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold">{sub.accuracyPercent}% accuracy</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-32 sm:w-48 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <Link
                    href={`/courses?domain=${encodeURIComponent(sub.title)}`}
                    className="shrink-0 text-xs font-semibold text-secondary hover:underline transition-colors"
                  >
                    Study Domain →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
