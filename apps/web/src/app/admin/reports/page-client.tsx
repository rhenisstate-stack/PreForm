"use client";

import * as React from "react";
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  HelpCircle,
  FileText,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrandedLoading } from "@/components/layout/branded-loading";
import type { AssessmentReport, QuestionPerformance } from "@/lib/api-services";

export function AdminReportsClient() {
  const [activeTab, setActiveTab] = React.useState<"assessments" | "questions">("assessments");
  const [pathway, setPathway] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");

  // Assessment Report State
  const [assessmentReport, setAssessmentReport] = React.useState<AssessmentReport | null>(null);
  const [assessmentLoading, setAssessmentLoading] = React.useState(true);
  const [assessmentError, setAssessmentError] = React.useState<string | null>(null);

  // Question Performance State
  const [questions, setQuestions] = React.useState<QuestionPerformance[]>([]);
  const [totalQuestions, setTotalQuestions] = React.useState(0);
  const [questionLoading, setQuestionLoading] = React.useState(false);
  const [selectedQuestion, setSelectedQuestion] = React.useState<QuestionPerformance | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Fetch Assessment Report
  const fetchAssessmentReport = React.useCallback(() => {
    setAssessmentLoading(true);
    setAssessmentError(null);
    const params = new URLSearchParams();
    if (pathway !== "all") params.set("pathway", pathway);

    fetch(`/api/admin/reports/assessments?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.data) {
          setAssessmentReport(data.data);
        } else if (data && data.totalAttempts !== undefined) {
          setAssessmentReport(data);
        }
      })
      .catch((err) => setAssessmentError(err.message || "Failed to load report"))
      .finally(() => setAssessmentLoading(false));
  }, [pathway]);

  // Fetch Questions Performance
  const fetchQuestionsPerformance = React.useCallback(() => {
    setQuestionLoading(true);
    const params = new URLSearchParams();
    if (pathway !== "all") params.set("pathway", pathway);
    if (search.trim()) params.set("search", search.trim());
    params.set("pageSize", "50");

    fetch(`/api/admin/reports/questions?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.data) {
          setQuestions(data.data.items || []);
          setTotalQuestions(data.data.totalCount || 0);
        } else if (data && data.items) {
          setQuestions(data.items);
          setTotalQuestions(data.totalCount || 0);
        }
      })
      .catch(() => {})
      .finally(() => setQuestionLoading(false));
  }, [pathway, search]);

  React.useEffect(() => {
    if (activeTab === "assessments") {
      fetchAssessmentReport();
    } else {
      fetchQuestionsPerformance();
    }
  }, [activeTab, fetchAssessmentReport, fetchQuestionsPerformance]);

  const handleInspectQuestion = async (q: QuestionPerformance) => {
    setDetailLoading(true);
    setSelectedQuestion(q);
    try {
      const res = await fetch(`/api/admin/reports/questions/${encodeURIComponent(q.questionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          setSelectedQuestion(data.data);
        }
      }
    } catch {
      // keep basic q
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportAssessments = () => {
    const params = new URLSearchParams();
    if (pathway !== "all") params.set("pathway", pathway);
    window.open(`/api/admin/reports/assessments/export?${params.toString()}`, "_blank");
  };

  const handleExportQuestions = () => {
    const params = new URLSearchParams();
    if (pathway !== "all") params.set("pathway", pathway);
    if (search.trim()) params.set("search", search.trim());
    window.open(`/api/admin/reports/questions/export?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6" data-testid="admin-reports-page">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" aria-hidden="true" />
            Assessment &amp; Question Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            PostgreSQL-authoritative candidate outcomes, completion metrics, decile distributions, and item diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "assessments" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAssessments}
              className="gap-1.5"
              data-testid="export-assessments-csv-btn"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportQuestions}
              className="gap-1.5"
              data-testid="export-questions-csv-btn"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={activeTab === "assessments" ? fetchAssessmentReport : fetchQuestionsPerformance}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Toggle */}
        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/40">
          <button
            onClick={() => setActiveTab("assessments")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "assessments"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-assessments"
          >
            Assessment Outcomes
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "questions"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-questions"
          >
            Question Item Performance
          </button>
        </div>

        {/* Pathway Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pathway:</span>
          {(["all", "rn", "pn"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPathway(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase transition-colors ${
                pathway === p
                  ? "bg-[#142B4A] text-white dark:bg-slate-700 shadow-2xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Assessment Outcomes */}
      {activeTab === "assessments" && (
        <div className="space-y-6">
          {assessmentLoading ? (
            <BrandedLoading message="Loading assessment reports..." fullScreen={false} />
          ) : assessmentError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
              {assessmentError}
            </div>
          ) : assessmentReport ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Attempts</p>
                  <p className="text-xl font-bold font-serif text-foreground mt-1">{assessmentReport.totalAttempts.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold font-serif text-emerald-600 dark:text-emerald-400 mt-1">
                    {assessmentReport.completedAttempts.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completion Rate</p>
                  <p className="text-xl font-bold font-serif text-foreground mt-1">{assessmentReport.completionRate}%</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Abandonment Rate</p>
                  <p className="text-xl font-bold font-serif text-amber-600 dark:text-amber-400 mt-1">{assessmentReport.abandonmentRate}%</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Score</p>
                  <p className="text-xl font-bold font-serif text-foreground mt-1">{assessmentReport.averageScorePercent}%</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pass Rate</p>
                  <p className="text-xl font-bold font-serif text-teal-600 dark:text-teal-400 mt-1">{assessmentReport.passRate}%</p>
                </div>
              </div>

              {/* Score Distribution Histogram */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-serif font-semibold text-foreground text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                  Score Distribution Across Decile Buckets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 pt-2">
                  {assessmentReport.scoreDistribution.map((b) => (
                    <div key={b.bucketLabel} className="space-y-1 text-center">
                      <div className="h-24 bg-muted/30 rounded-lg flex flex-col justify-end p-1.5 relative overflow-hidden">
                        <div
                          className="bg-primary/70 dark:bg-primary/60 rounded-sm w-full transition-all duration-500"
                          style={{ height: `${Math.min(100, Math.max(8, b.percentage))}%` }}
                        />
                      </div>
                      <p className="text-xs font-bold text-foreground">{b.count}</p>
                      <p className="text-[10px] text-muted-foreground">{b.bucketLabel}</p>
                      <p className="text-[9px] text-primary font-medium">{b.percentage}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Examination Breakdown Table */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-serif font-semibold text-foreground text-sm">
                    Performance by Examination Family
                  </h3>
                  <span className="text-xs text-muted-foreground">{assessmentReport.examinationBreakdowns.length} examinations</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">Code</th>
                        <th className="py-2.5 px-4">Title</th>
                        <th className="py-2.5 px-3">Pathway</th>
                        <th className="py-2.5 px-3 text-right">Total Attempts</th>
                        <th className="py-2.5 px-3 text-right">Completed</th>
                        <th className="py-2.5 px-3 text-right">Avg Score</th>
                        <th className="py-2.5 px-3 text-right">Pass Rate</th>
                        <th className="py-2.5 px-4 text-right">Avg Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {assessmentReport.examinationBreakdowns.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground">
                            No examination attempts match the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        assessmentReport.examinationBreakdowns.map((exam) => (
                          <tr key={exam.examinationId} className="hover:bg-muted/20">
                            <td className="py-2.5 px-4 font-mono font-medium text-foreground">{exam.code}</td>
                            <td className="py-2.5 px-4 font-medium text-foreground">{exam.title}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="uppercase text-[10px]">{exam.pathway}</Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{exam.totalAttempts}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{exam.completedAttempts}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">{exam.averageScorePercent}%</td>
                            <td className="py-2.5 px-3 text-right text-foreground">{exam.passRate}%</td>
                            <td className="py-2.5 px-4 text-right text-muted-foreground">{exam.averageDurationMinutes} min</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Tab 2: Question Item Performance */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by question code or stem text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" onClick={fetchQuestionsPerformance} className="gap-1.5">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Search
            </Button>
          </div>

          {/* Table */}
          {questionLoading ? (
            <BrandedLoading message="Loading question performance data..." fullScreen={false} />
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-serif font-semibold text-foreground text-sm">
                  Item Performance &amp; Empirical Correctness Rates
                </h3>
                <span className="text-xs text-muted-foreground">{totalQuestions} questions catalogued</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-3">Pathway</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Difficulty</th>
                      <th className="py-2.5 px-4">Client Need</th>
                      <th className="py-2.5 px-3 text-right">Delivered</th>
                      <th className="py-2.5 px-3 text-right">Answered</th>
                      <th className="py-2.5 px-3 text-right">Correct %</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {questions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-muted-foreground">
                          No questions matched your search criteria.
                        </td>
                      </tr>
                    ) : (
                      questions.map((q) => (
                        <tr key={q.questionId} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-mono font-medium text-foreground">{q.code || "QN-000"}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="uppercase text-[10px]">{q.pathway}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">{q.questionTypeKey}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{q.difficulty}</td>
                          <td className="py-2.5 px-4 font-medium text-foreground">
                            {q.clientNeedName || q.clientNeedCode || "Unassigned"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{q.timesDelivered}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{q.timesAnswered}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">
                            {q.timesAnswered > 0 ? `${q.correctResponseRate}%` : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInspectQuestion(q)}
                              className="h-7 text-xs gap-1"
                            >
                              Distractors <ChevronRight className="h-3 w-3" aria-hidden="true" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Distractor Analysis Modal */}
          {selectedQuestion && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              data-testid="distractor-modal"
            >
              <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-foreground text-base">
                      Item Distractor Analysis: {selectedQuestion.code}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Empirical selection distribution across answer choices
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedQuestion(null)}
                    className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl text-xs text-foreground leading-relaxed">
                  <p className="font-semibold text-muted-foreground uppercase text-[10px] mb-1">Question Stem</p>
                  {selectedQuestion.stemPreview}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Option Selection Breakdown ({selectedQuestion.timesAnswered} responses)
                  </p>

                  {detailLoading ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">Analyzing distractors...</div>
                  ) : !selectedQuestion.distractorAnalysis || selectedQuestion.distractorAnalysis.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No candidate responses recorded for this question yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedQuestion.distractorAnalysis.map((d) => (
                        <div
                          key={d.optionKey}
                          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                            d.isCorrect
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                              : "border-border bg-card text-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              Option {d.optionKey}
                              {d.isCorrect && (
                                <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5">Correct Key</Badge>
                              )}
                            </span>
                            <span className="font-medium text-xs">
                              {d.selectionCount} selections ({d.selectionRate}%)
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{d.contentPreview}</p>
                          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${d.isCorrect ? "bg-emerald-600" : "bg-primary/70"}`}
                              style={{ width: `${d.selectionRate}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setSelectedQuestion(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
