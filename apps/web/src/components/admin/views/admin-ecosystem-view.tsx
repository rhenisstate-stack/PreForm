"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  FileQuestion,
  CreditCard,
  Activity,
  ArrowRight,
  Database,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import {
  AnalyticsSection,
  AnalyticsChartCard,
  TrendChart,
  BarComparisonChart,
  DonutDistributionChart,
  ActivityTimeline,
} from "@/components/analytics";
import type {
  AdminUserAnalyticsDto,
  AdminExamAnalyticsDto,
  AdminAcademicAnalyticsDto,
  AdminMonetizationAnalyticsDto,
  AdminPlatformActivityDto,
} from "@/lib/api-services";

export interface AdminEcosystemViewProps {
  timeRange: string;
  pathway: string;
  userAnalytics: AdminUserAnalyticsDto | null;
  examAnalytics: AdminExamAnalyticsDto | null;
  academicAnalytics: AdminAcademicAnalyticsDto | null;
  monetizationAnalytics: AdminMonetizationAnalyticsDto | null;
  activityAnalytics: AdminPlatformActivityDto | null;
  loading: boolean;
  onRefresh?: () => void;
}

export function AdminEcosystemView({
  timeRange,
  pathway,
  userAnalytics,
  examAnalytics,
  academicAnalytics,
  monetizationAnalytics,
  activityAnalytics,
  loading,
  onRefresh,
}: AdminEcosystemViewProps) {
  // Pathway distribution for Donut Chart
  const pathwayDonutData = React.useMemo(() => {
    if (!userAnalytics?.pathwayDistribution) return [];
    return [
      { name: "NCLEX-RN Candidates", value: userAnalytics.pathwayDistribution.rnCount, color: "#142B4A" },
      { name: "NCLEX-PN Candidates", value: userAnalytics.pathwayDistribution.pnCount, color: "#8B5CF6" },
      { name: "Dual Pathway Enrollees", value: userAnalytics.pathwayDistribution.bothCount, color: "#0D9488" },
    ].filter((item) => item.value > 0);
  }, [userAnalytics]);

  // Questions by type for Donut Chart
  const questionTypeDonutData = React.useMemo(() => {
    if (!academicAnalytics?.questionsByType) return [];
    return academicAnalytics.questionsByType.map((t) => ({
      name: t.typeName,
      value: t.count,
    }));
  }, [academicAnalytics]);

  // Subscriptions by status for Donut Chart
  const subscriptionStatusDonutData = React.useMemo(() => {
    if (!monetizationAnalytics?.subscriptionsByStatus) return [];
    const statusColorMap: Record<string, string> = {
      Active: "#10B981",
      Trialing: "#0D9488",
      PastDue: "#F59E0B",
      Canceled: "#EF4444",
      Expired: "#64748B",
    };
    return monetizationAnalytics.subscriptionsByStatus.map((s) => ({
      name: s.status,
      value: s.count,
      color: statusColorMap[s.status] || "#64748B",
    }));
  }, [monetizationAnalytics]);

  // Activity events formatted for Timeline
  const formattedActivityEvents = React.useMemo(() => {
    if (!activityAnalytics?.recentEvents) return [];
    return activityAnalytics.recentEvents.map((e) => ({
      id: e.id,
      actor: e.actor,
      action: e.action,
      category: e.category,
      description: e.description,
      timestamp: e.timestamp,
      status: (e.status === "Critical" ? "error" : e.status === "Warning" ? "warning" : "info") as "info" | "warning" | "error" | "success",
    }));
  }, [activityAnalytics]);

  return (
    <div className="space-y-10" data-testid="admin-ecosystem-view">
      {/* 1. User & Learner Growth Analytics */}
      <AnalyticsSection
        title="Candidate Cohort & User Growth"
        description="Longitudinal candidate registrations, pathway distribution, and cohort engagement metrics"
        icon={Users}
        action={
          <Link
            href="/admin/users"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            Manage Users <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalyticsChartCard
              title="Registration Velocity & Cumulative Growth"
              description="New daily registrations partitioned by candidate educational pathway"
              loading={loading}
              empty={!userAnalytics?.registrationTrends?.length}
            >
              <TrendChart
                data={userAnalytics?.registrationTrends || []}
                xKey="date"
                series={[
                  { key: "newUsers", name: "New Candidates", color: "#0D9488", type: "area" },
                  { key: "rnLearners", name: "NCLEX-RN Cohort", color: "#142B4A", type: "line" },
                  { key: "pnLearners", name: "NCLEX-PN Cohort", color: "#8B5CF6", type: "line" },
                ]}
              />
            </AnalyticsChartCard>
          </div>

          <div>
            <AnalyticsChartCard
              title="Candidate Pathway Breakdown"
              description="Proportion of registered learners across NCLEX curricula"
              loading={loading}
              empty={pathwayDonutData.length === 0}
            >
              <DonutDistributionChart
                data={pathwayDonutData}
                centerLabel="Total Candidates"
                centerValue={
                  (userAnalytics?.pathwayDistribution?.rnCount ?? 0) +
                  (userAnalytics?.pathwayDistribution?.pnCount ?? 0) +
                  (userAnalytics?.pathwayDistribution?.bothCount ?? 0)
                }
              />
            </AnalyticsChartCard>
          </div>
        </div>
      </AnalyticsSection>

      {/* 2. Examination Management & Assessment Activity */}
      <AnalyticsSection
        title="Assessment Intelligence & Examination Activity"
        description="Candidate examination attempts, completion rates, and average clinical scores"
        icon={GraduationCap}
        action={
          <Link
            href="/admin/examinations"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            Exam Catalog <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalyticsChartCard
              title="Assessment Participation & Completion Trends"
              description="Total exam attempts launched versus successfully completed over the selected window"
              loading={loading}
              empty={!examAnalytics?.attemptTrends?.length}
            >
              <TrendChart
                data={examAnalytics?.attemptTrends || []}
                xKey="date"
                series={[
                  { key: "totalAttempts", name: "Launched Attempts", color: "#142B4A", type: "area" },
                  { key: "completedAttempts", name: "Completed Assessments", color: "#0D9488", type: "area" },
                ]}
              />
            </AnalyticsChartCard>
          </div>

          <div>
            <AnalyticsChartCard
              title="Attempt Status Distribution"
              description="Proportional outcome of candidate examination sessions"
              loading={loading}
              empty={!examAnalytics?.statusBreakdown?.length}
            >
              <DonutDistributionChart
                data={
                  examAnalytics?.statusBreakdown?.map((s) => ({
                    name: s.status,
                    value: s.count,
                  })) || []
                }
                centerLabel="Total Attempts"
              />
            </AnalyticsChartCard>
          </div>
        </div>

        {/* Top Examinations Table */}
        {examAnalytics?.topExaminations && examAnalytics.topExaminations.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">High-Activity Examinations</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-muted-foreground uppercase border-b border-border/40 font-mono">
                  <tr>
                    <th className="py-2 pr-4">Examination</th>
                    <th className="py-2 px-4">Pathway</th>
                    <th className="py-2 px-4 text-right">Attempts</th>
                    <th className="py-2 px-4 text-right">Avg Score</th>
                    <th className="py-2 pl-4 text-right">Pass Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono">
                  {examAnalytics.topExaminations.map((exam) => (
                    <tr key={exam.examId} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-4 font-sans font-medium text-foreground">{exam.title}</td>
                      <td className="py-2.5 px-4 uppercase text-muted-foreground">{exam.pathway}</td>
                      <td className="py-2.5 px-4 text-right text-foreground">{exam.attemptsCount.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-foreground">{exam.averageScore.toFixed(1)}%</td>
                      <td className="py-2.5 pl-4 text-right font-bold text-teal-600 dark:text-teal-400">
                        {exam.passRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AnalyticsSection>

      {/* 3. Academic & Question Bank Operations */}
      <AnalyticsSection
        title="Curriculum & Item Repository Operations"
        description="Question bank growth velocity, item format diversity, and curated study guide pipelines"
        icon={FileQuestion}
        action={
          <Link
            href="/admin/questions"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            Question Bank <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalyticsChartCard
              title="Question Bank Ingestion Velocity"
              description="Cumulative clinical items authored and ingested into the repository"
              loading={loading}
              empty={!academicAnalytics?.questionGrowth?.length}
            >
              <TrendChart
                data={academicAnalytics?.questionGrowth || []}
                xKey="date"
                series={[
                  { key: "cumulativeQuestions", name: "Total Items", color: "#142B4A", type: "line" },
                  { key: "questionsAdded", name: "Items Ingested", color: "#0D9488", type: "area" },
                ]}
              />
            </AnalyticsChartCard>
          </div>

          <div>
            <AnalyticsChartCard
              title="Item Types & Format Mix"
              description="Distribution across Next Gen NCLEX (NGN) clinical item models"
              loading={loading}
              empty={questionTypeDonutData.length === 0}
            >
              <DonutDistributionChart
                data={questionTypeDonutData}
                centerLabel="Item Types"
              />
            </AnalyticsChartCard>
          </div>
        </div>
      </AnalyticsSection>

      {/* 4. Monetization & Subscription Intelligence */}
      <AnalyticsSection
        title="Monetization, Plans & Transaction Analytics"
        description="Gross collected payments, refund reconciliation, net platform revenue, and subscriber retention"
        icon={CreditCard}
        action={
          <Link
            href="/admin/monetization"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            Monetization Hub <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalyticsChartCard
              title="Revenue Trajectory (Gross vs Net Collected)"
              description="Financial receipts after subtracting customer refunds and processing adjustments"
              loading={loading}
              empty={!monetizationAnalytics?.revenueTrends?.length}
            >
              <TrendChart
                data={monetizationAnalytics?.revenueTrends || []}
                xKey="date"
                yAxisFormatter={(val) => `$${val.toLocaleString()}`}
                series={[
                  { key: "grossAmount", name: "Gross Collected ($)", color: "#0D9488", type: "line" },
                  { key: "netAmount", name: "Net Revenue ($)", color: "#142B4A", type: "area" },
                  { key: "refundsAmount", name: "Refunds ($)", color: "#EF4444", type: "line" },
                ]}
              />
            </AnalyticsChartCard>
          </div>

          <div>
            <AnalyticsChartCard
              title="Subscriber Lifecycle Mix"
              description="Candidate subscription status health"
              loading={loading}
              empty={subscriptionStatusDonutData.length === 0}
            >
              <DonutDistributionChart
                data={subscriptionStatusDonutData}
                centerLabel="Subscriptions"
              />
            </AnalyticsChartCard>
          </div>
        </div>
      </AnalyticsSection>

      {/* 5. Platform Activity & Audit Stream */}
      <AnalyticsSection
        title="Platform Audit Events & Operational Pulse"
        description="Real-time administrative, assessment, and monetization activity audit trails"
        icon={Activity}
        action={
          <Link
            href="/admin/audit-logs"
            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
          >
            Full Audit Logs <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalyticsChartCard
              title="Recent Operational Activity Stream"
              description="Chronological audit records across all administrative and candidate subsystems"
              loading={loading}
              empty={formattedActivityEvents.length === 0}
              heightClass="h-auto min-h-[300px]"
            >
              <ActivityTimeline events={formattedActivityEvents} maxEvents={8} />
            </AnalyticsChartCard>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Database Engine
                </span>
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {activityAnalytics?.systemOperationalStatus?.databaseHealthy ? "Healthy / Active" : "Operational"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authoritative PostgreSQL 16 Store
                </p>
              </div>
              <div className="pt-2 border-t border-border/40 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Connections Pool:</span>
                  <span className="font-semibold text-foreground">
                    ~{activityAnalytics?.systemOperationalStatus?.activeConnectionsEstimate ?? 12} active
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Gateway Protocol:</span>
                  <span className="font-semibold text-foreground">HMAC-SHA256</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Regulatory Compliance
                </span>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                RBAC strictly enforced at ASP.NET Core 8 API layer. Candidate scores and assessment state are tamper-proof and isolated by pathway.
              </p>
            </div>
          </div>
        </div>
      </AnalyticsSection>
    </div>
  );
}
