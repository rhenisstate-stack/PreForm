"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Compass,
  FileCheck2,
  FileQuestion,
  FileText,
  HeartPulse,
  History,
  Layers,
  ListChecks,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CompletedAssessmentAttempt,
  getTierDescription,
  getTierShortCode,
  getTierStyles,
} from "@/lib/assessment-store";
import type {
  AvailableAssessmentDto,
  BackendExamAttemptDto,
  ClientNeedMastery,
  LearnerAnalyticsSummary,
  ReadinessTrend,
  StudyRecommendation,
  TopicMastery,
} from "@/lib/api-services";
import type { StudyOverview } from "@/lib/study-service";
import type { RecentStudyActivity } from "@/app/dashboard/page-client";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";

export interface NCLEXPNDashboardViewProps {
  learnerName: string;
  userEmail?: string;
  userRole?: string;
  userPathway?: string;
  activePlan?: string;
  targetExamDate?: string;
  recentActivity: RecentStudyActivity | null;
  onOpenCreateTest: (type?: "tutored_cat" | "rat", domainCode?: string | null) => void;
  onResumeAttempt: (attemptId: string, testType?: "tutored_cat" | "rat", status?: string) => void;
  onReviewAttempt: (attempt: CompletedAssessmentAttempt) => void;
  onViewReport: (attempt: CompletedAssessmentAttempt) => void;
  onSwitchPathway?: (pathway: "rn" | "pn") => void;
  canSwitchPathway?: boolean;
  authoritativeAttempts: BackendExamAttemptDto[];
  storedAttempts: CompletedAssessmentAttempt[];
  analyticsSummary: LearnerAnalyticsSummary | null;
  readinessTrend: ReadinessTrend | null;
  clientNeeds: ClientNeedMastery[];
  curriculumTopics: TopicMastery[];
  recommendations: StudyRecommendation[];
  studyOverview: StudyOverview | null;
  studyOverviewState: "loading" | "ready" | "unavailable";
  availableAssessments: AvailableAssessmentDto[];
  activeTab: "tutored_cat" | "rat" | "all";
  setActiveTab: (tab: "tutored_cat" | "rat" | "all") => void;
  showSamplePreview: boolean;
  setShowSamplePreview: React.Dispatch<React.SetStateAction<boolean>>;
  chartTimeRange: "all" | "30d" | "7d";
  setChartTimeRange: (range: "all" | "30d" | "7d") => void;
  hoveredAttemptIndex: number | null;
  setHoveredAttemptIndex: (idx: number | null) => void;
}

const PN_PROCEDURAL_STEPS = [
  { step: "1", title: "Focused Data Collection", desc: "Collect vital signs, physical findings & baseline trends" },
  { step: "2", title: "Critical Cue Escalation", desc: "Report sudden deviations promptly to supervising RN/MD" },
  { step: "3", title: "Safe Interventions", desc: "Execute oral/IM meds, sterile dressings & urinary care" },
  { step: "4", title: "Bedside Monitoring", desc: "Observe client response, ensure comfort & record data" },
];

