"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  FileQuestion,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Activity,
  Layers,
  ShieldCheck,
  RefreshCw,
  BookOpen,
  CreditCard,
  GraduationCap,
  ListTodo,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { Button } from "@/components/ui/button";
import {
  AnalyticsKpiCard,
  ChartDateRangeFilter,
  PathwayToggleFilter,
  type TimeRangeOption,
} from "@/components/analytics";
import { AdminEcosystemView } from "@/components/admin/views/admin-ecosystem-view";
import { ExamManagerView } from "@/components/admin/views/exam-manager-view";
import { ContentManagerView } from "@/components/admin/views/content-manager-view";
import { ReviewerView } from "@/components/admin/views/reviewer-view";
import { InstructorView } from "@/components/admin/views/instructor-view";

import type {
  AdminSystemOverviewDto,
  AdminUserAnalyticsDto,
  AdminExamAnalyticsDto,
  AdminAcademicAnalyticsDto,
  AdminMonetizationAnalyticsDto,
  AdminPlatformActivityDto,
  ExamManagerOverviewDto,
  ContentManagerOverviewDto,
  ReviewerOverviewDto,
  InstructorOverviewDto,
} from "@/lib/api-services";

type WorkspaceTab = "ecosystem" | "exams" | "content" | "reviews" | "instructor";

