"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ListTodo,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  AnalyticsKpiCard,
  AnalyticsChartCard,
  BarComparisonChart,
} from "@/components/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReviewerOverviewDto } from "@/lib/api-services";

export interface ReviewerViewProps {
  data: ReviewerOverviewDto | null;
  loading: boolean;
  onRefresh?: () => void;
}

export function ReviewerView({ data, loading, onRefresh }: ReviewerViewProps) {
  const kpis = data?.kpis;

  return (
    <div className="space-y-8" data-testid="reviewer-view">
      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsKpiCard
          title="Assigned Review Queue"
          value={kpis?.assignedQueueCount ?? 0}
          subtitle="Clinical items awaiting your decision"
          icon={ListTodo}
          loading={loading}
          variant="amber"
        />
        <AnalyticsKpiCard
          title="Approved (This Month)"
          value={kpis?.approvedThisMonth ?? 0}
          subtitle="Cleared into active question bank"
          icon={CheckCircle2}
          loading={loading}
          variant="emerald"
        />
        <AnalyticsKpiCard
          title="Changes Requested"
          value={kpis?.rejectedThisMonth ?? 0}
          subtitle="Returned to author with feedback"
          icon={XCircle}
          loading={loading}
          variant="rose"
        />
        <AnalyticsKpiCard
          title="Avg Turnaround"
          value={`${kpis?.avgTurnaroundHours ? kpis.avgTurnaroundHours.toFixed(1) : "0.0"}h`}
          subtitle="Submission to approval latency"
          icon={Clock}
          loading={loading}
          variant="teal"
        />
      </div>

      {/* Review History and Assigned Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AnalyticsChartCard
            title="Review Decision Velocity"
            description="Approved vs revision requested outcomes"
            loading={loading}
            empty={!data?.reviewHistory?.length}
          >
            <BarComparisonChart
              data={data?.reviewHistory || []}
              xKey="label"
              series={[
                { key: "approved", name: "Approved", color: "#10B981" },
                { key: "rejected", name: "Returned", color: "#EF4444" },
              ]}
            />
          </AnalyticsChartCard>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Priority Review Queue</h4>
                  <p className="text-xs text-muted-foreground">Clinical review assignments ordered by urgency</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {data?.reviewItems?.length ?? 0} Active Tasks
                </Badge>
              </div>

              <div className="space-y-3 mt-4">
                {(!data?.reviewItems || data.reviewItems.length === 0) ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 text-teal-600 dark:text-teal-400 mx-auto mb-2 opacity-80" />
                    Review queue is completely clear. No pending clinical items.
                  </div>
                ) : (
                  data.reviewItems.map((item) => (
                    <div
                      key={item.questionId}
                      className="rounded-xl border border-border/40 bg-muted/20 p-3.5 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={item.priority === "High" ? "destructive" : "secondary"}
                            className="text-[10px] py-0 px-2 uppercase font-mono"
                          >
                            {item.priority} Priority
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono">
                            {item.itemType}
                          </Badge>
                          <span className="text-xs font-mono uppercase text-muted-foreground">
                            {item.pathway}
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-medium line-clamp-1">
                          {item.stemExcerpt}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Authored by <span className="text-foreground/80 font-medium">{item.author}</span> • Submitted{" "}
                          {new Date(item.submittedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Link href={`/admin/questions?id=${item.questionId}`}>
                          <Button size="sm" className="h-8 text-xs font-semibold">
                            Evaluate Item
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
