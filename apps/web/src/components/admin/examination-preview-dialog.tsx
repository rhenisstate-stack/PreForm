"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  FullPageDetailsLayout,
  FullPageActionBar,
} from "@/components/ui/full-page-crud";
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
import { QuestionTypeRenderer } from "@/components/questions/question-type-renderer";

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

  if (!open) return null;

  return (
    <FullPageDetailsLayout
      data-testid="examination-preview-fullpage"
      eyebrow="Authoritative Examination Simulator"
      title={preview?.title || "Examination Preview"}
      description="Administrative simulator displaying candidate-facing delivery layout and author verification keys."
      badge={
        <div className="flex flex-wrap items-center gap-2">
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
      }
      backLabel="Exit Preview"
      onBack={() => onOpenChange(false)}
      actions={
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-teal-600" />
            {preview?.timeLimitMinutes ? `${preview.timeLimitMinutes} min` : "Untimed"}
          </span>
          <span>•</span>
          <span>Pass: {preview?.passingScorePercent ?? 75}%</span>
          <span>•</span>
          <span>Policy: {preview?.reviewPolicy || "Standard"}</span>
        </div>
      }
      footer={
        <FullPageActionBar
          leftActions={
            <div className="flex items-center gap-3">
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
          }
          onCancel={() => onOpenChange(false)}
          cancelLabel="Close Preview"
        />
      }
    >
      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Authoritative Preview Mode: Zero learner attempts or telemetry records are created during preview.</span>
      </div>

      {/* Body */}
      <div className="w-full max-w-none rounded-2xl border border-border bg-card p-6 space-y-6">
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
                  Type: {(currentQuestion as any).questionTypeKey || (currentQuestion as any).questionType || "single-choice"}
                </Badge>
                {currentQuestion.clientNeedName && (
                  <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {currentQuestion.clientNeedName}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                ID: {(currentQuestion.id || "").slice(0, 10)}...
              </div>
            </div>

            <QuestionTypeRenderer
              questionId={currentQuestion.id}
              questionTypeKey={
                (currentQuestion as any).questionTypeKey ||
                (currentQuestion as any).questionType ||
                "single-choice"
              }
              stem={currentQuestion.stem}
              instructions={(currentQuestion as any).instructions}
              clinicalScenario={(currentQuestion as any).clinicalScenario}
              exhibitsJson={(currentQuestion as any).exhibitsJson}
              structuredContentJson={(currentQuestion as any).structuredContentJson}
              overallRationale={
                currentQuestion.overallRationale || (currentQuestion as any).rationale
              }
              options={(currentQuestion.options || []).map((opt: any, oIdx: number) => ({
                id: opt.id || `${currentQuestion.id}_opt_${oIdx}`,
                optionKey: opt.optionKey || opt.key || String.fromCharCode(65 + oIdx),
                content: opt.content || opt.text || "",
                isCorrect: Boolean(opt.isCorrect),
                rationale: opt.rationale || null,
                distractorRationale: opt.distractorRationale || null,
                mediaUrl: opt.mediaUrl || null,
                displayOrder: opt.displayOrder ?? oIdx,
              }))}
              mode="admin-preview"
            />
          </div>
        )}
      </div>
    </FullPageDetailsLayout>
  );
}