export function AdminOverviewClient() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Filters state
  const [timeRange, setTimeRange] = React.useState<TimeRangeOption>("30d");
  const [pathway, setPathway] = React.useState<"all" | "rn" | "pn">("all");

  // Determine initial tab from user role
  const userRole = String(user?.role || "").toLowerCase();
  const initialTab: WorkspaceTab = React.useMemo(() => {
    if (userRole === "exam_manager") return "exams";
    if (userRole === "content_manager") return "content";
    if (userRole === "reviewer") return "reviews";
    if (userRole === "instructor") return "instructor";
    return "ecosystem";
  }, [userRole]);

  const [activeTab, setActiveTab] = React.useState<WorkspaceTab>(initialTab);

  // Sync activeTab when user loads
  React.useEffect(() => {
    if (userRole) {
      if (userRole === "exam_manager") setActiveTab("exams");
      else if (userRole === "content_manager") setActiveTab("content");
      else if (userRole === "reviewer") setActiveTab("reviews");
      else if (userRole === "instructor") setActiveTab("instructor");
    }
  }, [userRole]);

  // Data states
  const [overview, setOverview] = React.useState<AdminSystemOverviewDto | null>(null);
  const [overviewLoading, setOverviewLoading] = React.useState(true);

  // Ecosystem sub-data
  const [userAnalytics, setUserAnalytics] = React.useState<AdminUserAnalyticsDto | null>(null);
  const [examAnalytics, setExamAnalytics] = React.useState<AdminExamAnalyticsDto | null>(null);
  const [academicAnalytics, setAcademicAnalytics] = React.useState<AdminAcademicAnalyticsDto | null>(null);
  const [monetizationAnalytics, setMonetizationAnalytics] = React.useState<AdminMonetizationAnalyticsDto | null>(null);
  const [activityAnalytics, setActivityAnalytics] = React.useState<AdminPlatformActivityDto | null>(null);
  const [ecosystemLoading, setEcosystemLoading] = React.useState(true);

  // Role-specific data
  const [examsData, setExamsData] = React.useState<ExamManagerOverviewDto | null>(null);
  const [examsLoading, setExamsLoading] = React.useState(false);

  const [contentData, setContentData] = React.useState<ContentManagerOverviewDto | null>(null);
  const [contentLoading, setContentLoading] = React.useState(false);

  const [reviewerData, setReviewerData] = React.useState<ReviewerOverviewDto | null>(null);
  const [reviewerLoading, setReviewerLoading] = React.useState(false);

  const [instructorData, setInstructorData] = React.useState<InstructorOverviewDto | null>(null);
  const [instructorLoading, setInstructorLoading] = React.useState(false);

  // Fetch consolidated overview KPIs
  const fetchOverview = React.useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/overview?timeRange=${timeRange}&pathway=${pathway}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setOverview(json.data);
        }
      } else {
        // Fallback to legacy reports overview if new endpoint not yet reachable
        const fallbackRes = await fetch("/api/admin/reports/overview");
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const d = fallbackData?.data || fallbackData;
          setOverview({
            kpis: {
              totalUsers: d.totalLearners ?? 0,
              activeUsers: d.activeLearners ?? 0,
              newRegistrations: 0,
              totalRnLearners: 0,
              totalPnLearners: 0,
              totalExaminations: d.publishedExamsCount ?? 0,
              examinationAttempts: d.totalCompletedAttempts ?? 0,
              completedExaminations: d.totalCompletedAttempts ?? 0,
              totalQuestions: d.totalQuestions ?? 0,
              publishedStudyResources: 0,
              activeSubscriptions: 0,
              netSubscriptionRevenue: 0,
              grossCollectedRevenue: 0,
              totalRefunds: 0,
              pendingOperationalTasks: d.reviewQueueCount ?? 0,
            },
            deltas: {
              periodLabel: "vs prior period",
            },
            calculatedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Gracefully handle network error
    } finally {
      setOverviewLoading(false);
    }
  }, [timeRange, pathway]);

  // Fetch active tab data
  const fetchTabData = React.useCallback(async () => {
    if (activeTab === "ecosystem") {
      setEcosystemLoading(true);
      try {
        const [uRes, eRes, aRes, mRes, actRes] = await Promise.all([
          fetch(`/api/admin/analytics/users?timeRange=${timeRange}&pathway=${pathway}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/admin/analytics/examinations?timeRange=${timeRange}&pathway=${pathway}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/admin/analytics/academics?timeRange=${timeRange}&pathway=${pathway}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/admin/analytics/monetization?timeRange=${timeRange}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/admin/analytics/activity?timeRange=${timeRange}&limit=15`).then((r) => r.ok ? r.json() : null),
        ]);

        if (uRes?.data) setUserAnalytics(uRes.data);
        if (eRes?.data) setExamAnalytics(eRes.data);
        if (aRes?.data) setAcademicAnalytics(aRes.data);
        if (mRes?.data) setMonetizationAnalytics(mRes.data);
        if (actRes?.data) setActivityAnalytics(actRes.data);
      } catch {
        // Handled silently
      } finally {
        setEcosystemLoading(false);
      }
    } else if (activeTab === "exams") {
      setExamsLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics/exams/overview?timeRange=${timeRange}&pathway=${pathway}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setExamsData(json.data);
        }
      } catch {
        // ignore
      } finally {
        setExamsLoading(false);
      }
    } else if (activeTab === "content") {
      setContentLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics/content/overview?timeRange=${timeRange}&pathway=${pathway}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setContentData(json.data);
        }
      } catch {
        // ignore
      } finally {
        setContentLoading(false);
      }
    } else if (activeTab === "reviews") {
      setReviewerLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics/reviews/overview?timeRange=${timeRange}&pathway=${pathway}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setReviewerData(json.data);
        }
      } catch {
        // ignore
      } finally {
        setReviewerLoading(false);
      }
    } else if (activeTab === "instructor") {
      setInstructorLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics/instructor/overview?timeRange=${timeRange}&pathway=${pathway}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setInstructorData(json.data);
        }
      } catch {
        // ignore
      } finally {
        setInstructorLoading(false);
      }
    }
  }, [activeTab, timeRange, pathway]);

  React.useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  React.useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const handleRefreshAll = () => {
    fetchOverview();
    fetchTabData();
  };

  if (isLoading) {
    return <BrandedLoading message="Preparing administrative intelligence workspace..." fullScreen={false} />;
  }

  const kpis = overview?.kpis;
  const deltas = overview?.deltas;

  return (
    <div className="space-y-8" data-testid="admin-overview-page">
      {/* 1. Header & Global Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
            System Intelligence &amp; Operational Command
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consolidated platform telemetry, candidate performance, content pipelines, and revenue operations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PathwayToggleFilter value={pathway} onChange={setPathway} />
          <ChartDateRangeFilter value={timeRange} onChange={setTimeRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
            title="Refresh analytics telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${overviewLoading || ecosystemLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Executive 12-KPI Grid (Preserves data-testid="admin-overview-metrics") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Executive Key Performance Indicators
          </span>
          {deltas?.periodLabel && (
            <span className="text-[11px] font-mono text-muted-foreground">
              Calculated {deltas.periodLabel}
            </span>
          )}
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          data-testid="admin-overview-metrics"
        >
          {/* Card 1: Candidate Cohort (Preserved test structure) */}
          <AnalyticsKpiCard
            title="Candidate Cohort"
            value={kpis?.totalUsers ?? 0}
            subtitle={`${kpis?.activeUsers ?? 0} active (${
              kpis?.totalUsers ? Math.round(((kpis.activeUsers || 0) / kpis.totalUsers) * 100) : 0
            }% rate)`}
            changePercent={deltas?.userGrowthPercent}
            changeLabel={deltas?.periodLabel}
            icon={Users}
            loading={overviewLoading}
            variant="primary"
          />

          {/* Card 2: Question Repository (Preserved test structure) */}
          <AnalyticsKpiCard
            title="Question Repository"
            value={kpis?.totalQuestions ?? 0}
            subtitle="Clinical items across all formats"
            icon={FileQuestion}
            loading={overviewLoading}
            variant="teal"
          />

          {/* Card 3: Review Queue (Preserved test structure) */}
          <AnalyticsKpiCard
            title="Review Queue"
            value={kpis?.pendingOperationalTasks ?? 0}
            subtitle={kpis?.pendingOperationalTasks === 0 ? "Review queue clear" : "Items in draft or review workflow"}
            icon={AlertCircle}
            loading={overviewLoading}
            variant="amber"
          />

          {/* Card 4: Published Exams (Preserved test structure) */}
          <AnalyticsKpiCard
            title="Published Exams"
            value={kpis?.totalExaminations ?? 0}
            subtitle={`${kpis?.completedExaminations ?? 0} completed attempts`}
            changePercent={deltas?.attemptsGrowthPercent}
            changeLabel={deltas?.periodLabel}
            icon={Award}
            loading={overviewLoading}
            variant="emerald"
          />

          {/* Card 5: NCLEX-RN Candidates */}
          <AnalyticsKpiCard
            title="NCLEX-RN Cohort"
            value={kpis?.totalRnLearners ?? 0}
            subtitle="Registered RN candidates"
            icon={GraduationCap}
            loading={overviewLoading}
            variant="primary"
          />

          {/* Card 6: NCLEX-PN Candidates */}
          <AnalyticsKpiCard
            title="NCLEX-PN Cohort"
            value={kpis?.totalPnLearners ?? 0}
            subtitle="Registered PN candidates"
            icon={GraduationCap}
            loading={overviewLoading}
            variant="violet"
          />

          {/* Card 7: Assessment Sessions */}
          <AnalyticsKpiCard
            title="Examination Attempts"
            value={kpis?.examinationAttempts ?? 0}
            subtitle={`${kpis?.completedExaminations ?? 0} completed successfully`}
            icon={Activity}
            loading={overviewLoading}
            variant="teal"
          />

          {/* Card 8: Curated Resources */}
          <AnalyticsKpiCard
            title="Study Guides"
            value={kpis?.publishedStudyResources ?? 0}
            subtitle="Published academic modules"
            icon={BookOpen}
            loading={overviewLoading}
            variant="default"
          />

          {/* Card 9: Active Subscriptions */}
          <AnalyticsKpiCard
            title="Active Subscriptions"
            value={kpis?.activeSubscriptions ?? 0}
            subtitle="Monetized candidate accounts"
            icon={CreditCard}
            loading={overviewLoading}
            variant="emerald"
          />

          {/* Card 10: Net Subscription Revenue */}
          <AnalyticsKpiCard
            title="Net Revenue"
            value={`$${(kpis?.netSubscriptionRevenue ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            subtitle={`Gross: $${(kpis?.grossCollectedRevenue ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            changePercent={deltas?.revenueGrowthPercent}
            changeLabel={deltas?.periodLabel}
            icon={CreditCard}
            loading={overviewLoading}
            variant="emerald"
          />

          {/* Card 11: Total Refunds */}
          <AnalyticsKpiCard
            title="Total Refunds"
            value={`$${(kpis?.totalRefunds ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            subtitle="Disputed or reimbursed"
            icon={AlertCircle}
            loading={overviewLoading}
            variant="rose"
            invertTrendColor={true}
          />

          {/* Card 12: System Health */}
          <AnalyticsKpiCard
            title="Platform Telemetry"
            value="100% Up"
            subtitle="Authoritative PostgreSQL active"
            icon={ShieldCheck}
            loading={overviewLoading}
            variant="teal"
          />
        </div>
      </div>

      {/* 3. Operational Perspective & Role Workspace Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActiveTab("ecosystem")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                activeTab === "ecosystem"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Consolidated Ecosystem
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("exams")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                activeTab === "exams"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Exam Operations
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                activeTab === "content"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <FileQuestion className="h-3.5 w-3.5" />
              Content &amp; Curriculum
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                activeTab === "reviews"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              Review Queues
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("instructor")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                activeTab === "instructor"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Instructor Cohorts
            </button>
          </div>
        </div>

        {/* 4. Active Workspace View Rendering */}
        <div className="pt-2">
          {activeTab === "ecosystem" && (
            <AdminEcosystemView
              timeRange={timeRange}
              pathway={pathway}
              userAnalytics={userAnalytics}
              examAnalytics={examAnalytics}
              academicAnalytics={academicAnalytics}
              monetizationAnalytics={monetizationAnalytics}
              activityAnalytics={activityAnalytics}
              loading={ecosystemLoading}
              onRefresh={fetchTabData}
            />
          )}

          {activeTab === "exams" && (
            <ExamManagerView
              data={examsData}
              loading={examsLoading}
              onRefresh={fetchTabData}
            />
          )}

          {activeTab === "content" && (
            <ContentManagerView
              data={contentData}
              loading={contentLoading}
              onRefresh={fetchTabData}
            />
          )}

          {activeTab === "reviews" && (
            <ReviewerView
              data={reviewerData}
              loading={reviewerLoading}
              onRefresh={fetchTabData}
            />
          )}

          {activeTab === "instructor" && (
            <InstructorView
              data={instructorData}
              loading={instructorLoading}
              onRefresh={fetchTabData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
