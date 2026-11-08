"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Activity,
  Award,
  AlertTriangle,
  ArrowRight,
  Send,
} from "lucide-react";
import {
  AnalyticsKpiCard,
  AnalyticsChartCard,
  BarComparisonChart,
  HorizontalRankingChart,
} from "@/components/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InstructorOverviewDto } from "@/lib/api-services";

export interface InstructorViewProps {
  data: InstructorOverviewDto | null;
  loading: boolean;
  onRefresh?: () => void;
}

export function InstructorView({ data, loading, onRefresh }: InstructorViewProps) {
  const kpis = data?.kpis;

  const domainRankingItems = React.useMemo(() => {
    if (!data?.domainMastery) return [];
    return data.domainMastery.map((d) => ({
      label: d.domainName,
      value: d.cohortAvgScore,
      benchmark: d.benchmarkTarget,
      status: (d.cohortAvgScore >= d.benchmarkTarget
        ? "mastered"
        : d.cohortAvgScore >= d.benchmarkTarget - 15
        ? "developing"
        : "needs_improvement") as "mastered" | "developing" | "needs_improvement",
    }));
  }, [data]);

  return (
    <div className="space-y-8" data-testid="instructor-view">
      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsKpiCard
          title="Assigned Cohort"
          value={kpis?.assignedCohortLearners ?? 0}
          subtitle="Enrolled nursing candidates"
          icon={Users}
          loading={loading}
          variant="primary"
        />
        <AnalyticsKpiCard
          title="7-Day Active"
          value={kpis?.activeLearners7d ?? 0}
          subtitle="Practiced assessments this week"
          icon={Activity}
          loading={loading}
          variant="teal"
        />
        <AnalyticsKpiCard
          title="Cohort Average"
          value={`${kpis?.averageCohortScore ? kpis.averageCohortScore.toFixed(1) : "0.0"}%`}
          subtitle="Across all practice attempts"
          icon={Award}
          loading={loading}
          variant="emerald"
        />
        <AnalyticsKpiCard
          title="At-Risk Learners"
          value={kpis?.atRiskLearnersCount ?? 0}
          subtitle="Triggering remediation thresholds"
          icon={AlertTriangle}
          loading={loading}
          variant="rose"
        />
      </div>

      {/* Visualizations: Score Distribution Deciles & Domain Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <AnalyticsChartCard
            title="Cohort Score Distribution (Deciles)"
            description="Number of learners grouped across clinical performance score bands"
            loading={loading}
            empty={!data?.scoreDistribution?.length}
          >
            <BarComparisonChart
              data={data?.scoreDistribution || []}
              xKey="scoreBand"
              series={[{ key: "learnerCount", name: "Learners", color: "#142B4A" }]}
            />
          </AnalyticsChartCard>
        </div>

        <div>
          <AnalyticsChartCard
            title="Curriculum Domain Mastery Ranking"
            description="Average cohort score across core NCLEX client needs categories"
            loading={loading}
            empty={domainRankingItems.length === 0}
          >
            <HorizontalRankingChart
              items={domainRankingItems}
              benchmark={75}
              benchmarkLabel="Target Mastery (75%)"
            />
          </AnalyticsChartCard>
        </div>
      </div>

      {/* At-Risk Candidate Alert Table */}
      {data?.atRiskLearners && data.atRiskLearners.length > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <h4 className="text-sm font-semibold text-foreground">
                Clinical Remediation &amp; At-Risk Alerts
              </h4>
            </div>
            <Badge variant="destructive" className="font-mono text-xs">
              {data.atRiskLearners.length} Candidates Requiring Intervention
            </Badge>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs text-left">
              <thead className="text-muted-foreground uppercase border-b border-border/40 font-mono">
                <tr>
                  <th className="py-2 pr-4">Candidate</th>
                  <th className="py-2 px-3">Pathway</th>
                  <th className="py-2 px-3 text-right">Attempts</th>
                  <th className="py-2 px-3 text-right">Avg Score</th>
                  <th className="py-2 px-3">Primary Risk Factor</th>
                  <th className="py-2 px-3 text-right">Last Active</th>
                  <th className="py-2 pl-3 text-right">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-mono">
                {data.atRiskLearners.map((learner) => (
                  <tr key={learner.learnerId} className="hover:bg-muted/30">
                    <td className="py-2.5 pr-4 text-foreground font-sans font-medium">{learner.maskedName}</td>
                    <td className="py-2.5 px-3 uppercase text-muted-foreground">{learner.pathway}</td>
                    <td className="py-2.5 px-3 text-right text-foreground">{learner.attemptsCount}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {learner.avgScore.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-sans">
                        {learner.riskFactor}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {new Date(learner.lastActiveAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs font-semibold gap-1">
                        <Send className="h-3 w-3" /> Remediate
                      </Button>
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
