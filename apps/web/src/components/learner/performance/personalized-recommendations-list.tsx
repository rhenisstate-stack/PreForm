"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LearnerRecommendation } from "@/lib/api-services";

export interface PersonalizedRecommendationsListProps {
  recommendations: LearnerRecommendation[];
  onStartIntervention?: (rec: LearnerRecommendation) => void;
  onUpdateStatus?: (id: string, status: "New" | "InProgress" | "Completed" | "Dismissed") => void;
  onActionClick?: (actionHref: string) => void;
  isLoading?: boolean;
}

export function PersonalizedRecommendationsList({
  recommendations,
  onStartIntervention,
  onUpdateStatus,
  onActionClick,
  isLoading,
}: PersonalizedRecommendationsListProps) {
  const activeRecs = recommendations.filter((r) => r.status !== "Dismissed");

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return { label: "High Priority", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" };
      case "Medium":
        return { label: "Medium Priority", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" };
      default:
        return { label: "Advisory", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" };
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5" data-testid="personalized-recommendations-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-serif font-bold text-foreground">AI-Driven Clinical Recommendations</h3>
            <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Targeted study interventions synthesized from your recurring diagnostic error patterns and knowledge gaps
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/50 border border-border" />
          ))}
        </div>
      ) : activeRecs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-70" />
          <h4 className="text-sm font-semibold text-foreground">All Clinical Recommendations Addressed</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            You are operating at strong clinical competency. Continue routine practice assessments to maintain peak readiness.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeRecs.map((rec) => {
            const pInfo = getPriorityBadge(rec.priority);
            const isInProgress = rec.status === "InProgress";
            const isCompleted = rec.status === "Completed";

            return (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  isInProgress
                    ? "border-teal-500/50 bg-teal-500/5"
                    : isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-card hover:border-teal-500/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] font-mono border ${pInfo.bg}`}>
                      {pInfo.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono bg-muted text-muted-foreground">
                      {rec.category}
                    </Badge>
                    {isInProgress && (
                      <Badge variant="outline" className="text-[10px] font-mono bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
                        Intervention Active
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                        Resolved
                      </Badge>
                    )}
                  </div>

                  {/* Dismiss / Mark resolved actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
                    {onUpdateStatus && rec.status !== "Completed" && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(rec.id, "Completed")}
                        className="text-muted-foreground hover:text-foreground text-[11px] underline"
                      >
                        Mark Done
                      </button>
                    )}
                    {onUpdateStatus && rec.status !== "Dismissed" && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(rec.id, "Dismissed")}
                        className="text-muted-foreground hover:text-rose-600 text-[11px] p-1"
                        title="Dismiss recommendation"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">{rec.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                </div>

                {/* Evidence reasoning */}
                {rec.evidenceReasoning && (
                  <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2.5 border border-border/50">
                    <span className="font-semibold text-foreground">Diagnostic Evidence: </span>
                    {rec.evidenceReasoning}
                  </div>
                )}

                {/* Action CTAs */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Created {new Date(rec.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2">
                    {onStartIntervention && !isInProgress && !isCompleted && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onStartIntervention(rec)}
                        className="h-8 rounded-lg text-xs gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
                      >
                        <Play className="h-3 w-3" />
                        <span>Track Intervention</span>
                      </Button>
                    )}

                    {rec.actionHref && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onActionClick ? onActionClick(rec.actionHref!) : window.location.assign(rec.actionHref!)}
                        className="h-8 rounded-lg text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <span>{rec.actionLabel || "Launch Activity"}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
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
