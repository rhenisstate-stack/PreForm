"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  FileCheck2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LearnerPerformanceOverview } from "@/lib/api-services";

export interface CompactPerformanceCardProps {
  overview: LearnerPerformanceOverview | null;
  pathway: "rn" | "pn";
  destinationHref?: string;
  isLoading?: boolean;
}

export function CompactPerformanceCard({
  overview,
  pathway,
  destinationHref,
  isLoading,
}: CompactPerformanceCardProps) {
  const targetHref = destinationHref || (pathway === "pn" ? "/learner/nclex-pn/performance" : "/learner/nclex-rn/performance");

  const accuracy = overview?.overallAccuracyPercent ?? 0;
  const completedAttempts = overview?.totalCompletedAttempts ?? 0;
  const answeredQuestions = overview?.totalAnsweredQuestions ?? 0;
  const trendDelta = overview?.accuracyTrendDeltaPercent ?? 0;
  const trendDirection = overview?.trendDirection ?? "Neutral";
  const improvementArea = overview?.primaryImprovementArea || "Continue standard practice assessments";

  return (
    <section
      data-testid={`compact-performance-overview-${pathway}`}
      aria-labelledby={`compact-performance-heading-${pathway}`}
      className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-card to-card p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Performance Intelligence Snapshot
            </span>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground uppercase">
              {pathway === "pn" ? "NCLEX-PN" : "NCLEX-RN"}
            </Badge>
          </div>
          <h3 id={`compact-performance-heading-${pathway}`} className="text-base sm:text-lg font-serif font-bold text-foreground">
            Current Clinical Preparedness &amp; Longitudinal Growth
          </h3>
        </div>

        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-xl font-semibold gap-1.5 self-start sm:self-auto shrink-0 shadow-xs">
          <Link href={targetHref} title="Open complete Performance Intelligence destination">
            <span>View Full Intelligence</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="h-20 w-full bg-muted/40 rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Accuracy & Trend */}
          <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Overall Accuracy</span>
              <Target className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-bold text-foreground">{accuracy.toFixed(1)}%</span>
              {trendDirection !== "Neutral" && (
                <span
                  className={`inline-flex items-center text-[11px] font-bold font-mono ${
                    trendDirection === "Up" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {trendDirection === "Up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {trendDelta > 0 ? `+${trendDelta.toFixed(1)}%` : `${trendDelta.toFixed(1)}%`}
                </span>
              )}
            </div>
          </div>

          {/* Completed Tests */}
          <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Completed Tests</span>
              <FileCheck2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-serif font-bold text-foreground">{completedAttempts}</span>
            <p className="text-[10px] text-muted-foreground">Server authoritative</p>
          </div>

          {/* Questions Answered */}
          <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Questions Answered</span>
              <Activity className="h-3.5 w-3.5 text-secondary" />
            </div>
            <span className="text-2xl font-serif font-bold text-foreground">{answeredQuestions}</span>
            <p className="text-[10px] text-muted-foreground">Across all attempts</p>
          </div>

          {/* Readiness Tier */}
          <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Readiness Tier</span>
              <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-sm font-bold text-teal-700 dark:text-teal-300 block pt-1 font-mono">
              {overview?.currentReadinessTier || "Unassessed"}
            </span>
            <p className="text-[10px] text-muted-foreground">NCSBN benchmark</p>
          </div>
        </div>
      )}

      {/* Primary Improvement Focus Callout */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 truncate">
          <span className="font-semibold text-foreground">Priority Improvement Area: </span>
          <span>{improvementArea}</span>
        </div>
        <Link
          href={targetHref}
          className="text-teal-600 dark:text-teal-400 hover:underline font-semibold text-[11px] shrink-0"
        >
          View Recommendations →
        </Link>
      </div>
    </section>
  );
}
