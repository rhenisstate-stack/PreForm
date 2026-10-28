"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Compass,
  FileQuestion,
  GraduationCap,
  HeartPulse,
  History,
  Layers,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  UserCheck,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const RECENT_ACTIVITY_STORAGE_KEY = "prepford_recent_study_activity";

export interface RecentStudyActivity {
  title: string;
  categoryTitle: string;
  href: string;
  pathway: "rn" | "pn";
  visitedAt: string;
}

function readStoredRecentActivity(): RecentStudyActivity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecentStudyActivity>;
    if (
      typeof parsed.title === "string" &&
      typeof parsed.href === "string" &&
      parsed.href.startsWith("/")
    ) {
      return {
        title: parsed.title,
        categoryTitle: parsed.categoryTitle || "Nursing Study Guide",
        href: parsed.href,
        pathway: parsed.pathway === "pn" ? "pn" : "rn",
        visitedAt: parsed.visitedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function DashboardClient() {
  const auth = useAuth();
  const cart = useCart();
  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [selectedPathway, setSelectedPathway] = React.useState<"rn" | "pn" | null>(null);
  const [recentActivity, setRecentActivity] = React.useState<RecentStudyActivity | null>(null);

  React.useEffect(() => {
    setRecentActivity(readStoredRecentActivity());
  }, []);

  const activePathway: "rn" | "pn" = selectedPathway ?? (user?.pathway === "pn" ? "pn" : "rn");
  const pathwayLabel = activePathway === "pn" ? "NCLEX-PN" : "NCLEX-RN";
  const pathwayRoute = activePathway === "pn" ? "/nclex-pn" : "/nclex-rn";

  const recordActivity = React.useCallback(
    (entry: Omit<RecentStudyActivity, "visitedAt">) => {
      const next: RecentStudyActivity = {
        ...entry,
        visitedAt: new Date().toISOString(),
      };
      setRecentActivity(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(RECENT_ACTIVITY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    []
  );

  const clearRecentActivity = React.useCallback(() => {
    setRecentActivity(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(RECENT_ACTIVITY_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  if (isLoading) {
    return <BrandedLoading message="Loading learner study workspace..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div
        data-testid="dashboard-unauthenticated"
        className="w-full py-24 px-4 text-center bg-background"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary mb-6">
          <Stethoscope className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-3">
          Sign In Required
        </h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-md mx-auto leading-relaxed">
          Please sign in to access your PrepFord learner dashboard, study guides, practice scenarios, and account settings.
        </p>
        <Link
          href="/sign-in?from=/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <span>Sign In to Workspace</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const learnerName = user.displayName || user.name || "Candidate";
  const totalStudySubjects = STUDY_GUIDE_CATEGORIES.reduce(
    (sum, cat) => sum + cat.subjects.length,
    0
  );
  const firstCategory = STUDY_GUIDE_CATEGORIES[0];
  const firstSubject = firstCategory?.subjects[0];

  return (
    <div
      data-testid="learner-dashboard"
      className="w-full bg-background text-foreground min-h-[calc(100vh-4.5rem)] pb-20"
    >
      {/* =====================================================================
          1. WELCOME HEADER & PATHWAY FOCUS
         ===================================================================== */}
      <section
        data-testid="dashboard-welcome-header"
        aria-labelledby="dashboard-welcome-heading"
        className="w-full bg-gradient-to-b from-slate-100/90 via-teal-50/35 to-background dark:from-slate-950 dark:via-slate-900/75 dark:to-background pt-8 pb-10 px-4 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-7xl flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Authenticated Learner Workspace</span>
              </span>
              <Badge variant="outline" className="font-mono text-xs uppercase">
                {pathwayLabel} Focus
              </Badge>
              {user.activePlan && (
                <Badge className="bg-primary/10 text-primary dark:bg-teal-400/15 dark:text-teal-300 font-medium text-xs">
                  {user.activePlan}
                </Badge>
              )}
            </div>

            <h1
              id="dashboard-welcome-heading"
              className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-foreground"
            >
              Welcome back, {learnerName}.
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Pick up where you left off in your {pathwayLabel} preparation, review high-yield clinical study guides, or work through scenario-based practice questions.
            </p>

            {/* Primary CTA: Continue studying when real resumable activity exists, else Explore study materials */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {recentActivity ? (
                <Button
                  asChild
                  size="lg"
                  data-testid="dashboard-primary-cta-continue"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-sm"
                >
                  <Link href={recentActivity.href}>
                    <span>Continue studying: {recentActivity.title}</span>
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  data-testid="dashboard-primary-cta-explore"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-sm"
                >
                  <Link
                    href="/study-guide"
                    onClick={() =>
                      recordActivity({
                        title: "7-Domain Nursing Study Guide",
                        categoryTitle: "Clinical Study Notes",
                        href: "/study-guide",
                        pathway: activePathway,
                      })
                    }
                  >
                    <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>Explore study materials</span>
                  </Link>
                </Button>
              )}

              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl font-semibold bg-card/80"
              >
                <Link
                  href={`${pathwayRoute}#${activePathway}-sample-question`}
                  onClick={() =>
                    recordActivity({
                      title: `${pathwayLabel} Clinical Scenario Practice`,
                      categoryTitle: `${pathwayLabel} Pathway`,
                      href: `${pathwayRoute}#${activePathway}-sample-question`,
                      pathway: activePathway,
                    })
                  }
                >
                  <span>Practice {pathwayLabel} Question</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Pathway Switcher */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Exam Pathway
            </span>
            <div
              role="group"
              aria-label="Select active exam pathway"
              className="inline-flex rounded-xl bg-card p-1 shadow-xs ring-1 ring-border"
            >
              <button
                type="button"
                data-testid="dashboard-pathway-rn"
                aria-pressed={activePathway === "rn"}
                onClick={() => setSelectedPathway("rn")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                  activePathway === "rn"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NCLEX-RN Pathway
              </button>
              <button
                type="button"
                data-testid="dashboard-pathway-pn"
                aria-pressed={activePathway === "pn"}
                onClick={() => setSelectedPathway("pn")}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                  activePathway === "pn"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NCLEX-PN Pathway
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12 space-y-14 mt-4">
        {/* =====================================================================
            2. PRIMARY STUDY ACTIONS (WHAT CAN I STUDY NOW?)
           ===================================================================== */}
        <section
          data-testid="dashboard-primary-actions"
          aria-labelledby="dashboard-study-actions-heading"
          className="space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Study Launchpad
              </p>
              <h2
                id="dashboard-study-actions-heading"
                className="text-xl sm:text-2xl font-serif font-bold text-foreground"
              >
                What You Can Study Right Now
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct access to PrepFord&apos;s implemented learning modules and pathway hubs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Action 1: NCLEX-RN Preparation */}
            <div className="flex flex-col justify-between rounded-2xl bg-card p-6 shadow-xs ring-1 ring-border/70">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <HeartPulse className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    RN Track
                  </Badge>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  NCLEX-RN Preparation
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Registered nurse clinical judgment scenarios, acute care prioritization, option-by-option rationales, and RN study plans.
                </p>
              </div>
              <div className="pt-5">
                <Link
                  href="/nclex-rn"
                  onClick={() =>
                    recordActivity({
                      title: "NCLEX-RN Exam Preparation Hub",
                      categoryTitle: "NCLEX-RN Pathway",
                      href: "/nclex-rn",
                      pathway: "rn",
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                >
                  <span>Open NCLEX-RN Hub</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Action 2: NCLEX-PN Preparation */}
            <div className="flex flex-col justify-between rounded-2xl bg-card p-6 shadow-xs ring-1 ring-border/70">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-teal-400/15 dark:text-teal-300">
                    <Stethoscope className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    PN / LVN Track
                  </Badge>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  NCLEX-PN Preparation
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Practical and vocational nursing scope of practice, coordinated care, pharmacology review, and PN study plans.
                </p>
              </div>
              <div className="pt-5">
                <Link
                  href="/nclex-pn"
                  onClick={() =>
                    recordActivity({
                      title: "NCLEX-PN Exam Preparation Hub",
                      categoryTitle: "NCLEX-PN Pathway",
                      href: "/nclex-pn",
                      pathway: "pn",
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                >
                  <span>Open NCLEX-PN Hub</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Action 3: 7-Domain Study Guide */}
            <div className="flex flex-col justify-between rounded-2xl bg-card p-6 shadow-xs ring-1 ring-border/70">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {STUDY_GUIDE_CATEGORIES.length} Domains • {totalStudySubjects} Guides
                  </Badge>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Nursing Study Guides
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Structured pathophysiology summaries, high-alert pharmacology tables, fetal heart rate memory aids, and bedside safety rules.
                </p>
              </div>
              <div className="pt-5">
                <Link
                  href="/study-guide"
                  onClick={() =>
                    recordActivity({
                      title: "7-Domain Nursing Study Guide",
                      categoryTitle: "Clinical Study Notes",
                      href: "/study-guide",
                      pathway: activePathway,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                >
                  <span>Browse Study Guides</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Action 4: Practice Scenarios & Plan Finder */}
            <div className="flex flex-col justify-between rounded-2xl bg-card p-6 shadow-xs ring-1 ring-border/70">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <FileQuestion className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Interactive
                  </Badge>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Practice &amp; Course Finder
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Test your clinical prioritization on interactive sample questions with distractor rationales and compare study plans.
                </p>
              </div>
              <div className="pt-5">
                <Link
                  href="/courses"
                  onClick={() =>
                    recordActivity({
                      title: "Interactive Practice & Course Finder",
                      categoryTitle: "Practice & Plans",
                      href: "/courses",
                      pathway: activePathway,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                >
                  <span>Open Practice &amp; Courses</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            3. RECOMMENDED NEXT STEP & PROGRESS / RECENT ACTIVITY (TRANSPARENT)
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Recommended Next Step (7 cols) */}
          <section
            data-testid="dashboard-recommended-next-step"
            aria-labelledby="dashboard-next-step-heading"
            className="lg:col-span-7 rounded-2xl bg-card p-6 sm:p-8 shadow-xs ring-1 ring-border/70 space-y-5"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Recommended Next Step
              </p>
              <h2
                id="dashboard-next-step-heading"
                className="text-xl font-serif font-bold text-foreground"
              >
                {cart.itemCount > 0
                  ? "Complete Your Selected Study Plan or Continue Free Review"
                  : recentActivity
                    ? `Continue Your ${pathwayLabel} Study Sequence`
                    : `Start Your ${pathwayLabel} Preparation in 3 Focused Steps`}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {cart.itemCount > 0
                  ? `You currently have ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"} saved in your cart ($${cart.subtotal} USD). You can review your cart whenever you are ready or study free clinical notes right away.`
                  : "Follow a structured sequence combining concept review with clinical judgment question practice."}
              </p>
            </div>

            <ol className="space-y-3.5">
              <li className="flex items-start justify-between gap-4 rounded-xl bg-muted/45 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                    1
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Review {firstSubject?.title ?? "Cardiovascular & Acute Care"} Notes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Read high-yield physiological cues, priority nursing actions, and pharmacology tables in the Study Guide.
                    </p>
                  </div>
                </div>
                <Link
                  href={
                    firstCategory && firstSubject
                      ? `/study-guide/${firstCategory.slug}/${firstSubject.slug}`
                      : "/study-guide"
                  }
                  onClick={() =>
                    recordActivity({
                      title: firstSubject?.title ?? "Cardiovascular Disorders",
                      categoryTitle: firstCategory?.title ?? "Medical-Surgical Nursing",
                      href:
                        firstCategory && firstSubject
                          ? `/study-guide/${firstCategory.slug}/${firstSubject.slug}`
                          : "/study-guide",
                      pathway: activePathway,
                    })
                  }
                  className="shrink-0 text-xs font-semibold text-secondary hover:underline"
                >
                  Read Notes →
                </Link>
              </li>

              <li className="flex items-start justify-between gap-4 rounded-xl bg-muted/45 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Work Through an Interactive {pathwayLabel} Clinical Scenario
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Apply the NCSBN Clinical Judgment Measurement Model and inspect option-by-option rationales.
                    </p>
                  </div>
                </div>
                <Link
                  href={`${pathwayRoute}#${activePathway}-sample-question`}
                  onClick={() =>
                    recordActivity({
                      title: `${pathwayLabel} Clinical Scenario Practice`,
                      categoryTitle: `${pathwayLabel} Pathway`,
                      href: `${pathwayRoute}#${activePathway}-sample-question`,
                      pathway: activePathway,
                    })
                  }
                  className="shrink-0 text-xs font-semibold text-secondary hover:underline"
                >
                  Try Scenario →
                </Link>
              </li>

              <li className="flex items-start justify-between gap-4 rounded-xl bg-muted/45 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20 text-foreground text-xs font-bold">
                    3
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {cart.itemCount > 0
                        ? "Review Your Saved Cart Selection"
                        : `Compare ${pathwayLabel} Study Plans & Readiness Packs`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cart.itemCount > 0
                        ? "Review your selected study duration or assessment pack in the cart."
                        : "Choose between 30-day monthly access, 90-day quarterly access, or a standalone Readiness Assessment Pack."}
                    </p>
                  </div>
                </div>
                <Link
                  href={cart.itemCount > 0 ? "/cart" : `${pathwayRoute}#${activePathway}-study-plans`}
                  className="shrink-0 text-xs font-semibold text-secondary hover:underline"
                >
                  {cart.itemCount > 0 ? "Open Cart →" : "View Plans →"}
                </Link>
              </li>
            </ol>
          </section>

          {/* Progress, Recent Activity & Real Account Status (5 cols) */}
          <section
            data-testid="dashboard-progress-section"
            aria-labelledby="dashboard-progress-heading"
            className="lg:col-span-5 rounded-2xl bg-card p-6 sm:p-8 shadow-xs ring-1 ring-border/70 space-y-5"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Activity &amp; Access Status
              </p>
              <h2
                id="dashboard-progress-heading"
                className="text-xl font-serif font-bold text-foreground"
              >
                Your Study Progress &amp; Account
              </h2>
            </div>

            {/* Real Account & Plan Details */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-muted/45 p-3.5 space-y-1">
                <dt className="text-muted-foreground font-medium">Current Access / Plan</dt>
                <dd className="font-semibold text-foreground">
                  {user.activePlan || "Free Study Guide & Sample Practice"}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/45 p-3.5 space-y-1">
                <dt className="text-muted-foreground font-medium">Selected Pathway</dt>
                <dd className="font-semibold text-foreground">{pathwayLabel} Licensure Track</dd>
              </div>
              <div className="rounded-xl bg-muted/45 p-3.5 space-y-1">
                <dt className="text-muted-foreground font-medium">Target Exam Date</dt>
                <dd className="font-semibold text-foreground">
                  {user.targetExamDate || "Not set — configure in Profile"}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/45 p-3.5 space-y-1">
                <dt className="text-muted-foreground font-medium">Cart Status</dt>
                <dd className="font-semibold text-foreground">
                  {cart.itemCount > 0
                    ? `${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"} ($${cart.subtotal} USD)`
                    : "Empty"}
                </dd>
              </div>
            </dl>

            {/* Recent Study Activity (Browser-Recorded) */}
            <div className="rounded-xl bg-muted/35 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <History className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                  <span>Most Recent Study Activity</span>
                </span>
                {recentActivity && (
                  <button
                    type="button"
                    onClick={clearRecentActivity}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {recentActivity ? (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{recentActivity.title}</p>
                    <p className="text-xs text-muted-foreground">{recentActivity.categoryTitle}</p>
                  </div>
                  <Link
                    href={recentActivity.href}
                    className="shrink-0 rounded-lg bg-secondary/15 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/25 transition-colors"
                  >
                    Resume →
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No recent study session recorded in this browser yet. Open any Study Guide domain or practice question to enable one-click resume.
                </p>
              )}
            </div>

            {/* Transparent Telemetry Status Disclosure */}
            <div
              data-testid="dashboard-telemetry-disclosure"
              className="rounded-xl bg-teal-500/8 dark:bg-teal-400/10 p-4 text-xs text-muted-foreground leading-relaxed"
            >
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5 text-secondary shrink-0" aria-hidden="true" />
                <span>Live Question Telemetry Status</span>
              </p>
              <p>
                Server-synced question bank attempt history, personal accuracy percentages, and scored readiness reports are in active backend development. PrepFord does not display fabricated personal scores or exam pass predictions.
              </p>
            </div>
          </section>
        </div>

        {/* =====================================================================
            4. STUDY GUIDE DOMAINS (REAL 7-DOMAIN CURRICULUM LAUNCHPAD)
           ===================================================================== */}
        <section
          data-testid="dashboard-study-domains"
          aria-labelledby="dashboard-domains-heading"
          className="space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Clinical Study Library
              </p>
              <h2
                id="dashboard-domains-heading"
                className="text-xl sm:text-2xl font-serif font-bold text-foreground"
              >
                Study Guide Domains ({STUDY_GUIDE_CATEGORIES.length} Core Categories)
              </h2>
            </div>
            <Link
              href="/study-guide"
              className="text-xs font-semibold text-secondary hover:underline inline-flex items-center gap-1"
            >
              <span>View Full Study Guide Directory</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STUDY_GUIDE_CATEGORIES.map((category) => (
              <div
                key={category.slug}
                data-testid={`dashboard-domain-${category.slug}`}
                className="flex flex-col justify-between rounded-2xl bg-card p-5 shadow-2xs ring-1 ring-border/60"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-secondary">
                      {category.subjects.length}{" "}
                      {category.subjects.length === 1 ? "Subject Guide" : "Subject Guides"}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {category.examWeight}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    {category.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {category.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                  <Link
                    href={`/study-guide/${category.slug}`}
                    onClick={() =>
                      recordActivity({
                        title: category.title,
                        categoryTitle: "Nursing Study Guide",
                        href: `/study-guide/${category.slug}`,
                        pathway: activePathway,
                      })
                    }
                    className="font-semibold text-secondary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Study Domain</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  {category.subjects[0] && (
                    <Link
                      href={`/study-guide/${category.slug}/${category.subjects[0].slug}`}
                      onClick={() =>
                        recordActivity({
                          title: category.subjects[0].title,
                          categoryTitle: category.title,
                          href: `/study-guide/${category.slug}/${category.subjects[0].slug}`,
                          pathway: activePathway,
                        })
                      }
                      className="text-muted-foreground hover:text-foreground truncate max-w-[160px]"
                    >
                      {category.subjects[0].title}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            5. QUICK NAVIGATION BAR
           ===================================================================== */}
        <nav
          data-testid="dashboard-quick-nav"
          aria-label="Learner workspace quick navigation"
          className="rounded-2xl bg-muted/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="space-y-0.5">
            <h2 className="text-sm font-serif font-bold text-foreground">
              Quick Workspace Links
            </h2>
            <p className="text-xs text-muted-foreground">
              Jump directly to your account settings, study plans, cart, or learner FAQ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs ring-1 ring-border/70 hover:bg-muted transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              <span>Account &amp; Profile</span>
            </Link>
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs ring-1 ring-border/70 hover:bg-muted transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              <span>All Study Plans</span>
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs ring-1 ring-border/70 hover:bg-muted transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              <span>Cart ({cart.itemCount})</span>
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs ring-1 ring-border/70 hover:bg-muted transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              <span>Learner FAQ</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs ring-1 ring-border/70 hover:bg-muted transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              <span>Contact Support</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
