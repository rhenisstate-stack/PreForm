"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  AnalyticsKpiCard,
  AnalyticsChartCard,
  TrendChart,
  DonutDistributionChart,
} from "@/components/analytics";
import { Badge } from "@/components/ui/badge";
import type { ContentManagerOverviewDto } from "@/lib/api-services";

export interface ContentManagerViewProps {
  data: ContentManagerOverviewDto | null;
  loading: boolean;
  onRefresh?: () => void;
}

export function ContentManagerView({ data, loading, onRefresh }: ContentManagerViewProps) {
  const kpis = data?.kpis;

  const itemTypesDonut = React.useMemo(() => {
    if (!data?.questionsByItemType) return [];
    return data.questionsByItemType.map((t) => ({
      name: t.typeName,
      value: t.count,
    }));
  }, [data]);

  return (
    <div className="space-y-8" data-testid="content-manager-view">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsKpiCard
          title="Total Repository Items"
          value={kpis?.totalQuestions ?? 0}
          subtitle={`${kpis?.publishedQuestions ?? 0} active in question bank`}
          icon={FileQuestion}
          loading={loading}
          variant="primary"
        />
        <AnalyticsKpiCard
          title="In Review Queue"
          value={kpis?.inReviewQuestions ?? 0}
          subtitle="Items awaiting clinical sign-off"
          icon={AlertCircle}
          loading={loading}
          variant="amber"
        />
        <AnalyticsKpiCard
          title="Draft Items"
          value={kpis?.draftQuestions ?? 0}
          subtitle="In authoring stage"
          icon={FileText}
          loading={loading}
          variant="violet"
        />
        <AnalyticsKpiCard
          title="Study Guides"
          value={kpis?.totalStudyGuides ?? 0}
          subtitle={`${kpis?.publishedStudyGuides ?? 0} published modules`}
          icon={BookOpen}
          loading={loading}
          variant="teal"
        />
      </div>

      {/* Visualizations: Question Velocity & Item Format Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsChartCard
            title="Question Authoring & Publication Velocity"
            description="Comparison of newly authored items versus items cleared through review"
            loading={loading}
            empty={!data?.questionVelocity?.length}
          >
            <TrendChart
              data={data?.questionVelocity || []}
              xKey="date"
              series={[
                { key: "added", name: "Authored", color: "#8B5CF6", type: "line" },
                { key: "published", name: "Published", color: "#0D9488", type: "area" },
              ]}
            />
          </AnalyticsChartCard>
        </div>

        <div>
          <AnalyticsChartCard
            title="Question Type Breakdown"
            description="Next Gen NCLEX (NGN) clinical item format diversity"
            loading={loading}
            empty={itemTypesDonut.length === 0}
          >
            <DonutDistributionChart
              data={itemTypesDonut}
              centerLabel="Item Formats"
            />
          </AnalyticsChartCard>
        </div>
      </div>

      {/* Pending Review Queue Table */}
      {data?.pendingReviewQueue && data.pendingReviewQueue.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Content Pending Clinical Review</h4>
              <p className="text-xs text-muted-foreground">Priority queue for clinical reviewer turnaround</p>
            </div>
            <Link
              href="/admin/questions"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Open Queue <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs text-left">
              <thead className="text-muted-foreground uppercase border-b border-border/40 font-mono">
                <tr>
                  <th className="py-2 pr-4">Clinical Stem Excerpt</th>
                  <th className="py-2 px-3">Item Type</th>
                  <th className="py-2 px-3">Pathway</th>
                  <th className="py-2 px-3">Author</th>
                  <th className="py-2 px-3 text-right">Age in Queue</th>
                  <th className="py-2 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.pendingReviewQueue.map((item) => (
                  <tr key={item.questionId} className="hover:bg-muted/30">
                    <td className="py-2.5 pr-4 font-medium text-foreground max-w-xs truncate">
                      {item.stemExcerpt}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono">
                        {item.itemType}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 uppercase font-mono text-muted-foreground">
                      {item.pathway}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{item.author}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.daysInQueue > 7
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : item.daysInQueue > 3
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {item.daysInQueue}d
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <Link
                        href={`/admin/questions?id=${item.questionId}`}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Review <ArrowRight className="h-3 w-3" />
                      </Link>
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
