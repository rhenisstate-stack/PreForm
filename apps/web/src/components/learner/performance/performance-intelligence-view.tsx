"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Compass,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { LearnerDashboardShell } from "@/components/learner/learner-dashboard-shell";
import { PerformanceKpiGrid } from "./performance-kpi-grid";
import { PerformanceTrendsChart } from "./performance-trends-chart";
import { ScoreDistributionChart } from "./score-distribution-chart";
import { ClientNeedsIntelligenceCard } from "./client-needs-intelligence-card";
import { QuestionIntelligenceCard } from "./question-intelligence-card";
import { QuestionReviewTable } from "./question-review-table";
import { AttemptComparisonModal } from "./attempt-comparison-modal";
import { PersonalizedRecommendationsList } from "./personalized-recommendations-list";
import { InterventionsTracker } from "./interventions-tracker";
import { PerformanceReportPreviewModal } from "./performance-report-preview-modal";
import type {
  AnalyticsFilter,
  AttemptComparisonResponse,
  CategoryPerformanceIntelligence,
  LearnerIntervention,
  LearnerPerformanceOverview,
  LearnerPerformanceReport,
  LearnerRecommendation,
  LearnerScoreDistribution,
  PaginatedQuestionReview,
  PerformanceTrendSeries,
  QuestionIntelligenceSummary,
} from "@/lib/api-services";

export interface PerformanceIntelligenceViewProps {
  initialPathway: "rn" | "pn";
  canSwitchPathway?: boolean;
}

