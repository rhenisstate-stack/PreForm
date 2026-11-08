"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { BarChart3, CheckCircle, Percent } from "lucide-react";
import type { LearnerScoreDistribution } from "@/lib/api-services";

export interface ScoreDistributionChartProps {
  distribution: LearnerScoreDistribution | null;
  isLoading?: boolean;
}

export function ScoreDistributionChart({ distribution, isLoading }: ScoreDistributionChartProps) {
  const bands = distribution?.bands || [];
  const median = distribution?.medianScorePercent ?? 0;
  const passRate = distribution?.passingRatePercent ?? 0;
  const total = distribution?.totalEvaluatedAttempts ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5" data-testid="score-distribution-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-foreground">Score Frequency Distribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Histogram clustering of test scores against the 70% passing competence benchmark
          </p>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
            <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded-lg">
              <CheckCircle className="h-3.5 w-3.5" />
              Pass Rate: {passRate.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              Median: <strong className="text-foreground">{median.toFixed(1)}%</strong>
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 w-full flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
          <span className="text-xs text-muted-foreground">Loading score distribution...</span>
        </div>
      ) : total === 0 ? (
        <div className="h-64 w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <BarChart3 className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">Awaiting Assessment Completion</h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Score distribution histograms populate automatically once you submit graded tests.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bands} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
              <XAxis
                dataKey="label"
                stroke="currentColor"
                className="text-[11px] text-muted-foreground"
                tickLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="text-[11px] text-muted-foreground"
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-popover p-3 shadow-lg text-xs space-y-1">
                        <p className="font-bold text-foreground">{data.label}</p>
                        <p className="text-muted-foreground">
                          Score Range: {data.minPercent}% - {data.maxPercent}%
                        </p>
                        <div className="border-t border-border/60 pt-1 flex justify-between gap-4 font-mono">
                          <span>Attempts: {data.count}</span>
                          <span className="font-bold text-teal-600 dark:text-teal-400">{data.percentage.toFixed(1)}% of total</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {bands.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.colorHex || "#0D9488"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
