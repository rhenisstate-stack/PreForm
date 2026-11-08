"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, AlertCircle } from "lucide-react";
import type { PerformanceTrendSeries } from "@/lib/api-services";

export interface PerformanceTrendsChartProps {
  trendSeries: PerformanceTrendSeries | null;
  timeframe: string;
  onTimeframeChange: (timeframe: "7d" | "30d" | "90d" | "6m" | "all") => void;
  isLoading?: boolean;
}

export function PerformanceTrendsChart({
  trendSeries,
  timeframe,
  onTimeframeChange,
  isLoading,
}: PerformanceTrendsChartProps) {
  const points = trendSeries?.points || [];
  const growth = trendSeries?.scoreGrowthPercent ?? 0;
  const avgScore = trendSeries?.overallAverageScore ?? 0;

  const timeframeOptions: Array<{ key: "7d" | "30d" | "90d" | "6m" | "all"; label: string }> = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
    { key: "6m", label: "6 Months" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5" data-testid="performance-trends-card">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-foreground">Longitudinal Performance Trajectory</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sequential examination scores and cumulative clinical accuracy over time
          </p>
        </div>

        {/* Timeframe Pill Selector */}
        <div className="inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/60 self-start sm:self-auto">
          {timeframeOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onTimeframeChange(opt.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeframe === opt.key
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory Insights Strip */}
      {points.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
          <div className="flex items-center gap-1.5 text-foreground">
            <span className="text-muted-foreground">Mean Score:</span>
            <span className="font-bold">{avgScore.toFixed(1)}%</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Score Trajectory:</span>
            <span
              className={`inline-flex items-center font-bold ${
                growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {growth >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
              {growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`}
            </span>
          </div>
          <span className="text-muted-foreground">•</span>
          <div className="text-muted-foreground">
            Evaluated Attempts: <span className="text-foreground font-bold">{points.length}</span>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      {isLoading ? (
        <div className="h-72 w-full flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
          <span className="text-xs text-muted-foreground">Loading performance telemetry...</span>
        </div>
      ) : points.length === 0 ? (
        <div className="h-72 w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <Calendar className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">No Practice Records in Selected Timeframe</h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Complete assessment attempts or adjust the filter above to visualize your longitudinal progress.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
              <XAxis
                dataKey="dateLabel"
                stroke="currentColor"
                className="text-[10px] text-muted-foreground"
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="currentColor"
                className="text-[10px] text-muted-foreground"
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-popover p-3 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                        <p className="font-bold text-foreground truncate">{data.examTitle}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">{data.timestamp}</p>
                        <div className="border-t border-border/60 pt-1.5 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Exam Score:</span>
                            <span className="font-semibold text-teal-600 dark:text-teal-400 font-mono">
                              {data.scorePercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cumulative Accuracy:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                              {data.cumulativeAccuracyPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Questions: {data.questionsCount}</span>
                            <span>Duration: {data.durationMinutes}m</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ fontSize: "11px", paddingTop: "-10px" }}
              />
              <ReferenceLine
                y={70}
                stroke="#0D9488"
                strokeDasharray="4 4"
                label={{ value: "Passing Threshold (70%)", fill: "#0D9488", fontSize: 10, position: "insideBottomLeft" }}
              />
              <Line
                type="monotone"
                dataKey="scorePercent"
                name="Exam Score %"
                stroke="#142B4A"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#142B4A" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="cumulativeAccuracyPercent"
                name="Cumulative Accuracy %"
                stroke="#0D9488"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: "#0D9488" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
