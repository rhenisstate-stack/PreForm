"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileQuestion,
  Filter,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LearnerQuestionReview, PaginatedQuestionReview } from "@/lib/api-services";

export interface QuestionReviewTableProps {
  reviewData: PaginatedQuestionReview | null;
  page: number;
  pageSize: number;
  search: string;
  onlyIncorrect: boolean;
  onPageChange: (newPage: number) => void;
  onSearchChange: (newSearch: string) => void;
  onOnlyIncorrectToggle: (val: boolean) => void;
  isLoading?: boolean;
}

export function QuestionReviewTable({
  reviewData,
  page,
  pageSize,
  search,
  onlyIncorrect,
  onPageChange,
  onSearchChange,
  onOnlyIncorrectToggle,
  isLoading,
}: QuestionReviewTableProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const items = reviewData?.items || [];
  const totalCount = reviewData?.totalCount || 0;
  const totalPages = reviewData?.totalPages || 1;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5" data-testid="question-review-table">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-foreground">Candidate Question History &amp; Rationales</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit your past exam responses, correct options, and clinical justifications ({totalCount} questions recorded)
          </p>
        </div>

        {/* Search & Only-Incorrect Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search question stem..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pl-8 text-xs rounded-xl"
            />
          </div>

          <Button
            type="button"
            variant={onlyIncorrect ? "destructive" : "outline"}
            size="sm"
            onClick={() => onOnlyIncorrectToggle(!onlyIncorrect)}
            className="h-9 text-xs rounded-xl gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{onlyIncorrect ? "Showing Missed Only" : "Filter Missed"}</span>
          </Button>
        </div>
      </div>

      {/* Review List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 border border-border" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
          <FileQuestion className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-foreground">No Question Records Found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {onlyIncorrect
              ? "Great job! You have no incorrect responses matching the current search criteria."
              : "Complete assessment attempts to populate your candidate question review history."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isExpanded = expandedId === `${item.attemptId}_${item.questionId}_${idx}`;
            const key = `${item.attemptId}_${item.questionId}_${idx}`;

            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card overflow-hidden hover:border-teal-500/40 transition-colors"
              >
                {/* Accordion Row Header */}
                <div
                  onClick={() => toggleExpand(key)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {item.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge
                          variant="outline"
                          className={
                            item.isCorrect
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]"
                          }
                        >
                          {item.isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                        <span className="font-mono text-muted-foreground text-[11px]">{item.questionTypeDisplayName}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground text-[11px]">{item.clientNeedName || "General Nursing"}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground text-[11px] font-mono">{item.attemptTitle}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">{item.questionStem}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <span className="text-xs font-mono text-muted-foreground">
                      Time: {item.timeSpentSeconds}s
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Answers & Clinical Rationale */}
                {isExpanded && (
                  <div className="border-t border-border/60 bg-muted/20 p-4 space-y-4 text-xs">
                    {/* Answer Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border p-3 bg-card space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Your Selected Response
                        </span>
                        <p className={`font-medium ${item.isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                          {item.safeSelectedAnswerPreview || "No response recorded"}
                        </p>
                      </div>

                      <div className="rounded-lg border border-emerald-500/30 p-3 bg-emerald-500/5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Authoritative Correct Answer
                        </span>
                        <p className="font-medium text-emerald-900 dark:text-emerald-200">
                          {item.safeCorrectAnswerPreview}
                        </p>
                      </div>
                    </div>

                    {/* Clinical Rationale */}
                    {item.clinicalRationale && (
                      <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3.5 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
                          Clinical Reasoning Rationale
                        </span>
                        <p className="text-foreground leading-relaxed text-xs font-sans whitespace-pre-line">
                          {item.clinicalRationale}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total items)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="h-8 rounded-lg gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="h-8 rounded-lg gap-1 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
