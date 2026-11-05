"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { BackendAdminExamPreviewDto } from "@/lib/api-services";

interface ExaminationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisionId: string;
}

export function ExaminationPreviewDialog({
  open,
  onOpenChange,
  revisionId,
}: ExaminationPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const {
    data: previewData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "examination", "preview", revisionId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/preview`);
      if (!res.ok) {
        throw new Error("Failed to load examination preview");
      }
      return res.json() as Promise<{ success: boolean; preview: BackendAdminExamPreviewDto }>;
    },
    enabled: open,
  });

  const preview = previewData?.preview;
  const questions = preview?.questions || [];
  const currentQuestion = questions[currentIndex];

  React.useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-500/20">
                  {preview?.pathway?.toUpperCase() || "NCLEX"} Pathway
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                  {preview?.examinationCode || "PREVIEW"}
                </Badge>
                <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-[10px] font-mono">
                  Strategy: {preview?.selectionStrategy || "Preset"}
                </Badge>
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {preview?.title || "Examination Preview"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Administrative simulator displaying candidate-facing delivery layout and author verification keys.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 self-start sm:self-auto font-mono bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-teal-600" />
                {preview?.timeLimitMinutes ? `${preview.timeLimitMinutes} min` : "Untimed"}
              </span>
              <span>•</span>
              <span>Pass: {preview?.passingScorePercent ?? 75}%</span>
              <span>•</span>
              <span>Policy: {preview?.reviewPolicy || "Standard"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Authoritative Preview Mode: Zero learner attempts or telemetry records are created during preview.</span>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Loading preview assessment items...
            </div>
          ) : error || !preview ? (
            <div className="py-16 text-center text-xs text-rose-500">
              Failed to load examination preview. Ensure questions exist or blueprint quotas are defined.
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No questions found in this examination pool. Assign questions in the Questions tab or define blueprint quotas.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Question Stepper Indicator */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                    Type: {currentQuestion.questionTypeKey}
                  </Badge>
                  {currentQuestion.clientNeedName && (
                    <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {currentQuestion.clientNeedName}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  ID: {currentQuestion.id.slice(0, 10)}...
                </div>
              </div>

              {/* Stem */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-medium">
                  {currentQuestion.stem}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Candidate Option Choices
                </Label>
                <div className="space-y-2">
                  {currentQuestion.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-lg border text-xs flex items-start gap-3 transition-colors ${
                        opt.isCorrect
                          ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          opt.isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {opt.optionKey}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div>{opt.content}</div>
                        {opt.isCorrect && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Correct Key (Admin Preview)
                          </span>
                        )}
                        {opt.rationale && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-2 border-l border-emerald-400/50">
                            {opt.rationale}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Clinical Rationale */}
              {currentQuestion.overallRationale && (
                <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-950/20 space-y-1.5">
                  <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Authoritative Clinical Rationale (Educator / Reviewer Verification)
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentQuestion.overallRationale}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0 || questions.length === 0}
            className="text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Previous Item
          </Button>

          <span className="text-xs font-mono text-slate-500">
            {questions.length > 0 ? `${currentIndex + 1} / ${questions.length}` : "0 / 0"}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex >= questions.length - 1 || questions.length === 0}
            className="text-xs"
          >
            Next Item
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