export function NCLEXPNDashboardView({
  learnerName,
  userPathway,
  activePlan,
  targetExamDate,
  recentActivity,
  onOpenCreateTest,
  onResumeAttempt,
  onReviewAttempt,
  onViewReport,
  onSwitchPathway,
  canSwitchPathway = true,
  authoritativeAttempts,
  storedAttempts,
  analyticsSummary,
  readinessTrend,
  clientNeeds,
  curriculumTopics,
  recommendations,
  studyOverview,
  studyOverviewState,
  availableAssessments,
  activeTab,
  setActiveTab,
  showSamplePreview,
  setShowSamplePreview,
  chartTimeRange,
  setChartTimeRange,
  hoveredAttemptIndex,
  setHoveredAttemptIndex,
}: NCLEXPNDashboardViewProps) {
  // Filter attempts to PN attempts or general attempts
  const pnStoredAttempts = React.useMemo(() => {
    return storedAttempts.filter((a) => !a.name.toLowerCase().includes("rn") || a.name.toLowerCase().includes("pn"));
  }, [storedAttempts]);

  const pnAuthoritativeAttempts = React.useMemo(() => {
    return authoritativeAttempts.filter(
      (a) => !a.examinationCode?.toLowerCase().includes("rn") || a.examinationCode?.toLowerCase().includes("pn")
    );
  }, [authoritativeAttempts]);

  const totalAttemptsCount =
    typeof analyticsSummary?.totalCompletedAttempts === "number" && analyticsSummary.totalCompletedAttempts > 0
      ? analyticsSummary.totalCompletedAttempts
      : pnAuthoritativeAttempts.length > 0
        ? pnAuthoritativeAttempts.length
        : pnStoredAttempts.length;

  const meanScore =
    typeof analyticsSummary?.meanScorePercent === "number"
      ? Math.round(analyticsSummary.meanScorePercent)
      : pnAuthoritativeAttempts.length > 0
        ? Math.round(
            pnAuthoritativeAttempts.reduce((acc, a) => acc + (a.scorePercentage || 0), 0) /
              pnAuthoritativeAttempts.length
          )
        : pnStoredAttempts.length > 0
          ? Math.round(pnStoredAttempts.reduce((acc, a) => acc + a.scorePercent, 0) / pnStoredAttempts.length)
          : null;

  return (
    <div data-testid="nclex-pn-dashboard-view" className="space-y-8">
      {/* =====================================================================
          SECTION 1: PN HERO & BEDSIDE CARE COMMAND CENTER
         ===================================================================== */}
      <section
        data-testid="pn-dashboard-hero"
        aria-labelledby="pn-dashboard-hero-heading"
        className="relative overflow-hidden rounded-3xl border border-teal-500/35 bg-gradient-to-br from-card via-card to-teal-500/10 p-6 sm:p-8 lg:p-10 shadow-sm"
      >
        {/* Subtle ambient lighting with Emerald / Teal nursing accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-teal-500/15 blur-3xl dark:bg-teal-400/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/20"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Heading, Identity, Storytelling, CTAs */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300 ring-1 ring-teal-500/30">
                <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Practical Nursing Pathway</span>
              </span>
              <Badge
                data-testid="pn-dashboard-badge"
                variant="outline"
                className="font-mono text-xs uppercase border-teal-500/40 text-teal-800 dark:text-teal-300 font-semibold"
              >
                NCLEX-PN Candidate Workspace
              </Badge>
              {activePlan && (
                <Badge className="bg-primary/10 text-primary dark:bg-teal-400/20 dark:text-teal-300 font-medium text-xs">
                  {activePlan}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Licensed Practical Nurse Environment
              </span>
              <h1
                id="pn-dashboard-hero-heading"
                data-testid="pn-dashboard-identity-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground leading-[1.12]"
              >
                NCLEX-PN LEARNER DASHBOARD
              </h1>
              <p className="text-base sm:text-lg text-foreground/85 leading-relaxed font-sans">
                Welcome back, <span className="font-semibold text-foreground">{learnerName}</span>. Build practical
                nursing confidence through focused bedside data collection, procedural skills mastery, safe medication
                administration, and coordinated care for NCLEX-PN licensure.
              </p>
            </div>

            {/* Bedside Vital Signs Safety Telemetry Pill */}
            <div className="inline-flex flex-wrap items-center gap-3 rounded-xl bg-card/90 dark:bg-slate-900/90 border border-border/80 px-4 py-2 text-xs font-mono text-foreground/90 shadow-2xs">
              <span className="flex items-center gap-1.5 text-secondary font-semibold">
                <Activity className="h-4 w-4 animate-pulse text-secondary" />
                BEDSIDE VITALS: RR 16 / MIN
              </span>
              <span className="text-muted-foreground">•</span>
              <span>BP 118/74 mmHg</span>
              <span className="text-muted-foreground">•</span>
              <span>Temp 36.8°C</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-teal-700 dark:text-teal-300 font-medium">Focused Data Collection Active</span>
            </div>

            {/* Quick-Launch Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                data-testid="pn-hero-create-test-btn"
                onClick={() => onOpenCreateTest("tutored_cat")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-12 rounded-xl shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create PN Practice Test</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                data-testid="pn-hero-rat-btn"
                onClick={() => onOpenCreateTest("rat")}
                className="border-secondary/40 text-secondary hover:bg-secondary/10 font-semibold px-6 h-12 rounded-xl"
              >
                <Sparkles className="mr-2 h-4 w-4 text-secondary" />
                <span>Take PN Readiness (RAT)</span>
              </Button>

              {recentActivity ? (
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="font-medium h-12 rounded-xl text-foreground hover:text-secondary"
                >
                  <Link href={recentActivity.href}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Resume: {recentActivity.title}</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="font-medium h-12 rounded-xl text-foreground hover:text-secondary"
                >
                  <Link href="/study-guide">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Explore PN Study Guide</span>
                  </Link>
                </Button>
              )}

              {canSwitchPathway && onSwitchPathway && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwitchPathway("rn")}
                  data-testid="pn-deliberate-switch-to-rn"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Switch to NCLEX-RN Dashboard →
                </Button>
              )}
            </div>
          </div>

          {/* Right Column: Integrated PN Practical Nursing Illustration & Procedural Badge */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-teal-500/20 via-primary/10 to-transparent blur-xl"
              />
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl">
                <Image
                  src="/images/illustrations/prepford-pn-pathway-card.png"
                  alt="Practical nurse reviewing bedside clinical procedures, collecting patient data, and executing safe nursing interventions"
                  width={600}
                  height={450}
                  priority
                  className="w-full h-64 sm:h-72 object-cover object-center"
                />
                <div className="p-4 bg-card/95 backdrop-blur-xs border-t border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-secondary">
                    <span className="flex items-center gap-1.5">
                      <ClipboardCheck className="h-4 w-4 text-secondary" />
                      LPN / LVN Scope of Practice
                    </span>
                    <span className="font-mono text-[11px] bg-secondary/15 px-2 py-0.5 rounded text-secondary">
                      NCLEX-PN Practical Core
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Evaluates focused data collection, bedside procedures, routine medication safety, and client comfort
                    under registered nurse coordination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: PRACTICAL NURSING PROCEDURAL WORKFLOW
         ===================================================================== */}
      <section
        data-testid="pn-procedural-workflow"
        aria-labelledby="pn-procedural-heading"
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/60">
          <div>
            <h2 id="pn-procedural-heading" className="text-lg font-serif font-bold text-foreground">
              Practical Nursing Procedural Workflow
            </h2>
            <p className="text-xs text-muted-foreground">
              Core bedside competencies tested on the NCLEX-PN examination.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto text-secondary">
            PN Bedside Protocol
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PN_PROCEDURAL_STEPS.map((step) => (
            <div
              key={step.step}
              className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-1.5 hover:border-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-secondary">Step {step.step}</span>
                <CheckCircle2 className="h-4 w-4 text-secondary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: AUTHORITATIVE PN CORE PERFORMANCE TELEMETRY
         ===================================================================== */}
      <section
        data-testid="pn-analytics-kpi-grid"
        aria-labelledby="pn-analytics-heading"
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="pn-analytics-heading" className="text-lg font-serif font-bold text-foreground">
            NCLEX-PN Performance Telemetry
          </h2>
          <span className="text-xs text-muted-foreground font-mono">PostgreSQL Server Authoritative</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Completed Assessments */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Completed PN Tests</span>
              <FileCheck2 className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground">{totalAttemptsCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalAttemptsCount > 0 ? "Server-validated practice attempts" : "No PN tests completed yet"}
            </p>
          </div>

          {/* Metric 2: Average Score % */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Average Accuracy</span>
              <Target className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground">
              {meanScore !== null ? `${meanScore}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {meanScore !== null ? "Calculated across completed sets" : "Awaiting first completed test"}
            </p>
          </div>

          {/* Metric 3: Procedural Study Hours */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Practical Study Hours</span>
              <Clock className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground">
              {typeof analyticsSummary?.studyHoursLogged === "number"
                ? analyticsSummary.studyHoursLogged.toFixed(1)
                : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">Active practice &amp; study time logged</p>
          </div>

          {/* Metric 4: Bedside Mastery Rank */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Bedside Mastery Rank</span>
              <BarChart2 className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground">
              {analyticsSummary?.clientNeedsMasteryRank || "Proficient"}
            </div>
            <p className="text-xs text-muted-foreground">NCSBN PN category percentile benchmark</p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: PRACTICAL NURSING BEDSIDE SAFETY PEARLS
         ===================================================================== */}
      <section
        data-testid="pn-bedside-pearls"
        className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-secondary shrink-0" />
          <h2 className="text-base font-serif font-bold text-foreground">
            NCLEX-PN Bedside Safety &amp; Procedural Guidelines
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-foreground/90">
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <span className="font-bold text-secondary uppercase font-mono tracking-wider">6 Rights of Medication</span>
            <p className="text-muted-foreground leading-relaxed">
              Right Client, Right Drug, Right Dose, Right Route, Right Time, Right Documentation. Always compare the MAR
              against the medication label three separate times before administration.
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <span className="font-bold text-secondary uppercase font-mono tracking-wider">Immediate Escalation</span>
            <p className="text-muted-foreground leading-relaxed">
              Report acute alterations in respiratory rate (&lt; 10 or &gt; 28), sudden drop in SpO₂ (&lt; 90%), chest pain,
              or acute confusion immediately to the supervising RN before documenting or leaving the bedside.
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <span className="font-bold text-secondary uppercase font-mono tracking-wider">Aseptic Wound &amp; Catheter Care</span>
            <p className="text-muted-foreground leading-relaxed">
              Strict surgical asepsis is mandatory for indwelling urinary catheterization and sterile dressing changes.
              Maintain gravity drainage bags below the level of the bladder at all times.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: NCSBN PN CLIENT NEEDS CATEGORY BREAKDOWN
         ===================================================================== */}
      <section
        data-testid="pn-client-needs-breakdown"
        aria-labelledby="pn-client-needs-heading"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="pn-client-needs-heading" className="text-xl font-serif font-bold text-foreground">
              NCLEX-PN Client Needs Category Breakdown
            </h2>
            <p className="text-xs text-muted-foreground">
              Your server-recorded accuracy across the 8 official NCSBN practical nursing categories.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenCreateTest("tutored_cat")}
            className="text-xs font-semibold self-start sm:self-auto"
          >
            Launch Targeted CAT Session
          </Button>
        </div>

        {clientNeeds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientNeeds.map((cat) => (
              <div
                key={cat.code}
                className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2 hover:border-secondary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate max-w-[80%]">{cat.name}</span>
                  <span className="text-xs font-mono font-semibold text-secondary">
                    {Math.round(cat.accuracyPercentage)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, cat.accuracyPercentage))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{cat.questionsAttempted} items attempted</span>
                  <button
                    type="button"
                    onClick={() => onOpenCreateTest("tutored_cat", cat.code)}
                    className="text-secondary hover:underline font-medium"
                  >
                    Drill Category →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">No PN category performance recorded yet.</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Complete your first NCLEX-PN test or practical Readiness Assessment to populate your official Client Needs
              mastery distribution.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenCreateTest("tutored_cat")}
              className="mt-2 bg-secondary text-white font-semibold text-xs"
            >
              Start First PN Practice Set
            </Button>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 6: PN ASSESSMENT HISTORY & REVIEW MODAL LAUNCHER
         ===================================================================== */}
      <section
        data-testid="pn-assessment-history"
        aria-labelledby="pn-assessment-history-heading"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="pn-assessment-history-heading" className="text-xl font-serif font-bold text-foreground">
              NCLEX-PN Assessment History
            </h2>
            <p className="text-xs text-muted-foreground">
              Review completed PN Computer Adaptive Tests, procedural rationales, and diagnostic reports.
            </p>
          </div>

          <div className="flex items-center rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("tutored_cat")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "tutored_cat" ? "bg-card font-semibold text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
            >
              Tutored CAT
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rat")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "rat" ? "bg-card font-semibold text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
            >
              Readiness (RAT)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "all" ? "bg-card font-semibold text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
            >
              All Tests
            </button>
          </div>
        </div>

        {pnStoredAttempts.length > 0 ? (
          <div className="divide-y divide-border/60">
            {pnStoredAttempts
              .filter((a) => (activeTab === "all" ? true : a.type === activeTab))
              .map((attempt) => {
                const tierStyles = getTierStyles(attempt.performanceTier);
                return (
                  <div key={attempt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{attempt.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono uppercase ${tierStyles.border} ${tierStyles.text}`}
                        >
                          {attempt.performanceTier} ({getTierShortCode(attempt.performanceTier)})
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {attempt.date} • {attempt.totalQuestions} questions • Score:{" "}
                        <span className="font-semibold text-foreground">{attempt.scorePercent}%</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onReviewAttempt(attempt)}
                        className="text-xs font-semibold h-8"
                      >
                        Review Test
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReport(attempt)}
                        className="text-xs font-semibold h-8 text-secondary"
                      >
                        View Report
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-3">
            <FileQuestion className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No PN test attempts yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create a tutored practical nursing test or launch a comprehensive Readiness Assessment to start tracking
              your performance.
            </p>
            <Button
              type="button"
              onClick={() => onOpenCreateTest("tutored_cat")}
              className="bg-primary text-primary-foreground font-semibold text-xs px-5 h-9"
            >
              Start Practice Test
            </Button>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 7: AI STUDY STUDIO & CURATED PRACTICAL NURSING STUDY GUIDES
         ===================================================================== */}
      <section
        data-testid="pn-study-resources"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* AI Study Studio Integration */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              <h2 className="text-base font-serif font-bold text-foreground">AI Study Studio (PN)</h2>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono text-secondary">
              Spaced Repetition
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Consolidate routine pharmacology dosages, normal vital sign ranges, and aseptic techniques with SM-2 spaced
            repetition review cards.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Link
              href="/dashboard/study/flashcards"
              className="rounded-xl border border-border/80 bg-muted/40 p-2.5 hover:border-secondary/40 transition-colors"
            >
              <span className="block text-xs font-bold text-foreground">Decks</span>
              <span className="text-[10px] text-muted-foreground">Manage Cards</span>
            </Link>
            <Link
              href="/dashboard/study/review"
              className="rounded-xl border border-border/80 bg-muted/40 p-2.5 hover:border-secondary/40 transition-colors"
            >
              <span className="block text-xs font-bold text-foreground">Review</span>
              <span className="text-[10px] text-secondary font-medium">Due Now</span>
            </Link>
            <Link
              href="/dashboard/study/quizzes"
              className="rounded-xl border border-border/80 bg-muted/40 p-2.5 hover:border-secondary/40 transition-colors"
            >
              <span className="block text-xs font-bold text-foreground">Drills</span>
              <span className="text-[10px] text-muted-foreground">Quick Quizzes</span>
            </Link>
          </div>
        </div>

        {/* 7-Domain Study Guide Curated Links */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-secondary" />
              <h2 className="text-base font-serif font-bold text-foreground">Practical Nursing Study Domains</h2>
            </div>
            <Link href="/study-guide" className="text-xs font-semibold text-secondary hover:underline">
              Browse All ({STUDY_GUIDE_CATEGORIES.length}) →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Quick-reference bedside care notes, clinical procedures, and safe intervention checklists.
          </p>
          <div className="space-y-2">
            {STUDY_GUIDE_CATEGORIES.slice(0, 3).map((cat) => (
              <Link
                key={cat.id}
                href={`/study-guide/${cat.slug}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 hover:bg-muted/40 transition-colors text-xs"
              >
                <span className="font-medium text-foreground">{cat.title}</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  {cat.subjects.length} subjects <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
