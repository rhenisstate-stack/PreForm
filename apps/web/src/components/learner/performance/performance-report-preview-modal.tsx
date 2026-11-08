"use client";

import * as React from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import type { LearnerPerformanceReport } from "@/lib/api-services";

export interface PerformanceReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: LearnerPerformanceReport | null;
  pathway: string;
  timeframe: string;
  isLoading?: boolean;
}

export function PerformanceReportPreviewModal({
  isOpen,
  onClose,
  report,
  pathway,
  timeframe,
  isLoading,
}: PerformanceReportPreviewModalProps) {
  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    const q = new URLSearchParams({ pathway, timeframe });
    window.open(`/api/learner/reports/performance/pdf?${q.toString()}`, "_blank");
  };

  const handleDownloadCsv = () => {
    const q = new URLSearchParams({ pathway, timeframe });
    window.open(`/api/learner/reports/performance/csv?${q.toString()}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-lg font-serif font-bold text-foreground">
              Official Learner Performance Intelligence Report
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 rounded-lg text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              className="h-8 rounded-lg text-xs gap-1.5 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPdf}
              className="h-8 rounded-lg text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted ml-2"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        {isLoading || !report ? (
          <div className="h-72 flex items-center justify-center animate-pulse">
            <span className="text-xs text-muted-foreground">Compiling authoritative analytics report...</span>
          </div>
        ) : (
          <div className="space-y-6 text-foreground print:p-0">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-xl sm:text-2xl text-foreground">PREPFORD</span>
                  <span className="text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold uppercase">
                    Performance Intelligence
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground">{report.pathwayTitle}</h2>
                <p className="text-xs text-muted-foreground">
                  Candidate: <strong className="text-foreground">{report.learnerName}</strong> ({report.learnerEmail})
                </p>
              </div>

              <div className="sm:text-right text-xs text-muted-foreground font-mono space-y-0.5">
                <div>Report ID: <span className="text-foreground font-bold">{report.reportId}</span></div>
                <div>Generated: {new Date(report.generatedAt).toLocaleString()}</div>
                <div>Timeframe: {(report.timeframe || timeframe || "All Time").toUpperCase()}</div>
              </div>
            </div>

            {/* Executive Summary Metrics Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                1. Executive Performance Telemetry
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-border p-3 bg-muted/20">
                  <span className="text-muted-foreground block text-[10px] uppercase">Overall Accuracy</span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    {(report.overview?.overallAccuracyPercent ?? 0).toFixed(1)}%
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {report.overview?.correctCount ?? 0} / {report.overview?.totalAnsweredQuestions ?? 0} correct
                  </p>
                </div>

                <div className="rounded-xl border border-border p-3 bg-muted/20">
                  <span className="text-muted-foreground block text-[10px] uppercase">Completed Tests</span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    {report.overview?.totalCompletedAttempts ?? 0}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {(report.overview?.completionRatePercent ?? 0).toFixed(1)}% completion rate
                  </p>
                </div>

                <div className="rounded-xl border border-border p-3 bg-muted/20">
                  <span className="text-muted-foreground block text-[10px] uppercase">Mean Score</span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    {(report.overview?.averageScorePercent ?? 0).toFixed(1)}%
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Across completed attempts</p>
                </div>

                <div className="rounded-xl border border-border p-3 bg-muted/20">
                  <span className="text-muted-foreground block text-[10px] uppercase">Readiness Tier</span>
                  <span className="text-sm font-bold font-mono text-teal-700 dark:text-teal-300 block mt-1">
                    {report.overview?.currentReadinessTier || "Unassessed"}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {((report.overview?.totalStudyDurationMinutes ?? 0) / 60).toFixed(1)} hrs study time
                  </p>
                </div>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                2. NCLEX Client Needs Performance Breakdown
              </h4>
              <div className="rounded-xl border border-border overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-mono text-[10px] uppercase border-b border-border">
                    <tr>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Questions</th>
                      <th className="p-2.5 text-right">Correct</th>
                      <th className="p-2.5 text-right">Accuracy</th>
                      <th className="p-2.5 text-right">Peer Mean</th>
                      <th className="p-2.5 text-right">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {report.categoryBreakdown.map((cat) => (
                      <tr key={cat.categoryCode} className="hover:bg-muted/20">
                        <td className="p-2.5">
                          <span className="font-semibold text-foreground">{cat.categoryName}</span>
                          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">({cat.categoryCode})</span>
                        </td>
                        <td className="p-2.5 text-right font-mono">{cat.totalQuestions}</td>
                        <td className="p-2.5 text-right font-mono">{cat.correctCount}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{cat.accuracyPercent.toFixed(1)}%</td>
                        <td className="p-2.5 text-right font-mono text-muted-foreground">{cat.peerBenchmarkAccuracyPercent}%</td>
                        <td className="p-2.5 text-right font-mono text-[11px] font-semibold">
                          {cat.classification}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Targeted Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  3. Priority Remediation Plan
                </h4>
                <div className="space-y-2">
                  {report.recommendations.slice(0, 4).map((rec, idx) => (
                    <div key={rec.id} className="rounded-xl border border-border p-3 bg-muted/10 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          {idx + 1}. {rec.title}
                        </span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {rec.priority} Priority • {rec.category}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Methodology & Disclaimer Statement */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Authoritative Scoring Methodology &amp; Regulatory Notice</span>
              </div>
              <p>{report.methodologyDisclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
