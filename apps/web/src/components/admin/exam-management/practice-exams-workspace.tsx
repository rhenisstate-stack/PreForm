"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FullPageFormLayout,
  FullPageDeleteLayout,
  FullPageActionBar,
} from "@/components/ui/full-page-crud";
import { ExaminationPreviewDialog } from "@/components/admin/examination-preview-dialog";
import { DuplicateExaminationDialog } from "@/components/admin/duplicate-examination-dialog";
import { notify } from "@/lib/notifications";

interface PracticeExamsWorkspaceProps {
  canModify?: boolean;
  initialMode?: "list" | "create" | "details" | "edit" | "delete";
  initialEntityId?: string;
  onExamCatalogChanged?: () => void;
}

export function PracticeExamsWorkspace({
  canModify = true,
  initialMode = "list",
  initialEntityId,
  onExamCatalogChanged,
}: PracticeExamsWorkspaceProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!bannerMessage) return;
    if (bannerMessage.type === "success") {
      notify.success(bannerMessage.text);
    } else {
      notify.error(bannerMessage.text);
    }
  }, [bannerMessage]);

  // Programme Tabs & Filters
  const [pathwayTab, setPathwayTab] = useState<"all" | "rn" | "pn">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create / Edit Practice Exam Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [pathway, setPathway] = useState<"rn" | "pn">("rn");
  const [description, setDescription] = useState("");
  const [questionFormatFilter, setQuestionFormatFilter] = useState<
    "all" | "traditional" | "ngn"
  >("all");
  const [targetQuestionCount, setTargetQuestionCount] = useState(85);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(180);
  const [passingScorePercent, setPassingScorePercent] = useState(75);
  const [selectionStrategy, setSelectionStrategy] = useState<"Preset" | "DynamicBalanced">(
    "DynamicBalanced"
  );
  const [easyPercent, setEasyPercent] = useState(20);
  const [moderatePercent, setModeratePercent] = useState(50);
  const [hardPercent, setHardPercent] = useState(30);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [reviewPolicy, setReviewPolicy] = useState("AfterExamSubmission");
  const [showRationales, setShowRationales] = useState(true);
  const [maxAttemptsAllowed, setMaxAttemptsAllowed] = useState(5);
  const [eligibleQuestions, setEligibleQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview, Duplicate & Delete Modals
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadPracticeExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ module: "practice", pageSize: "50" });
      if (pathwayTab !== "all") params.set("pathway", pathwayTab);
      if (statusFilter !== "all") params.set("revisionStatus", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/examinations?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to load Practice Exams.");
      }
      setExams(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setError(err.message || "Failed to load Practice Exams.");
    } finally {
      setLoading(false);
    }
  }, [pathwayTab, statusFilter, searchQuery]);

  const loadEligibleQuestions = useCallback(
    async (targetPathway: string, format: string) => {
      try {
        const params = new URLSearchParams({ pathway: targetPathway });
        if (format !== "all") params.set("questionType", format);
        const res = await fetch(
          `/api/admin/examinations/eligible-questions?${params.toString()}`
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.questions)) {
          setEligibleQuestions(data.questions);
        }
      } catch {
        // ignore
      }
    },
    []
  );

  useEffect(() => {
    loadPracticeExams();
  }, [loadPracticeExams]);

  useEffect(() => {
    if (initialMode === "create") {
      setModalOpen(true);
      return;
    }
    if (loading || !initialEntityId) return;
    const matched = exams.find((item) => item.id === initialEntityId);
    if (!matched) return;
    if (initialMode === "edit") {
      openEditModal(matched);
    } else if (initialMode === "delete") {
      setDeleteTarget(matched);
    } else if (initialMode === "details") {
      const revId = matched.latestRevision?.id || matched.currentRevision?.id;
      if (revId) setPreviewRevisionId(revId);
    }
  }, [initialMode, initialEntityId, loading, exams]);

  useEffect(() => {
    if (modalOpen) {
      loadEligibleQuestions(pathway, questionFormatFilter);
    }
  }, [modalOpen, pathway, questionFormatFilter, loadEligibleQuestions]);

  const openCreateModal = (defaultPathway?: "rn" | "pn") => {
    setEditingExam(null);
    const chosenPathway =
      defaultPathway || (pathwayTab === "pn" ? "pn" : "rn");
    setTitle("");
    setPathway(chosenPathway);
    setDescription("");
    setQuestionFormatFilter("all");
    setTargetQuestionCount(85);
    setTimeLimitMinutes(chosenPathway === "pn" ? 150 : 180);
    setPassingScorePercent(chosenPathway === "pn" ? 72 : 75);
    setSelectionStrategy("DynamicBalanced");
    setEasyPercent(20);
    setModeratePercent(50);
    setHardPercent(30);
    setRandomizeQuestions(true);
    setReviewPolicy("AfterExamSubmission");
    setShowRationales(true);
    setMaxAttemptsAllowed(5);
    setSelectedQuestionIds([]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (exam: any) => {
    const rev = exam.latestRevision || exam.currentRevision;
    setEditingExam(exam);
    setTitle(exam.title || "");
    setPathway(exam.pathway === "pn" ? "pn" : "rn");
    setDescription(rev?.description || "");
    setTargetQuestionCount(rev?.targetQuestionCount || rev?.questionCount || 85);
    setTimeLimitMinutes(rev?.timeLimitMinutes ?? 180);
    setPassingScorePercent(rev?.passingScorePercent ?? 75);
    setSelectionStrategy(
      rev?.selectionStrategy === "Preset" ? "Preset" : "DynamicBalanced"
    );
    setReviewPolicy(rev?.reviewPolicy || "AfterExamSubmission");
    setShowRationales(rev?.showRationales ?? true);
    setMaxAttemptsAllowed(rev?.maxAttemptsAllowed ?? 5);

    if (rev?.compositionRulesJson) {
      try {
        const parsed = JSON.parse(rev.compositionRulesJson);
        if (parsed.questionFormatFilter) {
          setQuestionFormatFilter(parsed.questionFormatFilter);
        }
        if (parsed.difficultyDistribution) {
          setEasyPercent(Number(parsed.difficultyDistribution.easyPercent ?? 20));
          setModeratePercent(
            Number(parsed.difficultyDistribution.moderatePercent ?? 50)
          );
          setHardPercent(Number(parsed.difficultyDistribution.hardPercent ?? 30));
        }
        if (parsed.randomizeQuestions !== undefined) {
          setRandomizeQuestions(Boolean(parsed.randomizeQuestions));
        }
      } catch {
        // ignore
      }
    }
    setSelectedQuestionIds([]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSavePracticeExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Practice Exam title is required.");
      return;
    }

    if (easyPercent + moderatePercent + hardPercent !== 100) {
      setFormError(
        "Difficulty distribution percentages (Easy + Moderate + Hard) must sum to 100%."
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const compositionPayload = {
        targetQuestionCount:
          selectedQuestionIds.length > 0
            ? selectedQuestionIds.length
            : Number(targetQuestionCount) || 85,
        selectionStrategy,
        questionFormatFilter,
        randomizeQuestions,
        difficultyDistribution: {
          easyPercent: Number(easyPercent),
          moderatePercent: Number(moderatePercent),
          hardPercent: Number(hardPercent),
        },
      };

      if (!editingExam) {
        const res = await fetch("/api/admin/examinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathway,
            title: title.trim(),
            initialRevisionTitle: `${title.trim()} — Rev 1`,
            description: description.trim(),
            examType: 1, // ExamType.Practice
            timeLimitMinutes: Number(timeLimitMinutes) || 180,
            passingScorePercent: Number(passingScorePercent) || 75,
            targetQuestionCount: compositionPayload.targetQuestionCount,
            selectionStrategy,
            compositionRulesJson: JSON.stringify(compositionPayload),
            questionIds: selectedQuestionIds,
            isAvailable: true,
            maxAttemptsAllowed: Number(maxAttemptsAllowed) || 5,
            reviewPolicy,
            showRationales,
            showScoreImmediately: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          throw new Error(data.error || "Failed to create Practice Exam.");
        }

        setModalOpen(false);
        setBannerMessage({
          type: "success",
          text: `NCLEX-${pathway.toUpperCase()} Practice Exam "${title.trim()}" created.`,
        });
      } else {
        await fetch(`/api/admin/examinations/${editingExam.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() }),
        });

        const rev = editingExam.latestRevision || editingExam.currentRevision;
        if (rev?.id && rev.lifecycleState === "Draft") {
          const compGet = await fetch(
            `/api/admin/examinations/revisions/${rev.id}/composition`
          );
          const compData = await compGet.json().catch(() => ({}));
          const token = compData?.concurrencyToken ?? rev.concurrencyToken ?? 1;

          await fetch(
            `/api/admin/examinations/revisions/${rev.id}/composition`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...compositionPayload,
                concurrencyToken: token,
              }),
            }
          );
        }

        setModalOpen(false);
        setBannerMessage({
          type: "success",
          text: `Practice Exam "${title.trim()}" updated.`,
        });
      }

      await loadPracticeExams();
      onExamCatalogChanged?.();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Practice Exam.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePracticeExam = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/examinations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setDeleteError(
          data.error ||
            "Cannot delete this Practice Exam because learner attempts or publication history exist. Archive it instead."
        );
        return;
      }

      setBannerMessage({
        type: "success",
        text: `Practice Exam "${deleteTarget.title}" deleted.`,
      });
      setDeleteTarget(null);
      await loadPracticeExams();
      onExamCatalogChanged?.();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete Practice Exam.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 space-y-6" data-testid="practice-exams-workspace">
      {previewRevisionId ? (
        <ExaminationPreviewDialog
          revisionId={previewRevisionId}
          open={!!previewRevisionId}
          onOpenChange={(open) => !open && setPreviewRevisionId(null)}
        />
      ) : duplicateTarget ? (
        <DuplicateExaminationDialog
          open={!!duplicateTarget}
          onOpenChange={(open) => {
            if (!open) {
              setDuplicateTarget(null);
              loadPracticeExams();
              onExamCatalogChanged?.();
            }
          }}
          examinationId={duplicateTarget.id}
          examinationCode={duplicateTarget.code}
          examinationTitle={duplicateTarget.title}
          examinationPathway={duplicateTarget.pathway}
          eligibleRevisions={
            [
              duplicateTarget.publishedRevision ||
                duplicateTarget.latestRevision ||
                duplicateTarget.currentRevision,
            ].filter(Boolean)
          }
        />
      ) : deleteTarget ? (
        <FullPageDeleteLayout
          data-testid="practice-exam-delete-fullpage"
          title="Delete Practice Exam"
          description={`Confirm removal of ${deleteTarget.title} (${deleteTarget.code}).`}
          recordTitle={deleteTarget.title}
          recordSubtitle={`Code: ${deleteTarget.code}`}
          consequences={[
            "Draft Practice Exams with zero learner attempts are permanently deleted.",
            "Published Practice Exams or exams with learner attempt records are protected and must be archived instead.",
          ]}
          dependencyNotice={
            deleteError && (
              <div className="text-amber-800 dark:text-amber-300 font-medium">
                {deleteError}
              </div>
            )
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirmDelete={handleDeletePracticeExam}
          confirmDeleteLabel={deleteSubmitting ? "Deleting..." : "Confirm Delete"}
          isSubmitting={deleteSubmitting}
        />
      ) : modalOpen ? (
        <FullPageFormLayout
          data-testid="practice-exam-form-fullpage"
          eyebrow="Module 3 — Practice Exams (NCLEX-RN & NCLEX-PN)"
          title={editingExam ? "Edit Practice Exam" : "Create Practice Exam"}
          description="Configure an NCLEX-RN or NCLEX-PN Practice Exam with Traditional and Next Generation NCLEX (NGN) question selection, difficulty distribution, and review policies."
          backLabel="Return to Practice Exams"
          onBack={() => setModalOpen(false)}
        >
          <form onSubmit={handleSavePracticeExam} className="w-full max-w-none space-y-6">
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="pe-title">Practice Exam Title *</Label>
                <Input
                  id="pe-title"
                  placeholder="e.g., NCLEX-RN Full-Length Practice Examination #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe-pathway">Programme / Track *</Label>
                <select
                  id="pe-pathway"
                  value={pathway}
                  disabled={!!editingExam}
                  onChange={(e) => setPathway(e.target.value as "rn" | "pn")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pe-desc">Description & Candidate Instructions</Label>
              <textarea
                id="pe-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions for candidates taking this Practice Exam..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pe-qcount" className="text-xs">
                  Total Questions
                </Label>
                <Input
                  id="pe-qcount"
                  type="number"
                  min={1}
                  max={265}
                  value={targetQuestionCount}
                  onChange={(e) => setTargetQuestionCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe-duration" className="text-xs">
                  Duration (Min)
                </Label>
                <Input
                  id="pe-duration"
                  type="number"
                  min={0}
                  max={720}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe-pass" className="text-xs">
                  Passing Score (%)
                </Label>
                <Input
                  id="pe-pass"
                  type="number"
                  min={1}
                  max={100}
                  value={passingScorePercent}
                  onChange={(e) => setPassingScorePercent(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe-format" className="text-xs">
                  Question Formats
                </Label>
                <select
                  id="pe-format"
                  value={questionFormatFilter}
                  onChange={(e) => setQuestionFormatFilter(e.target.value as any)}
                  className="w-full h-10 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">Traditional + NGN</option>
                  <option value="traditional">Traditional NCLEX Only</option>
                  <option value="ngn">NGN & Multi-Response</option>
                </select>
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Difficulty Distribution (Must Sum to 100%)</span>
                <span
                  className={
                    easyPercent + moderatePercent + hardPercent === 100
                      ? "text-emerald-600"
                      : "text-red-500"
                  }
                >
                  Total: {easyPercent + moderatePercent + hardPercent}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <Label className="text-[11px]">Easy (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={easyPercent}
                    onChange={(e) => setEasyPercent(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Moderate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={moderatePercent}
                    onChange={(e) => setModeratePercent(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Hard (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={hardPercent}
                    onChange={(e) => setHardPercent(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {!editingExam && eligibleQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Label>
                    Curate Specific Questions from Repository (Optional)
                  </Label>
                  <span className="text-muted-foreground">
                    {selectedQuestionIds.length} selected
                  </span>
                </div>
                <div className="border border-border rounded-xl divide-y divide-border text-xs">
                  {eligibleQuestions.slice(0, 20).map((q) => {
                    const qId = q.questionId || q.id;
                    const checked = selectedQuestionIds.includes(qId);
                    return (
                      <label
                        key={qId}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-muted/20"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedQuestionIds((prev) =>
                              prev.includes(qId)
                                ? prev.filter((x) => x !== qId)
                                : [...prev, qId]
                            )
                          }
                        />
                        <span className="flex-1">{q.stem}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {q.questionTypeKey}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <FullPageActionBar
              onCancel={() => setModalOpen(false)}
              primaryAction={
                <Button
                  type="submit"
                  disabled={submitting}
                  data-testid="save-practice-exam-btn"
                  className="bg-teal-600 hover:bg-teal-500 text-white"
                >
                  {submitting
                    ? "Saving..."
                    : editingExam
                      ? "Save Changes"
                      : "Create Practice Exam"}
                </Button>
              }
            />
          </form>
        </FullPageFormLayout>
      ) : (
        <>
      {/* Header & Programme Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            <GraduationCap className="w-3.5 h-3.5" />
            Module 3 — Practice Exams (NCLEX-RN & NCLEX-PN)
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Practice Examination Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, configure, duplicate, preview, and publish Practice Exams for NCLEX-RN and NCLEX-PN candidates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setPathwayTab("all")}
              data-testid="practice-tab-all"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                pathwayTab === "all"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Programmes
            </button>
            <button
              type="button"
              onClick={() => setPathwayTab("rn")}
              data-testid="practice-tab-rn"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                pathwayTab === "rn"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              NCLEX-RN
            </button>
            <button
              type="button"
              onClick={() => setPathwayTab("pn")}
              data-testid="practice-tab-pn"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                pathwayTab === "pn"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              NCLEX-PN
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadPracticeExams}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canModify && (
            <Button
              size="sm"
              onClick={() => openCreateModal()}
              data-testid="create-practice-exam-btn"
              className="bg-teal-600 hover:bg-teal-500 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Practice Exam
            </Button>
          )}
        </div>
      </div>

      {bannerMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-sm ${
            bannerMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Lifecycle Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card border border-border rounded-xl p-4">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search Practice Exams by title or examination code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <select
            aria-label="Filter Practice Exams by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
          >
            <option value="all">All Lifecycle States</option>
            <option value="Draft">Draft</option>
            <option value="InReview">In Review</option>
            <option value="Approved">Approved</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Practice Exams Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
            <p className="text-sm">Loading Practice Exams...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={loadPracticeExams}>
              Retry
            </Button>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <GraduationCap className="w-9 h-9 text-teal-500 mx-auto opacity-75" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">
                No Practice Exams found
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Create a structured NCLEX-RN or NCLEX-PN Practice Exam with Traditional and NGN clinical judgment items.
              </p>
            </div>
            {canModify && (
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => openCreateModal("rn")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New NCLEX-RN Practice Exam
                </Button>
                <Button
                  size="sm"
                  onClick={() => openCreateModal("pn")}
                  className="bg-teal-600 hover:bg-teal-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New NCLEX-PN Practice Exam
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Practice Exam Title</th>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4">Questions & Timing</th>
                  <th className="py-3 px-4">Lifecycle State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {exams.map((exam) => {
                  const rev = exam.latestRevision || exam.currentRevision;
                  const state = rev?.lifecycleState || "Draft";
                  const canDuplicate =
                    state === "Published" ||
                    state === "Approved" ||
                    state === "Archived";
                  return (
                    <tr key={exam.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-teal-600 dark:text-teal-400">
                        {exam.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{exam.title}</div>
                        {rev?.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                            {rev.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            exam.pathway === "pn"
                              ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25 uppercase text-xs"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 uppercase text-xs"
                          }
                        >
                          NCLEX-{exam.pathway}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {rev?.questionCount ?? rev?.targetQuestionCount ?? 85} Qs
                        </span>{" "}
                        • {rev?.timeLimitMinutes ?? 180} min • Pass{" "}
                        {rev?.passingScorePercent ?? 75}%
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            state === "Published"
                              ? "default"
                              : state === "Draft"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {state}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {rev?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewRevisionId(rev.id)}
                              title="Preview Practice Exam"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {canModify && canDuplicate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDuplicateTarget(exam)}
                              title="Duplicate Practice Exam"
                            >
                              <Copy className="w-4 h-4 text-teal-600" />
                            </Button>
                          )}
                          {canModify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(exam)}
                              title="Edit Practice Exam Settings"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}
                          {rev?.id && (
                            <Link
                              href={`/admin/examinations/${exam.id}/revisions/${rev.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20"
                            >
                              Studio
                            </Link>
                          )}
                          {canModify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(exam);
                                setDeleteError(null);
                              }}
                              title="Delete Practice Exam"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
