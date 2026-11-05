"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Send,
  HelpCircle,
  Clock,
  Layers,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BackendExamReadinessDto, ExamReadinessCheckItem } from "@/lib/api-services";

interface ExaminationReadinessTabProps {
  revisionId: string;
  lifecycleState: string;
  canPublish: boolean;
  onTriggerPublish?: () => void;
}

export function ExaminationReadinessTab({
  revisionId,
  lifecycleState,
  canPublish: userCanPublish,
  onTriggerPublish,
}: ExaminationReadinessTabProps) {
  const {
    data: readinessData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "examination", "readiness", revisionId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/readiness`);
      if (!res.ok) {
        throw new Error("Failed to load examination readiness report");
      }
      return res.json() as Promise<{ success: boolean; readiness: BackendExamReadinessDto }>;
    },
  });

  const readiness = readinessData?.readiness;
  const isBlocked = readiness?.overallStatus === "BLOCKED";
  const hasWarnings = readiness?.overallStatus === "NEEDS_ATTENTION";
  const isReady = readiness?.overallStatus === "READY";

  const getSeverityBadge = (severity: "PASS" | "WARN" | "BLOCK") => {
    switch (severity) {
      case "PASS":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
            <CheckCircle2 className="h-3 w-3 mr-1" /> PASS
          </Badge>
        );
      case "WARN":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-mono">
            <AlertTriangle className="h-3 w-3 mr-1" /> WARN
          </Badge>
        );
      case "BLOCK":
      default:
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-mono">
            <XCircle className="h-3 w-3 mr-1" /> BLOCK
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Publication Readiness & Quality Validation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-stage audit evaluating metadata completeness, blueprint sufficiency, question pool health, and policy boundaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading || isRefetching ? "animate-spin" : ""}`} />
            Re-evaluate
          </Button>

          {lifecycleState.toLowerCase() === "approved" && userCanPublish && (
            <Button
              size="sm"
              onClick={onTriggerPublish}
              disabled={isBlocked || !readiness?.canPublish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Publish Examination
            </Button>
          )}
        </div>
      </div>

      {/* Overall Status Card */}
      {readiness && (
        <div
          className={`p-5 rounded-xl border shadow-sm ${
            isBlocked
              ? "border-rose-300 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/20"
              : hasWarnings
              ? "border-amber-300 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20"
              : "border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {isBlocked ? (
                <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : hasWarnings ? (
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isBlocked
                    ? "Publication Gate: BLOCKED"
                    : hasWarnings
                    ? "Publication Gate: READY WITH WARNINGS"
                    : "Publication Gate: READY TO PUBLISH"}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {isBlocked
                    ? "Critical blocking issues were detected. All blocking checks must be resolved before this revision can be published."
                    : hasWarnings
                    ? "All critical requirements are met, but some non-blocking warnings were noted for your review."
                    : "All metadata, question pool quotas, and policy criteria have passed authoritative validation."}
                </p>
                <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Evaluated at: {new Date(readiness.evaluatedAtUtc).toLocaleString()}</span>
                  <span>Checks Run: {readiness.checks.length}</span>
                  <span>Can Publish: {readiness.canPublish ? "YES" : "NO"}</span>
                </div>
              </div>
            </div>
            <div>
              {getSeverityBadge(
                isBlocked ? "BLOCK" : hasWarnings ? "WARN" : "PASS"
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checklist Grid */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
          Readiness Checks & Audit Findings
        </h3>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Running automated readiness evaluation...
          </div>
        ) : !readiness?.checks || readiness.checks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No audit check results available.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {readiness.checks.map((check, idx) => (
              <div
                key={`${check.code}_${idx}`}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                      {check.area}
                    </Badge>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {check.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-0.5">
                    {check.message}
                  </p>
                </div>
                <div className="shrink-0">{getSeverityBadge(check.severity)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