export function PerformanceIntelligenceView({
  initialPathway,
  canSwitchPathway,
}: PerformanceIntelligenceViewProps) {
  const auth = useAuth();
  const user = auth?.user;

  const [pathway, setPathway] = React.useState<"rn" | "pn">(initialPathway);
  const [timeframe, setTimeframe] = React.useState<"7d" | "30d" | "90d" | "6m" | "all">("all");

  // State for data
  const [overview, setOverview] = React.useState<LearnerPerformanceOverview | null>(null);
  const [trendSeries, setTrendSeries] = React.useState<PerformanceTrendSeries | null>(null);
  const [distribution, setDistribution] = React.useState<LearnerScoreDistribution | null>(null);
  const [categories, setCategories] = React.useState<CategoryPerformanceIntelligence[]>([]);
  const [questionIntelligence, setQuestionIntelligence] = React.useState<QuestionIntelligenceSummary | null>(null);
  const [recommendations, setRecommendations] = React.useState<LearnerRecommendation[]>([]);
  const [interventions, setInterventions] = React.useState<LearnerIntervention[]>([]);

  // Question review pagination & search state
  const [reviewData, setReviewData] = React.useState<PaginatedQuestionReview | null>(null);
  const [reviewPage, setReviewPage] = React.useState<number>(1);
  const [reviewSearch, setReviewSearch] = React.useState<string>("");
  const [reviewOnlyIncorrect, setReviewOnlyIncorrect] = React.useState<boolean>(false);

  // Modals state
  const [isComparisonOpen, setIsComparisonOpen] = React.useState<boolean>(false);
  const [comparisonData, setComparisonData] = React.useState<AttemptComparisonResponse | null>(null);
  const [isReportOpen, setIsReportOpen] = React.useState<boolean>(false);
  const [reportData, setReportData] = React.useState<LearnerPerformanceReport | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isReviewLoading, setIsReviewLoading] = React.useState<boolean>(false);

  // Fetch core telemetry
  const loadPerformanceData = React.useCallback(async () => {
    setIsLoading(true);
    const filterParams = new URLSearchParams({ pathway, timeframe });
    const qs = `?${filterParams.toString()}`;

    try {
      const [ovRes, trRes, distRes, catRes, qiRes, recRes, intRes] = await Promise.all([
        fetch(`/api/learner/analytics/overview${qs}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/learner/analytics/trends${qs}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/learner/analytics/distribution${qs}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/learner/analytics/categories${qs}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/learner/analytics/question-intelligence${qs}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/learner/analytics/recommendations-v2?pathway=${pathway}`).then((r) => r.json()).catch(() => null),
        fetch("/api/learner/analytics/interventions").then((r) => r.json()).catch(() => null),
      ]);

      if (ovRes) setOverview(ovRes);
      if (trRes) setTrendSeries(trRes);
      if (distRes) setDistribution(distRes);
      if (catRes && Array.isArray(catRes)) setCategories(catRes);
      if (qiRes) setQuestionIntelligence(qiRes);
      if (recRes && Array.isArray(recRes)) setRecommendations(recRes);
      if (intRes && Array.isArray(intRes)) setInterventions(intRes);
    } catch {
      // Handled cleanly
    } finally {
      setIsLoading(false);
    }
  }, [pathway, timeframe]);

  // Fetch question review history
  const loadQuestionReview = React.useCallback(async () => {
    setIsReviewLoading(true);
    const params = new URLSearchParams({
      pathway,
      page: reviewPage.toString(),
      pageSize: "10",
      search: reviewSearch,
      onlyIncorrect: String(reviewOnlyIncorrect),
    });

    try {
      const res = await fetch(`/api/learner/analytics/question-review?${params.toString()}`).then((r) => r.json());
      if (res && res.items) {
        setReviewData(res);
      }
    } catch {
      // Handled cleanly
    } finally {
      setIsReviewLoading(false);
    }
  }, [pathway, reviewPage, reviewSearch, reviewOnlyIncorrect]);

  React.useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  React.useEffect(() => {
    loadQuestionReview();
  }, [loadQuestionReview]);

  // Open Attempt Comparison Modal
  const handleOpenComparison = async () => {
    setIsComparisonOpen(true);
    try {
      const res = await fetch("/api/learner/analytics/comparison").then((r) => r.json());
      if (res) setComparisonData(res);
    } catch {
      // Handled cleanly
    }
  };

  // Open Report Preview Modal
  const handleOpenReport = async () => {
    setIsReportOpen(true);
    const params = new URLSearchParams({ pathway, timeframe });
    try {
      const res = await fetch(`/api/learner/reports/performance?${params.toString()}`).then((r) => r.json());
      if (res) setReportData(res);
    } catch {
      // Handled cleanly
    }
  };

  // Start Intervention action
  const handleStartIntervention = async (rec: LearnerRecommendation) => {
    try {
      const res = await fetch("/api/learner/analytics/interventions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId: rec.id,
          title: `Remediation Drill: ${rec.title}`,
          targetCategoryCode: rec.targetClientNeedCode,
          targetCategoryName: rec.targetClientNeedName,
        }),
      }).then((r) => r.json());

      if (res && res.id) {
        setInterventions((prev) => [res, ...prev]);
        setRecommendations((prev) =>
          prev.map((r) => (r.id === rec.id ? { ...r, status: "InProgress" } : r))
        );
      }
    } catch {
      // Handled cleanly
    }
  };

  // Update Recommendation Status action
  const handleUpdateRecStatus = async (id: string, status: "New" | "InProgress" | "Completed" | "Dismissed") => {
    try {
      await fetch(`/api/learner/analytics/recommendations/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch {
      // Handled cleanly
    }
  };

  const isRN = pathway === "rn";
  const pathwayLabel = isRN ? "NCLEX-RN (Registered Nurse)" : "NCLEX-PN (Practical Nurse)";

  // Enforce single-pathway boundary for candidate role
  if (
    user &&
    user.role === "candidate" &&
    user.pathway &&
    user.pathway !== initialPathway
  ) {
    const isRn = initialPathway === "rn";
    return (
      <LearnerDashboardShell
        activeNav="performance"
        breadcrumbPageTitle={`${initialPathway.toUpperCase()} Performance`}
      >
        <div
          data-testid="dashboard-entitlement-blocked"
          className="w-full py-24 px-4 text-center bg-background"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6">
            <ShieldCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-3">
            {isRn ? "NCLEX-RN Entitlement Required" : "NCLEX-PN Entitlement Required"}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm sm:text-base">
            Your account is currently enrolled in the{" "}
            <span className="font-semibold text-foreground">
              NCLEX-{user.pathway.toUpperCase()}
            </span>{" "}
            programme. Single-pathway policy restricts access to your assigned examination track.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/dashboard/${user.pathway}/performance`}>
                Return to My NCLEX-{user.pathway.toUpperCase()} Performance
              </Link>
            </Button>
          </div>
        </div>
      </LearnerDashboardShell>
    );
  }

  return (
    <LearnerDashboardShell
      activeNav="performance"
      breadcrumbPageTitle={`${pathway.toUpperCase()} Performance Intelligence`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Top Header & Context Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 text-muted-foreground hover:text-foreground">
                <Link href={isRN ? "/dashboard/rn" : "/dashboard/pn"}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span>Dashboard</span>
                </Link>
              </Button>
              <Badge variant="outline" className="font-mono text-xs uppercase bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
                Performance Intelligence
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
              {isRN ? "NCLEX-RN Clinical Performance Intelligence" : "NCLEX-PN Clinical Performance Intelligence"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Longitudinal diagnostic analytics, NCSBN Client Needs mastery, cognitive error discrimination, and targeted study interventions for {pathwayLabel}.
            </p>
          </div>

          {/* Action CTAs: Compare, Report & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenComparison}
              className="h-9 rounded-xl text-xs gap-1.5 border-border"
              title="Compare side-by-side assessment attempts"
            >
              <Scale className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>Compare Attempts</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenReport}
              className="h-9 rounded-xl text-xs gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 font-semibold"
              title="Open full printable performance report"
            >
              <Download className="h-4 w-4" />
              <span>Performance Report</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                loadPerformanceData();
                loadQuestionReview();
              }}
              className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* SECTION 1: EXECUTIVE PERFORMANCE KPI GRID */}
        <PerformanceKpiGrid overview={overview} isLoading={isLoading} />

        {/* SECTION 2: LONGITUDINAL TRENDS & HISTOGRAM DISTRIBUTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceTrendsChart
            trendSeries={trendSeries}
            timeframe={timeframe}
            onTimeframeChange={(tf) => setTimeframe(tf)}
            isLoading={isLoading}
          />
          <ScoreDistributionChart distribution={distribution} isLoading={isLoading} />
        </div>

        {/* SECTION 3: NCLEX CLIENT NEEDS CATEGORY MASTERY */}
        <ClientNeedsIntelligenceCard
          categories={categories}
          pathway={pathway}
          isLoading={isLoading}
          onPracticeCategory={(code) => {
            window.location.assign(`/dashboard?tab=tutored_cat&category=${code}`);
          }}
        />

        {/* SECTION 4: QUESTION INTELLIGENCE & NCJMM COGNITIVE STEPS */}
        <QuestionIntelligenceCard
          summary={questionIntelligence}
          pathway={pathway}
          isLoading={isLoading}
        />

        {/* SECTION 5: PERSONALIZED AI RECOMMENDATIONS & INTERVENTION TRACKER */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PersonalizedRecommendationsList
            recommendations={recommendations}
            onStartIntervention={handleStartIntervention}
            onUpdateStatus={handleUpdateRecStatus}
            isLoading={isLoading}
          />
          <InterventionsTracker interventions={interventions} isLoading={isLoading} />
        </div>

        {/* SECTION 6: CANDIDATE QUESTION HISTORY & RATIONALES */}
        <QuestionReviewTable
          reviewData={reviewData}
          page={reviewPage}
          pageSize={10}
          search={reviewSearch}
          onlyIncorrect={reviewOnlyIncorrect}
          onPageChange={(p) => setReviewPage(p)}
          onSearchChange={(s) => {
            setReviewSearch(s);
            setReviewPage(1);
          }}
          onOnlyIncorrectToggle={(v) => {
            setReviewOnlyIncorrect(v);
            setReviewPage(1);
          }}
          isLoading={isReviewLoading}
        />

        {/* Modals */}
        <AttemptComparisonModal
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          comparison={comparisonData}
        />

        <PerformanceReportPreviewModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          report={reportData}
          pathway={pathway}
          timeframe={timeframe}
        />
      </div>
    </LearnerDashboardShell>
  );
}
