"use client";

import * as React from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LearnerPerformanceOverview } from "@/lib/api-services";

export interface PerformanceKpiGridProps {
  overview: LearnerPerformanceOverview | null;
  isLoading?: boolean;
}

export function PerformanceKpiGrid({ overview, isLoading }: PerformanceKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/60 border border-border" />
        ))}
      </div>
    );
  }

  const accuracy = overview?.overallAccuracyPercent ?? 0;
  const totalAnswered = overview?.totalAnsweredQuestions ?? 0;
  const correctCount = overview?.correctCount ?? 0;
  const completionRate = overview?.completionRatePercent ?? 0;
  const completedAttempts = overview?.totalCompletedAttempts ?? 0;
  const startedAttempts = overview?.totalStartedAttempts ?? 0;
  const averageScore = overview?.averageScorePercent ?? 0;
  const studyMinutes = overview?.totalStudyDurationMinutes ?? 0;
  const studyHours = (studyMinutes / 60).toFixed(1);
  const readinessTier = overview?.currentReadinessTier || "Unassessed";
  const trendDelta = overview?.accuracyTrendDeltaPercent ?? 0;
  const trendDirection = overview?.trendDirection ?? "Neutral";

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "Very High":
        return { label: "Very High Readiness", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" };
      case "High":
        return { label: "High Readiness", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" };
      case "Borderline":
        return { label: "Borderline Readiness", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" };
      case "Low":
        return { label: "Remediation Required", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" };
      default:
        return { label: "Diagnostic Pending", bg: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" };
    }
  };

  const tierInfo = getTierBadge(readinessTier);

  return (
    <div className="space-y-4">
      {/* Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="performance-kpi-grid">
        {/* Metric 1: Overall Accuracy */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2 hover:border-teal-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Accuracy</span>
            <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-foreground">{accuracy.toFixed(1)}%</span>
            {trendDirection !== "Neutral" && (
              <span
                className={`inline-flex items-center text-xs font-semibold font-mono ${
                  trendDirection === "Up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {trendDirection === "Up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {trendDelta > 0 ? `+${trendDelta.toFixed(1)}%` : `${trendDelta.toFixed(1)}%`}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {correctCount} correct out of {totalAnswered} questions answered
          </p>
        </div>

        {/* Metric 2: Completion Rate */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2 hover:border-teal-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <FileCheck2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-foreground">{completionRate.toFixed(1)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {completedAttempts} completed of {startedAttempts} initiated attempts
          </p>
        </div>

        {/* Metric 3: Average Exam Score */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2 hover:border-teal-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Mean Exam Score</span>
            <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-foreground">
              {completedAttempts > 0 ? `${averageScore.toFixed(1)}%` : "—"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Across {completedAttempts} validated completed exam sets
          </p>
        </div>

        {/* Metric 4: Readiness & Study Time */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2 hover:border-teal-500/40 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Readiness Tier</span>
            <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className={`font-semibold text-xs border ${tierInfo.bg}`}>
              {tierInfo.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {studyHours} hrs logged active clinical practice
          </p>
        </div>
      </div>

      {/* Clinical Highlights Strip */}
      {(overview?.topStrengthCategory || overview?.primaryImprovementArea) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {overview.topStrengthCategory && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">Clinical Strength: </span>
                <span className="text-emerald-800 dark:text-emerald-300">{overview.topStrengthCategory}</span>
              </div>
            </div>
          )}
          {overview.primaryImprovementArea && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <span className="font-semibold text-amber-900 dark:text-amber-200">High-Yield Remediation Focus: </span>
                <span className="text-amber-800 dark:text-amber-300">{overview.primaryImprovementArea}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
