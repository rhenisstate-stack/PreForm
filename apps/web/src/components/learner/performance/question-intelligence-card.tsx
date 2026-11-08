"use client";

import * as React from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QuestionIntelligenceSummary } from "@/lib/api-services";

export interface QuestionIntelligenceCardProps {
  summary: QuestionIntelligenceSummary | null;
  pathway: "rn" | "pn" | "all";
  isLoading?: boolean;
}

export function QuestionIntelligenceCard({ summary, pathway, isLoading }: QuestionIntelligenceCardProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<"types" | "difficulty" | "ncjmm" | "errors">("types");

  const questionTypes = summary?.questionTypes || [];
  const difficulties = summary?.difficulties || [];
  const ncjmmSteps = summary?.clinicalJudgmentSteps || [];
  const recurringErrors = summary?.recurringErrors || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6" data-testid="question-intelligence-card">
      {/* Header and Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-serif font-bold text-foreground">Question-Level Intelligence &amp; Cognitive Patterns</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Diagnostic breakdown across question types, difficulty tiers, clinical judgment steps, and recurring error traps
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab("types")}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              activeSubTab === "types" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Question Types ({questionTypes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("difficulty")}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              activeSubTab === "difficulty" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Difficulty
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("ncjmm")}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              activeSubTab === "ncjmm" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {pathway === "pn" ? "Clinical Steps" : "NCJMM Model"}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("errors")}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              activeSubTab === "errors" ? "bg-card text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Error Traps ({recurringErrors.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-60 w-full flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
          <span className="text-xs text-muted-foreground">Analyzing question response intelligence...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: QUESTION TYPES */}
          {activeSubTab === "types" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {questionTypes.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No question type telemetry available yet.
                </div>
              ) : (
                questionTypes.map((qt) => {
                  const acc = qt.totalQuestions > 0 ? qt.accuracyPercent : 0;
                  const isHigh = acc >= 75;
                  const isLow = acc < 60 && qt.totalQuestions >= 3;
                  return (
                    <div
                      key={qt.questionTypeKey}
                      className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 hover:border-teal-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{qt.displayName}</span>
                        {qt.isNgn && (
                          <Badge variant="outline" className="text-[10px] font-mono bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
                            NGN Format
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between font-mono">
                        <span
                          className={`text-xl font-bold ${
                            isHigh
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isLow
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground"
                          }`}
                        >
                          {qt.totalQuestions > 0 ? `${acc.toFixed(1)}%` : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {qt.correctCount}/{qt.totalQuestions} correct
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${
                            isHigh ? "bg-emerald-500" : isLow ? "bg-rose-500" : "bg-teal-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, acc))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: DIFFICULTY TIERS */}
          {activeSubTab === "difficulty" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {difficulties.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No difficulty breakdown available yet.
                </div>
              ) : (
                difficulties.map((d) => (
                  <div
                    key={d.difficulty}
                    className="rounded-xl border border-border bg-muted/30 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{d.difficulty} Tier</span>
                      <span className="text-muted-foreground font-mono">{d.totalQuestions} Qs</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {d.totalQuestions > 0 ? `${d.accuracyPercent.toFixed(1)}%` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.correctCount} correct responses
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-teal-500"
                        style={{ width: `${Math.min(100, Math.max(0, d.accuracyPercent))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CLINICAL JUDGMENT / NCJMM */}
          {activeSubTab === "ncjmm" && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Performance mapped to the NCSBN Clinical Judgment Measurement Model (NCJMM) cognitive operations:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ncjmmSteps.map((step) => (
                  <div
                    key={step.stepKey}
                    className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 hover:border-teal-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                        Step {step.orderIndex}
                      </span>
                      <span className="text-muted-foreground font-mono">{step.totalQuestions} Qs</span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{step.stepName}</h4>
                    <div className="flex items-baseline justify-between font-mono text-xs">
                      <span className="text-lg font-bold text-foreground">
                        {step.totalQuestions > 0 ? `${step.accuracyPercent.toFixed(1)}%` : "—"}
                      </span>
                      <span className="text-muted-foreground">
                        {step.correctCount}/{step.totalQuestions} correct
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-teal-500"
                        style={{ width: `${Math.min(100, Math.max(0, step.accuracyPercent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RECURRING ERROR DETECTION CLUSTERS */}
          {activeSubTab === "errors" && (
            <div className="space-y-3">
              {recurringErrors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                  No recurring error traps detected in your recent practice responses! Excellent clinical discrimination.
                </div>
              ) : (
                recurringErrors.map((err) => {
                  const isCrit = err.impactLevel === "Critical";
                  return (
                    <div
                      key={err.patternKey}
                      className={`rounded-xl border p-4 space-y-2 ${
                        isCrit
                          ? "border-rose-500/30 bg-rose-500/5"
                          : "border-amber-500/30 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <AlertCircle
                            className={`h-4 w-4 shrink-0 ${
                              isCrit ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                            }`}
                          />
                          <h4 className="text-sm font-bold text-foreground">{err.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono uppercase ${
                              isCrit
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {err.impactLevel} Impact ({err.affectedQuestionCount} Qs)
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{err.description}</p>
                      <div className="pt-1 border-t border-border/40 flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <Zap className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>Recommended Remediation: {err.suggestedIntervention}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
