"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart2,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CategoryPerformanceIntelligence } from "@/lib/api-services";

export interface ClientNeedsIntelligenceCardProps {
  categories: CategoryPerformanceIntelligence[];
  pathway: "rn" | "pn" | "all";
  onPracticeCategory?: (categoryCode: string) => void;
  isLoading?: boolean;
}

export function ClientNeedsIntelligenceCard({
  categories,
  pathway,
  onPracticeCategory,
  isLoading,
}: ClientNeedsIntelligenceCardProps) {
  const [sortBy, setSortBy] = React.useState<"ncsbn" | "weakest" | "strongest">("weakest");

  const sortedCategories = React.useMemo(() => {
    const list = [...categories];
    if (sortBy === "weakest") {
      return list.sort((a, b) => a.accuracyPercent - b.accuracyPercent);
    }
    if (sortBy === "strongest") {
      return list.sort((a, b) => b.accuracyPercent - a.accuracyPercent);
    }
    return list; // default server order (official NCSBN order)
  }, [categories, sortBy]);

  const getClassificationBadge = (cat: CategoryPerformanceIntelligence) => {
    switch (cat.classification) {
      case "Strong":
        return {
          label: "Strong Mastery",
          badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          barColor: "bg-emerald-500",
        };
      case "Developing":
        return {
          label: "Developing",
          badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
          barColor: "bg-blue-500",
        };
      case "NeedsAttention":
        return {
          label: "Needs Priority Focus",
          badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
          barColor: "bg-rose-500",
        };
      default:
        return {
          label: "Insufficient Data (<5 Qs)",
          badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
          barColor: "bg-slate-400 dark:bg-slate-600",
        };
    }
  };

  const pathwayTitle = pathway === "pn" ? "NCLEX-PN Practical Nursing" : "NCLEX-RN Registered Nursing";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6" data-testid="client-needs-intelligence-card">
      {/* Header and Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-serif font-bold text-foreground">NCLEX Client Needs Category Mastery</h3>
            <Badge variant="outline" className="text-[10px] font-mono uppercase text-teal-700 dark:text-teal-300">
              {pathway === "pn" ? "PN Taxonomy" : "RN Taxonomy"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official NCSBN Client Needs subcategory breakdown for {pathwayTitle}
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs text-muted-foreground">
          <span>Sort:</span>
          <div className="inline-flex rounded-lg bg-muted/60 p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => setSortBy("weakest")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                sortBy === "weakest" ? "bg-card text-foreground shadow-2xs font-semibold" : "hover:text-foreground"
              }`}
            >
              Needs Focus
            </button>
            <button
              type="button"
              onClick={() => setSortBy("strongest")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                sortBy === "strongest" ? "bg-card text-foreground shadow-2xs font-semibold" : "hover:text-foreground"
              }`}
            >
              Strongest
            </button>
            <button
              type="button"
              onClick={() => setSortBy("ncsbn")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                sortBy === "ncsbn" ? "bg-card text-foreground shadow-2xs font-semibold" : "hover:text-foreground"
              }`}
            >
              NCSBN Order
            </button>
          </div>
        </div>
      </div>

      {/* Category Intelligence List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 border border-border" />
          ))}
        </div>
      ) : sortedCategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">No Category Performance Data Logged</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Complete practice questions across different clinical categories to view detailed mastery metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map((cat) => {
            const classInfo = getClassificationBadge(cat);
            return (
              <div
                key={cat.categoryCode}
                className="group rounded-xl border border-border bg-muted/30 p-4 hover:border-teal-500/40 hover:bg-muted/50 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                      {cat.categoryCode}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">{cat.categoryName}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[11px] font-semibold border ${classInfo.badgeClass}`}>
                      {classInfo.label}
                    </Badge>
                    <span className="text-sm font-mono font-bold text-foreground">
                      {cat.totalQuestions > 0 ? `${cat.accuracyPercent.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Peer Benchmark */}
                <div className="space-y-1.5">
                  <div className="relative h-2 w-full rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${classInfo.barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, cat.accuracyPercent))}%` }}
                    />
                    {/* Peer Benchmark Tick */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-foreground/60 shadow-xs"
                      style={{ left: `${cat.peerBenchmarkAccuracyPercent}%` }}
                      title={`Peer Cohort Benchmark: ${cat.peerBenchmarkAccuracyPercent}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span>
                      {cat.correctCount} / {cat.totalQuestions} questions correct
                    </span>
                    <span>
                      Cohort Mean: {cat.peerBenchmarkAccuracyPercent}% (
                      <span
                        className={
                          cat.deltaFromPeerPercent >= 0
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-rose-600 dark:text-rose-400 font-semibold"
                        }
                      >
                        {cat.deltaFromPeerPercent >= 0 ? `+${cat.deltaFromPeerPercent}%` : `${cat.deltaFromPeerPercent}%`}
                      </span>
                      )
                    </span>
                  </div>
                </div>

                {/* Suggested Action & Quick Launch */}
                {cat.recommendedRemediationAction && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{cat.recommendedRemediationAction}</span>
                    </div>
                    {onPracticeCategory && (
                      <button
                        type="button"
                        onClick={() => onPracticeCategory(cat.categoryCode)}
                        className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-semibold shrink-0"
                      >
                        <span>Practice Drill</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
