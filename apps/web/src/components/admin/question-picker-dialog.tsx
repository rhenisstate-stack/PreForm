"use client";

import * as React from "react";
import { Search, Plus, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { BackendExamQuestionMembershipDto } from "@/lib/api-services";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";

interface QuestionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisionId: string;
  revisionPathway: string;
  existingQuestionIds: Set<string>;
  concurrencyToken: number;
  onQuestionAdded: (added: BackendExamQuestionMembershipDto) => void;
}

export function QuestionPickerDialog({
  open,
  onOpenChange,
  revisionId,
  revisionPathway,
  existingQuestionIds,
  concurrencyToken,
  onQuestionAdded,
}: QuestionPickerDialogProps) {
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [formatFilter, setFormatFilter] = React.useState<string>("all");
  const [addingId, setAddingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: eligibleQuestions = [],
    isLoading,
    error,
    refetch,
  } = useQuery<BackendExamQuestionMembershipDto[]>({
    queryKey: ["eligible-questions", revisionPathway, debouncedSearch],
    queryFn: async (): Promise<BackendExamQuestionMembershipDto[]> => {
      const p = new URLSearchParams();
      if (revisionPathway) p.set("pathway", revisionPathway);
      if (debouncedSearch) p.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/examinations/eligible-questions?${p.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load eligible questions");
      }
      const data = await res.json();
      return data.questions || [];
    },
    enabled: open,
  });

  const filteredQuestions = React.useMemo(() => {
    if (formatFilter === "all") return eligibleQuestions;
    return eligibleQuestions.filter(
      (q) => q.questionTypeKey?.toLowerCase() === formatFilter.toLowerCase()
    );
  }, [eligibleQuestions, formatFilter]);

  const availableFormats = React.useMemo(() => {
    const set = new Set<string>();
    eligibleQuestions.forEach((q) => {
      if (q.questionTypeKey) set.add(q.questionTypeKey);
    });
    return Array.from(set);
  }, [eligibleQuestions]);

  const handleAddQuestion = async (q: BackendExamQuestionMembershipDto) => {
    setAddingId(q.questionId);
    try {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.questionId,
          concurrencyToken,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add question to examination revision");
      }

      const data = await res.json();
      notify.success("Question added to examination.");
      onQuestionAdded(data.question);
    } catch (err: any) {
      notify.error(sanitizeErrorMessage(err.message));
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Question Bank Selector</DialogTitle>
            <Badge variant="outline" className="uppercase text-xs font-bold border-teal-500/30 text-teal-700 dark:text-teal-300">
              {revisionPathway.toUpperCase()} Pathway Only
            </Badge>
          </div>
          <DialogDescription>
            Select approved and published questions from the item bank to compose this examination revision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by question stem, topic or format..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-slate-400">Type:</span>
              <button
                type="button"
                onClick={() => setFormatFilter("all")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  formatFilter === "all"
                    ? "bg-[#142B4A] text-white dark:bg-slate-700"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                }`}
              >
                All ({eligibleQuestions.length})
              </button>
              {availableFormats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    formatFilter === fmt
                      ? "bg-[#0D9488] text-white"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 shrink-0">
              Showing {filteredQuestions.length} item{filteredQuestions.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[450px] divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg border-slate-200 dark:border-slate-800">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-xs">Loading approved questions...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-500 text-xs">
              <AlertCircle className="h-6 w-6 mx-auto mb-1 text-rose-400" />
              Failed to load question catalogue.
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No approved questions found matching pathway "{revisionPathway}" and selected filters.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isAlreadyAdded = existingQuestionIds.has(q.questionId);
              const isBusy = addingId === q.questionId;

              return (
                <div
                  key={q.questionId}
                  className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                    isAlreadyAdded
                      ? "bg-slate-50/60 dark:bg-slate-900/30 opacity-70"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-400">
                        {q.questionId.slice(0, 8)}...
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {q.questionTypeKey}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                        {q.difficulty}
                      </Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] px-1.5 py-0">
                        {q.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                      {q.stem}
                    </p>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Added
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAddQuestion(q)}
                        disabled={isBusy}
                        className="h-7 px-2.5 text-xs bg-[#0D9488] hover:bg-[#0F766E] text-white gap-1"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
