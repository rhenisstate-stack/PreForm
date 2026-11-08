"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Columns,
  Scale,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AttemptComparisonResponse } from "@/lib/api-services";

export interface AttemptComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: AttemptComparisonResponse | null;
  isLoading?: boolean;
}

export function AttemptComparisonModal({
  isOpen,
  onClose,
  comparison,
  isLoading,
}: AttemptComparisonModalProps) {
  if (!isOpen) return null;

  const att1 = comparison?.attempt1;
  const att2 = comparison?.attempt2;
  const scoreDelta = comparison?.scoreDeltaPercent ?? 0;
  const accDelta = comparison?.accuracyDeltaPercent ?? 0;
  const timeDelta = comparison?.timeDeltaMinutes ?? 0;
  const catDeltas = comparison?.categoryDeltas || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-foreground">Longitudinal Attempt Comparison</h3>
              <p className="text-xs text-muted-foreground">
                Side-by-side delta analysis between baseline and recent examination outcomes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close comparison modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="h-60 flex items-center justify-center animate-pulse">
            <span className="text-xs text-muted-foreground">Generating comparative metrics...</span>
          </div>
        ) : !att1 || !att2 ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
            <p>At least two completed assessment attempts are required to compute side-by-side deltas.</p>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive Delta Summary Banner */}
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                  Performance Trajectory Delta
                </span>
                <span
                  className={`inline-flex items-center text-sm font-bold font-mono ${
                    scoreDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {scoreDelta >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {scoreDelta >= 0 ? `+${scoreDelta.toFixed(1)}%` : `${scoreDelta.toFixed(1)}%`} Score Delta
                </span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed font-sans">{comparison.summaryText}</p>
            </div>

            {/* Side-by-Side Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Attempt 1 (Baseline / Previous) */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="space-y-0.5">
                  <Badge variant="outline" className="text-[10px] font-mono uppercase text-muted-foreground">
                    Baseline Attempt
                  </Badge>
                  <h4 className="text-sm font-bold text-foreground truncate">{att1.examTitle}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{att1.completedAt}</p>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-bold text-foreground">{att1.scorePercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span className="font-bold text-foreground">{att1.accuracyPercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Questions Correct:</span>
                    <span className="text-foreground">{att1.correctCount} / {att1.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="text-foreground">{att1.durationMinutes} min</span>
                  </div>
                </div>
              </div>

              {/* Attempt 2 (Comparison / Latest) */}
              <div className="rounded-xl border border-teal-500/40 bg-teal-500/5 p-4 space-y-3">
                <div className="space-y-0.5">
                  <Badge variant="outline" className="text-[10px] font-mono uppercase text-teal-700 dark:text-teal-300 border-teal-500/30">
                    Target Attempt
                  </Badge>
                  <h4 className="text-sm font-bold text-foreground truncate">{att2.examTitle}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{att2.completedAt}</p>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-teal-500/20 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-bold text-teal-700 dark:text-teal-300">{att2.scorePercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span className="font-bold text-teal-700 dark:text-teal-300">{att2.accuracyPercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Questions Correct:</span>
                    <span className="text-foreground">{att2.correctCount} / {att2.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="text-foreground">{att2.durationMinutes} min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Deltas Breakdown Table */}
            {catDeltas.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Client Needs Category Deltas
                </h4>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground font-mono uppercase text-[10px] border-b border-border">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Attempt 1</th>
                        <th className="p-3 text-right">Attempt 2</th>
                        <th className="p-3 text-right">Growth Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {catDeltas.map((cat) => {
                        const isPos = cat.deltaPercent > 0;
                        const isZero = cat.deltaPercent === 0;
                        return (
                          <tr key={cat.categoryCode} className="hover:bg-muted/30">
                            <td className="p-3">
                              <span className="font-semibold text-foreground">{cat.categoryName}</span>
                              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">({cat.categoryCode})</span>
                            </td>
                            <td className="p-3 text-right font-mono">{cat.attempt1AccuracyPercent.toFixed(1)}%</td>
                            <td className="p-3 text-right font-mono font-semibold">{cat.attempt2AccuracyPercent.toFixed(1)}%</td>
                            <td className="p-3 text-right font-mono font-bold">
                              <span
                                className={
                                  isZero
                                    ? "text-muted-foreground"
                                    : isPos
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }
                              >
                                {isPos ? `+${cat.deltaPercent.toFixed(1)}%` : `${cat.deltaPercent.toFixed(1)}%`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
