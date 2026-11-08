"use client";

import * as React from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LearnerIntervention } from "@/lib/api-services";

export interface InterventionsTrackerProps {
  interventions: LearnerIntervention[];
  isLoading?: boolean;
}

export function InterventionsTracker({ interventions, isLoading }: InterventionsTrackerProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5" data-testid="interventions-tracker-card">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-serif font-bold text-foreground">Learning Intervention Outcomes</h3>
          <Badge variant="outline" className="text-[10px] font-mono text-teal-700 dark:text-teal-300">
            Remediation Delta
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quantifiable before-and-after accuracy measurement tracking the efficacy of targeted remediation actions
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 border border-border" />
          ))}
        </div>
      ) : interventions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">No Active Interventions</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Click &quot;Track Intervention&quot; on any recommendation above to begin monitoring your accuracy improvements.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interventions.map((item) => {
            const hasPost = item.postInterventionAccuracyPercent !== null && item.postInterventionAccuracyPercent !== undefined;
            const delta = item.deltaAccuracyPercent ?? 0;
            const isPos = delta > 0;
            const isDone = item.status === "Completed";

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 hover:border-teal-500/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    {item.targetCategoryName && (
                      <span className="text-xs font-mono text-muted-foreground">
                        ({item.targetCategoryName})
                      </span>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono self-start sm:self-auto ${
                      isDone
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                    }`}
                  >
                    {item.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/40 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Baseline Accuracy</span>
                    <span className="font-bold text-foreground text-sm">
                      {item.baselineAccuracyPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Post-Intervention</span>
                    <span className="font-bold text-foreground text-sm">
                      {hasPost ? `${item.postInterventionAccuracyPercent!.toFixed(1)}%` : "Awaiting Retest"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Measured Delta</span>
                    {hasPost ? (
                      <span
                        className={`font-bold text-sm inline-flex items-center ${
                          isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPos ? <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> : null}
                        {isPos ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Started</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(item.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
