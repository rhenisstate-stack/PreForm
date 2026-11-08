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
  Clock,
  Compass,
  FileCheck2,
  FileQuestion,
  FileText,
  GraduationCap,
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
  LearnerPerformanceOverview,
  ReadinessTrend,
  StudyRecommendation,
  TopicMastery,
} from "@/lib/api-services";
import { CompactPerformanceCard } from "@/components/learner/performance/compact-performance-card";
import type { StudyOverview } from "@/lib/study-service";
import type { RecentStudyActivity } from "@/app/dashboard/page-client";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";
import {
  AnalyticsChartCard,
  TrendChart,
  HorizontalRankingChart,
} from "@/components/analytics";

export interface NCLEXRNDashboardViewProps {
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

const RN_NCJMM_STEPS = [
  { step: "1", title: "Recognize Cues", desc: "Identify relevant clinical & vital sign trends" },
  { step: "2", title: "Analyze Cues", desc: "Connect cues to acute pathophysiology" },
  { step: "3", title: "Prioritize Hypotheses", desc: "Rank urgent threats via ABCs & Maslow" },
  { step: "4", title: "Generate Solutions", desc: "Define safe evidence-based nursing goals" },
  { step: "5", title: "Take Action", desc: "Execute priority interventions & IV titration" },
  { step: "6", title: "Evaluate Outcomes", desc: "Assess therapeutic response & adjust care" },
];

const CANONICAL_RN_CLIENT_NEEDS = [
  { categoryCode: "MOC", categoryName: "Management of Care", subtext: "Prioritization, delegation, informed consent & legal ethics" },
  { categoryCode: "SIC", categoryName: "Safety and Infection Control", subtext: "Surgical asepsis, hazard prevention & emergency response" },
  { categoryCode: "HPM", categoryName: "Health Promotion and Maintenance", subtext: "Maternal-newborn, developmental stages & disease prevention" },
  { categoryCode: "PSI", categoryName: "Psychosocial Integrity", subtext: "Mental health concepts, therapeutic communication & crisis safety" },
  { categoryCode: "BCC", categoryName: "Basic Care and Comfort", subtext: "Mobility, nutrition, assistive devices & non-pharmacological comfort" },
  { categoryCode: "PHA", categoryName: "Pharmacological and Parenteral Therapies", subtext: "High-alert IV medication titration, central lines & toxicity monitoring" },
  { categoryCode: "RRP", categoryName: "Reduction of Risk Potential", subtext: "Diagnostic testing, vital sign alterations & laboratory evaluations" },
  { categoryCode: "PPT", categoryName: "Physiological Adaptation", subtext: "Hemodynamics, acute emergencies, medical-surgical shock & telemetry" },
];

export function NCLEXRNDashboardView({
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
}: NCLEXRNDashboardViewProps) {
  // Filter attempts to RN attempts or general attempts
  const rnStoredAttempts = React.useMemo(() => {
    return storedAttempts.filter((a) => {
      if (a.pathway) return a.pathway === "rn";
      return !a.name.toLowerCase().includes("pn") || a.name.toLowerCase().includes("rn");
    });
  }, [storedAttempts]);

  const rnAuthoritativeAttempts = React.useMemo(() => {
    return authoritativeAttempts.filter((a) => {
      if ((a as any).pathway) return (a as any).pathway === "rn";
      return !a.name?.toLowerCase().includes("pn") || a.name?.toLowerCase().includes("rn");
    });
  }, [authoritativeAttempts]);

  const [intelligenceOverview, setIntelligenceOverview] = React.useState<LearnerPerformanceOverview | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/learner/analytics/overview?pathway=rn")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && typeof data.totalAnsweredQuestions === "number") {
          setIntelligenceOverview(data);
        }
      })
      .catch(() => null);
    return () => {
      isMounted = false;
    };
  }, []);

  const totalAttemptsCount =
    typeof analyticsSummary?.totalCompletedAttempts === "number" && analyticsSummary.totalCompletedAttempts > 0
      ? analyticsSummary.totalCompletedAttempts
      : rnAuthoritativeAttempts.length > 0
        ? rnAuthoritativeAttempts.length
        : rnStoredAttempts.length;

  const meanScore =
    typeof analyticsSummary?.averageScorePercent === "number"
      ? Math.round(analyticsSummary.averageScorePercent)
      : rnAuthoritativeAttempts.length > 0
        ? Math.round(
            rnAuthoritativeAttempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) /
              rnAuthoritativeAttempts.length
          )
        : rnStoredAttempts.length > 0
          ? Math.round(rnStoredAttempts.reduce((acc, a) => acc + a.scorePercent, 0) / rnStoredAttempts.length)
          : null;

  // Longitudinal Score Trajectory points
  const trajectoryPoints = React.useMemo(() => {
    if (readinessTrend?.attempts && readinessTrend.attempts.length > 0) {
      return readinessTrend.attempts.map((a, idx) => ({
        date: a.completedAt ? a.completedAt.split("T")[0] : `Attempt ${idx + 1}`,
        score: Math.round(a.scorePercent),
        label: a.examTitle || `Test ${idx + 1}`,
      }));
    }
    if (rnAuthoritativeAttempts.length > 0) {
      return rnAuthoritativeAttempts.map((a, idx) => ({
        date: a.createdAt ? a.createdAt.split("T")[0] : `Attempt ${idx + 1}`,
        score: Math.round(a.scorePercent || 0),
        label: a.name || `Test ${idx + 1}`,
      }));
    }
    if (rnStoredAttempts.length > 0) {
      return rnStoredAttempts.map((a, idx) => ({
        date: a.timestamp ? a.timestamp.split("T")[0] : `Attempt ${idx + 1}`,
        score: Math.round(a.scorePercent),
        label: a.name || `Test ${idx + 1}`,
      }));
    }
    return [];
  }, [readinessTrend, rnAuthoritativeAttempts, rnStoredAttempts]);

  // Client Needs horizontal ranking items
  const rankingItems = React.useMemo(() => {
    if (clientNeeds.length > 0) {
      return clientNeeds.map((cat) => ({
        id: cat.categoryCode,
        label: cat.categoryName,
        value: Math.round(cat.accuracyPercent),
        sublabel: `${cat.totalAssessedQuestions} items`,
        benchmark: 75,
        status: (cat.totalAssessedQuestions === 0
          ? "unassessed"
          : cat.accuracyPercent >= 75
          ? "mastered"
          : cat.accuracyPercent >= 60
          ? "developing"
          : "needs_improvement") as "mastered" | "developing" | "needs_improvement" | "unassessed",
      }));
    }
    return CANONICAL_RN_CLIENT_NEEDS.map((cat) => ({
      id: cat.categoryCode,
      label: cat.categoryName,
      value: 0,
      sublabel: "Baseline",
      benchmark: 75,
      status: "unassessed" as const,
    }));
  }, [clientNeeds]);

  return (
    <div data-testid="nclex-rn-dashboard-view" className="space-y-8">
      {/* =====================================================================
          SECTION 1: RN HERO & CLINICAL JUDGMENT COMMAND CENTER
         ===================================================================== */}
      <section
        data-testid="rn-dashboard-hero"
        aria-labelledby="rn-dashboard-hero-heading"
        className="relative overflow-hidden rounded-3xl border border-secondary/30 bg-gradient-to-br from-card via-card to-secondary/10 p-6 sm:p-8 lg:p-10 shadow-sm"
      >
        {/* Subtle ambient lighting */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-secondary/15 blur-3xl dark:bg-secondary/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/25"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Heading, Identity, Storytelling, CTAs */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3.5 py-1 text-xs font-semibold text-secondary ring-1 ring-secondary/30">
                <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Registered Nursing Pathway</span>
              </span>
              <Badge
                data-testid="rn-dashboard-badge"
                variant="outline"
                className="font-mono text-xs uppercase border-secondary/40 text-secondary font-semibold"
              >
                NCLEX-RN Candidate Workspace
              </Badge>
              {activePlan && (
                <Badge className="bg-primary/10 text-primary dark:bg-secondary/20 dark:text-teal-300 font-medium text-xs">
                  {activePlan}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Registered Nurse Environment
              </span>
              <h1
                id="rn-dashboard-hero-heading"
                data-testid="rn-dashboard-identity-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground leading-[1.12]"
              >
                NCLEX-RN LEARNER DASHBOARD
              </h1>
              <p className="text-base sm:text-lg text-foreground/85 leading-relaxed font-sans">
                Welcome back, <span className="font-semibold text-foreground">{learnerName}</span>. Focus your clinical
                judgment on complex acute care scenarios, multi-system prioritization, and comprehensive Next Generation
                NCLEX-RN readiness.
              </p>
            </div>

            {/* Acute Care Telemetry Monitor Pill */}
            <div className="inline-flex flex-wrap items-center gap-3 rounded-xl bg-card/90 dark:bg-slate-900/90 border border-border/80 px-4 py-2 text-xs font-mono text-foreground/90 shadow-2xs">
              <span className="flex items-center gap-1.5 text-secondary font-semibold">
                <Activity className="h-4 w-4 animate-pulse text-secondary" />
                LEAD II ECG: 72 BPM
              </span>
              <span className="text-muted-foreground">•</span>
              <span>BP 120/78 mmHg</span>
              <span className="text-muted-foreground">•</span>
              <span>SpO₂ 98% (Room Air)</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-teal-700 dark:text-teal-300 font-medium">Acute Care Telemetry Active</span>
            </div>

            {/* Quick-Launch Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                data-testid="rn-hero-create-test-btn"
                onClick={() => onOpenCreateTest("tutored_cat")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-12 rounded-xl shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create RN Practice Test</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                data-testid="rn-hero-rat-btn"
                onClick={() => onOpenCreateTest("rat")}
                className="border-secondary/40 text-secondary hover:bg-secondary/10 font-semibold px-6 h-12 rounded-xl"
              >
                <Sparkles className="mr-2 h-4 w-4 text-secondary" />
                <span>Take RN Readiness (RAT)</span>
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
                    <span>Explore RN Study Guide</span>
                  </Link>
                </Button>
              )}

              {canSwitchPathway && onSwitchPathway && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwitchPathway("pn")}
                  data-testid="rn-deliberate-switch-to-pn"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Switch to NCLEX-PN Dashboard →
                </Button>
              )}
            </div>
          </div>

          {/* Right Column: Integrated RN Healthcare Illustration & Clinical Reasoning Badge */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-secondary/20 via-primary/10 to-transparent blur-xl"
              />
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl">
                <Image
                  src="/images/illustrations/prepford-clinical-decision-making.png"
                  alt="Registered nurse conducting clinical decision making, assessing telemetry, and prioritizing acute care scenarios"
                  width={600}
                  height={450}
                  priority
                  className="w-full h-64 sm:h-72 object-cover object-center"
                />
                <div className="p-4 bg-card/95 backdrop-blur-xs border-t border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-secondary">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-secondary" />
                      NCSBN Clinical Judgment Model
                    </span>
                    <span className="font-mono text-[11px] bg-secondary/15 px-2 py-0.5 rounded text-secondary">
                      NGN NCJMM
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Evaluates candidate ability to prioritize unstable clients, delegate within RN scope, and manage
                    acute physiological adaptation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: NCJMM CLINICAL JUDGMENT MEASUREMENT FRAMEWORK
         ===================================================================== */}
      <section
        data-testid="rn-ncjmm-framework"
        aria-labelledby="rn-ncjmm-heading"
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/60">
          <div>
            <h2 id="rn-ncjmm-heading" className="text-lg font-serif font-bold text-foreground">
              NGN Clinical Judgment Decision Framework (Layer 3)
            </h2>
            <p className="text-xs text-muted-foreground">
              PrepFord tests simulate the 6 cognitive steps required by the Next Generation NCLEX-RN.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto text-secondary">
            RN Clinical Reasoning
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RN_NCJMM_STEPS.map((step) => (
            <div
              key={step.step}
              className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-1 hover:border-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-secondary">Step {step.step}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
              </div>
              <h3 className="text-xs font-bold text-foreground">{step.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: AUTHORITATIVE RN CORE PERFORMANCE TELEMETRY
         ===================================================================== */}
      <section
        data-testid="rn-analytics-kpi-grid"
        aria-labelledby="rn-analytics-heading"
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="rn-analytics-heading" className="text-lg font-serif font-bold text-foreground">
            NCLEX-RN Performance Telemetry
          </h2>
          <span className="text-xs text-muted-foreground font-mono">PostgreSQL Server Authoritative</span>
        </div>

        {/* Compact Performance Intelligence Overview Card */}
        <CompactPerformanceCard
          overview={intelligenceOverview}
          pathway="rn"
          destinationHref="/learner/nclex-rn/performance"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Completed Assessments */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Completed RN Tests</span>
              <FileCheck2 className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground">{totalAttemptsCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalAttemptsCount > 0 ? "Server-validated practice attempts" : "No RN tests completed yet"}
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

          {/* Metric 3: Clinical Reasoning Study Hours */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Clinical Study Hours</span>
              <Clock className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground">
              {typeof analyticsSummary?.totalDurationMinutes === "number"
                ? (analyticsSummary.totalDurationMinutes / 60).toFixed(1)
                : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">Active practice &amp; study time logged</p>
          </div>

          {/* Metric 4: RN Mastery Rank */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Client Needs Rank</span>
              <BarChart2 className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-3xl font-serif font-bold text-foreground">
              {analyticsSummary?.currentReadinessTier || "Proficient"}
            </div>
            <p className="text-xs text-muted-foreground">NCSBN RN category percentile benchmark</p>
          </div>
        </div>

        {/* Longitudinal Trajectory & Study Consistency Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2" data-testid="rn-trajectory-section">
          <div className="lg:col-span-2">
            <AnalyticsChartCard
              title="Longitudinal Performance Trajectory"
              description="Sequential assessment accuracy and cumulative readiness score progression"
              empty={trajectoryPoints.length === 0}
              emptyTitle="No Assessment Trajectory Yet"
              emptyDescription="Complete your first NCLEX-RN practice set or Readiness Assessment to begin tracking your score progression over time."
            >
              <TrendChart
                data={trajectoryPoints}
                xKey="date"
                yAxisFormatter={(val) => `${val}%`}
                targetBenchmark={{ value: 75, label: "Pass Benchmark (75%)", color: "#10B981" }}
                series={[
                  { key: "score", name: "RN Exam Score (%)", color: "#0D9488", type: "area" },
                ]}
              />
            </AnalyticsChartCard>
          </div>

          <div>
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm h-full flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Study Consistency &amp; Streak
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-foreground">
                    {analyticsSummary?.totalCompletedAttempts && analyticsSummary.totalCompletedAttempts > 0 ? "Active" : "New Candidate"}
                  </span>
                  <Badge variant="success" className="text-xs">
                    {analyticsSummary?.totalCompletedAttempts ?? 0} Completed Sets
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Daily practice builds cognitive stamina for the 85–150 item computer-adaptive exam.
                </p>
              </div>

              <div className="pt-3 border-t border-border/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Practiced Minutes:</span>
                  <span className="font-mono font-bold text-foreground">
                    {analyticsSummary?.totalDurationMinutes ? Math.round(analyticsSummary.totalDurationMinutes) : 0} min
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Curriculum Domain Count:</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                    8 Official NCSBN Categories
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Clinical Standard:</span>
                  <span className="font-mono font-bold text-foreground">Next Gen NCLEX-RN (NGN)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: HIGH-ACUITY RN CLINICAL ALERTS & PRIORITIZATION PEARLS
         ===================================================================== */}
      <section
        data-testid="rn-clinical-pearls"
        className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-card to-card p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-secondary shrink-0" />
          <h2 className="text-base font-serif font-bold text-foreground">
            NCLEX-RN High-Yield Clinical Priority Guidelines
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-foreground/90">
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <span className="font-bold text-secondary uppercase font-mono tracking-wider">ABC &amp; Unstable Rule</span>
            <p className="text-muted-foreground leading-relaxed">
              Always address acute airway, breathing, and circulatory alterations before stable or chronic issues.
              Sudden dyspnea, acute chest pain, or SpO₂ &lt; 90% demand immediate action over diagnostic workups.
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <span className="font-bold text-secondary uppercase font-mono tracking-wider">RN Delegation Governance</span>
            <p className="text-muted-foreground leading-relaxed">
              Remember <strong>EAT</strong>: Do not delegate Evaluation, Initial Assessment, or Teaching. LPNs/LVNs
              manage stable clients and bedside procedures; UAPs assist with routine ADLs and baseline vitals.
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 space-y-1.5">
            <span className="font-bold text-secondary uppercase font-mono tracking-wider">High-Alert IV Infusions</span>
            <p className="text-muted-foreground leading-relaxed">
              Vasoactive drips, heparin, and insulins require double-check verification, continuous hemodynamic monitoring,
              and strict central line site surveillance.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4.5: INTERACTIVE CLIENT NEEDS RANKING BENCHMARK
         ===================================================================== */}
      <section
        data-testid="rn-client-needs-ranking"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-foreground">
              Client Needs Mastery Trajectory &amp; Pass Benchmark
            </h2>
            <p className="text-xs text-muted-foreground">
              Comparative ranking against the 75% NCSBN RN passing standard
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <HorizontalRankingChart
            items={rankingItems}
            benchmark={75}
            benchmarkLabel="NCSBN Passing Benchmark (75%)"
          />
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: NCSBN RN CLIENT NEEDS CATEGORY BREAKDOWN
         ===================================================================== */}
      <section
        data-testid="rn-client-needs-breakdown"
        aria-labelledby="rn-client-needs-heading"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="rn-client-needs-heading" className="text-xl font-serif font-bold text-foreground">
              NCLEX-RN Client Needs Category Breakdown
            </h2>
            <p className="text-xs text-muted-foreground">
              Your server-recorded accuracy across the 8 official NCSBN examination categories.
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
                key={cat.categoryCode}
                className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2 hover:border-secondary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate max-w-[80%]">{cat.categoryName}</span>
                  <span className="text-xs font-mono font-semibold text-secondary">
                    {Math.round(cat.accuracyPercent)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, cat.accuracyPercent))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{cat.totalAssessedQuestions} items attempted</span>
                  <button
                    type="button"
                    onClick={() => onOpenCreateTest("tutored_cat", cat.categoryCode)}
                    className="text-secondary hover:underline font-medium"
                  >
                    Drill Category →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CANONICAL_RN_CLIENT_NEEDS.map((cat) => (
                <div
                  key={cat.categoryCode}
                  className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2 hover:border-secondary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">{cat.categoryName}</span>
                      <span className="text-[11px] text-muted-foreground">{cat.subtext}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono text-secondary border-secondary/30 shrink-0 ml-2">
                      0%
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full bg-secondary/30 rounded-full w-2" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Baseline Readiness</span>
                    <button
                      type="button"
                      onClick={() => onOpenCreateTest("tutored_cat", cat.categoryCode)}
                      className="text-secondary hover:underline font-semibold"
                    >
                      Drill Category →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p className="text-muted-foreground text-center sm:text-left">
                Complete an NCLEX-RN practice set or full Readiness Assessment (RAT) to update your empirical Client Needs scores.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenCreateTest("tutored_cat")}
                className="bg-secondary text-secondary-foreground font-semibold text-xs shrink-0"
              >
                Start First RN Practice Set
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 6: RN ASSESSMENT HISTORY & REVIEW MODAL LAUNCHER
         ===================================================================== */}
      <section
        data-testid="rn-assessment-history"
        aria-labelledby="rn-assessment-history-heading"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="rn-assessment-history-heading" className="text-xl font-serif font-bold text-foreground">
              NCLEX-RN Assessment History
            </h2>
            <p className="text-xs text-muted-foreground">
              Review completed RN Computer Adaptive Tests, item-by-item rationales, and diagnostic reports.
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

        {rnStoredAttempts.length > 0 ? (
          <div className="divide-y divide-border/60">
            {rnStoredAttempts
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
                          className={`text-[10px] font-mono uppercase ${tierStyles.badgeBorder} ${tierStyles.badgeBg}`}
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
            <h3 className="text-sm font-semibold text-foreground">No RN test attempts yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create a tutored practice test or launch a comprehensive Readiness Assessment to start tracking your
              performance.
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
          SECTION 7: TARGETED NCLEX-RN CLINICAL RECOMMENDATIONS
         ===================================================================== */}
      <section
        data-testid="rn-study-recommendations"
        aria-labelledby="rn-recommendations-heading"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="rn-recommendations-heading" className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <span>Targeted NCLEX-RN Clinical Reasoning Recommendations</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Clinical judgment review topics prioritized for registered nurse practice and high-yield examination success.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto text-secondary border-secondary/40">
            NCSBN RN Prioritized
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.length > 0 ? (
            recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 flex flex-col justify-between hover:border-secondary/40 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {rec.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rec.priority === "High"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                          : "bg-secondary/15 text-secondary"
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground">{rec.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenCreateTest("tutored_cat")}
                    className="text-xs font-semibold h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full"
                  >
                    <span>Practice Clinical Scenario</span>
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 flex flex-col justify-between hover:border-secondary/40 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Physiological Adaptation
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                      High Priority
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground">Acute Cardiopulmonary Prioritization &amp; Ventilation</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Practice recognizing sudden hypoxemic cues, pulmonary embolisms, and prioritizing ABC interventions before diagnostic delays.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenCreateTest("tutored_cat", "PPT")}
                    className="text-xs font-semibold h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full"
                  >
                    <span>Drill Acute Scenarios</span>
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 flex flex-col justify-between hover:border-secondary/40 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Management of Care
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                      High Priority
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground">RN Delegation &amp; Clinical Scope Governance</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Master the EAT framework to safely delegate routine tasks to LPNs/UAPs while retaining initial assessment and teaching.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenCreateTest("tutored_cat", "MOC")}
                    className="text-xs font-semibold h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full"
                  >
                    <span>Practice RN Delegation</span>
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 flex flex-col justify-between hover:border-secondary/40 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Pharmacology &amp; Parenteral
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">
                      Targeted Focus
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground">High-Alert IV Medication Titration &amp; Toxicity</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Review weight-based calculations, vasoactive drip titrations, and early toxicity monitoring for potassium, digoxin, and insulins.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenCreateTest("tutored_cat", "PHA")}
                    className="text-xs font-semibold h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full"
                  >
                    <span>Practice IV Titration</span>
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION 8: RECENT RN LEARNING ACTIVITY
         ===================================================================== */}
      {recentActivity && (
        <section
          data-testid="rn-recent-activity"
          className="rounded-2xl border border-secondary/30 bg-secondary/5 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary">
                Recent RN Learning Activity
              </span>
              <h3 className="text-sm font-semibold text-foreground">{recentActivity.title}</h3>
              {recentActivity.categoryTitle && (
                <p className="text-xs text-muted-foreground">{recentActivity.categoryTitle}</p>
              )}
            </div>
          </div>
          <Button asChild size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold self-start sm:self-auto shrink-0 rounded-xl">
            <Link href={recentActivity.href}>
              <span>Resume Activity</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </section>
      )}

      {/* =====================================================================
          SECTION 9: AI STUDY STUDIO & CURATED HIGH-ACUITY STUDY GUIDES
         ===================================================================== */}
      <section
        data-testid="rn-study-resources"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* AI Study Studio Integration */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              <h2 className="text-base font-serif font-bold text-foreground">AI Study Studio (RN)</h2>
            </div>
            <Badge variant="outline" className="text-[11px] font-mono text-secondary">
              Spaced Repetition
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Consolidate high-alert pharmacological agents, acid-base rules, and hemodynamics with SM-2 spaced repetition
            review cards.
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
              <h2 className="text-base font-serif font-bold text-foreground">High-Yield RN Study Domains</h2>
            </div>
            <Link href="/study-guide" className="text-xs font-semibold text-secondary hover:underline">
              Browse All ({STUDY_GUIDE_CATEGORIES.length}) →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Quick-reference pathophysiology notes, nursing priority actions, and red-flag complications.
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
