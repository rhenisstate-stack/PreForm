"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  Layers,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import {
  AnalyticsSection,
  AnalyticsKpiCard,
  AnalyticsChartCard,
  BarComparisonChart,
} from "@/components/analytics";
import { Badge } from "@/components/ui/badge";
import type { ExamManagerOverviewDto } from "@/lib/api-services";

export interface ExamManagerViewProps {
  data: ExamManagerOverviewDto | null;
  loading: boolean;
  onRefresh?: () => void;
}

export function ExamManagerView({ data, loading, onRefresh }: ExamManagerViewProps) {
  const kpis = data?.kpis;

  return (
    <div className="space-y-8" data-testid="exam-manager-view">
      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsKpiCard
          title="Total Examinations"
          value={kpis?.totalExaminations ?? 0}
          subtitle={`${kpis?.activeExaminations ?? 0} active in catalogue`}
          icon={Award}
          loading={loading}
          variant="primary"
        />
        <AnalyticsKpiCard
          title="Draft / Staging"
          value={kpis?.draftsCount ?? 0}
          subtitle={`${kpis?.scheduledCount ?? 0} scheduled for publication`}
          icon={Layers}
          loading={loading}
          variant="amber"
        />
        <AnalyticsKpiCard
          title="Attempts (Period)"
          value={kpis?.totalAttemptsWindow ?? 0}
          subtitle="Candidate assessment sessions"
          icon={Clock}
          loading={loading}
          variant="teal"
        />
        <AnalyticsKpiCard
          title="Cohort Pass Rate"
          value={`${kpis?.passRateWindow ? kpis.passRateWindow.toFixed(1) : "0.0"}%`}
          subtitle={`Avg Score: ${kpis?.averageScoreWindow ? kpis.averageScoreWindow.toFixed(1) : "0.0"}%`}
          icon={Percent}
          loading={loading}
          variant="emerald"
        />
      </div>

      {/* Pathway Breakdown and Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AnalyticsChartCard
            title="Attempts by Pathway"
            description="Comparison of assessment throughput between RN and PN cohorts"
            loading={loading}
            empty={!data?.pathwayExamDistribution?.length}
          >
            <BarComparisonChart
              data={
                data?.pathwayExamDistribution?.map((p) => ({
                  name: p.pathway.toUpperCase(),
                  attempts: p.totalAttempts,
                  exams: p.activeExams,
                })) || []
              }
              xKey="name"
              series={[
                { key: "attempts", name: "Attempts", color: "#0D9488" },
                { key: "exams", name: "Active Exams", color: "#142B4A" },
              ]}
            />
          </AnalyticsChartCard>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Active Examination Pipeline</h4>
                  <p className="text-xs text-muted-foreground">Operational status, throughput, and average scores</p>
                </div>
                <Link
                  href="/admin/examinations"
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  Manage All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs text-left">
                  <thead className="text-muted-foreground uppercase border-b border-border/40 font-mono">
                    <tr>
                      <th className="py-2 pr-4">Code / Title</th>
                      <th className="py-2 px-3">Pathway</th>
                      <th className="py-2 px-3 text-right">Attempts</th>
                      <th className="py-2 px-3 text-right">Avg Score</th>
                      <th className="py-2 px-3 text-right">Pass Rate</th>
                      <th className="py-2 pl-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-mono">
                    {data?.examPerformancePipeline?.map((exam) => (
                      <tr key={exam.examId} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-4 font-sans font-medium text-foreground">
                          <span className="font-mono text-muted-foreground mr-1">[{exam.code}]</span>
                          {exam.title}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-muted-foreground">{exam.pathway}</td>
                        <td className="py-2.5 px-3 text-right text-foreground">{exam.totalAttempts.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">{exam.avgScore.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-teal-600 dark:text-teal-400">
                          {exam.passRate.toFixed(1)}%
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <Badge variant="outline" className="text-[10px] py-0 px-2 uppercase">
                            {exam.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attempts Feed */}
      {data?.recentAttempts && data.recentAttempts.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
          <h4 className="text-sm font-semibold text-foreground mb-3">Live Assessment Activity Stream</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-muted-foreground uppercase border-b border-border/40 font-mono">
                <tr>
                  <th className="py-2 pr-4">Candidate</th>
                  <th className="py-2 px-3">Examination</th>
                  <th className="py-2 px-3">Pathway</th>
                  <th className="py-2 px-3 text-right">Score</th>
                  <th className="py-2 px-3 text-right">Status</th>
                  <th className="py-2 pl-3 text-right">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-mono">
                {data.recentAttempts.map((attempt) => (
                  <tr key={attempt.attemptId} className="hover:bg-muted/30">
                    <td className="py-2.5 pr-4 text-foreground font-medium">{attempt.candidateMasked}</td>
                    <td className="py-2.5 px-3 font-sans text-foreground">{attempt.examTitle}</td>
                    <td className="py-2.5 px-3 uppercase text-muted-foreground">{attempt.pathway}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">{attempt.score}%</td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          attempt.status === "Completed"
                            ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {attempt.status}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right text-muted-foreground">
                      {new Date(attempt.startedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
