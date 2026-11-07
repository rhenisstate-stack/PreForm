"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Edit3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Gauge,
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

export interface ReadinessThresholdsState {
  lowMin: number;
  lowMax: number;
  borderlineMin: number;
  borderlineMax: number;
  highMin: number;
  highMax: number;
  veryHighMin: number;
  veryHighMax: number;
}

const DEFAULT_THRESHOLDS: ReadinessThresholdsState = {
  lowMin: 0,
  lowMax: 54,
  borderlineMin: 55,
  borderlineMax: 64,
  highMin: 65,
  highMax: 79,
  veryHighMin: 80,
  veryHighMax: 100,
};

export function validateReadinessThresholds(
  t: ReadinessThresholdsState
): string | null {
  if (
    t.lowMin < 0 ||
    t.veryHighMax > 100 ||
    t.lowMin > t.lowMax ||
    t.lowMax >= t.borderlineMin ||
    t.borderlineMin > t.borderlineMax ||
    t.borderlineMax >= t.highMin ||
    t.highMin > t.highMax ||
    t.highMax >= t.veryHighMin ||
    t.veryHighMin > t.veryHighMax
  ) {
    return "Readiness classification thresholds must be non-overlapping and strictly ordered between 0% and 100% (Low < Borderline < High < Very High).";
  }
  return null;
}

interface RatsManagementWorkspaceProps {
  canModify?: boolean;
  onExamCatalogChanged?: () => void;
}

export function RatsManagementWorkspace({
  canModify = true,
  onExamCatalogChanged,
}: RatsManagementWorkspaceProps) {
  const [rats, setRats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [pathwayFilter, setPathwayFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create / Configure RAT Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [pathway, setPathway] = useState<"rn" | "pn">("rn");
  const [description, setDescription] = useState("");
  const [assessmentObjectives, setAssessmentObjectives] = useState(
    "Evaluate baseline NCLEX clinical judgment readiness\nIdentify priority Client Needs remediation areas"
  );
  const [targetQuestionCount, setTargetQuestionCount] = useState(75);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(120);
  const [passingScorePercent, setPassingScorePercent] = useState(72);
  const [selectionStrategy, setSelectionStrategy] = useState<"Preset" | "DynamicBalanced">(
    "DynamicBalanced"
  );
  const [maxAttemptsAllowed, setMaxAttemptsAllowed] = useState(3);
  const [showRationales, setShowRationales] = useState(true);
  const [thresholds, setThresholds] =
    useState<ReadinessThresholdsState>(DEFAULT_THRESHOLDS);
  const [eligibleQuestions, setEligibleQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview & Delete
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadRats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ module: "rats", pageSize: "50" });
      if (pathwayFilter !== "all") params.set("pathway", pathwayFilter);
      if (statusFilter !== "all") params.set("revisionStatus", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/examinations?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to load Readiness Assessment Tests.");
      }
      setRats(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setError(err.message || "Failed to load Readiness Assessment Tests.");
    } finally {
      setLoading(false);
    }
  }, [pathwayFilter, statusFilter, searchQuery]);

  const loadQuestionsForPathway = useCallback(async (targetPathway: string) => {
    try {
      const res = await fetch(
        `/api/admin/examinations/eligible-questions?pathway=${targetPathway}`
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.questions)) {
        setEligibleQuestions(data.questions);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadRats();
  }, [loadRats]);

  useEffect(() => {
    if (modalOpen) {
      loadQuestionsForPathway(pathway);
    }
  }, [modalOpen, pathway, loadQuestionsForPathway]);

  const openCreateRatModal = () => {
    setEditingExam(null);
    setTitle("");
    setPathway("rn");
    setDescription("");
    setAssessmentObjectives(
      "Evaluate baseline NCLEX clinical judgment readiness\nIdentify priority Client Needs remediation areas"
    );
    setTargetQuestionCount(75);
    setTimeLimitMinutes(120);
    setPassingScorePercent(72);
    setSelectionStrategy("DynamicBalanced");
    setMaxAttemptsAllowed(3);
    setShowRationales(true);
    setThresholds({ ...DEFAULT_THRESHOLDS });
    setSelectedQuestionIds([]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditRatModal = (exam: any) => {
    const rev = exam.latestRevision || exam.currentRevision;
    setEditingExam(exam);
    setTitle(exam.title || "");
    setPathway(exam.pathway === "pn" ? "pn" : "rn");
    setDescription(rev?.description || "");
    setTargetQuestionCount(rev?.targetQuestionCount || rev?.questionCount || 75);
    setTimeLimitMinutes(rev?.timeLimitMinutes ?? 120);
    setPassingScorePercent(rev?.passingScorePercent ?? 72);
    setSelectionStrategy(
      rev?.selectionStrategy === "Preset" ? "Preset" : "DynamicBalanced"
    );
    setMaxAttemptsAllowed(rev?.maxAttemptsAllowed ?? 3);
    setShowRationales(rev?.showRationales ?? true);

    let parsedThresholds = { ...DEFAULT_THRESHOLDS };
    let parsedObjectives =
      "Evaluate baseline NCLEX clinical judgment readiness\nIdentify priority Client Needs remediation areas";
    if (rev?.compositionRulesJson) {
      try {
        const parsed = JSON.parse(rev.compositionRulesJson);
        if (parsed.readinessThresholds) {
          const rt = parsed.readinessThresholds;
          parsedThresholds = {
            lowMin: Number(rt.lowMin ?? rt.lowMinPercent ?? 0),
            lowMax: Number(rt.lowMax ?? rt.lowMaxPercent ?? 54),
            borderlineMin: Number(rt.borderlineMin ?? rt.borderlineMinPercent ?? 55),
            borderlineMax: Number(rt.borderlineMax ?? rt.borderlineMaxPercent ?? 64),
            highMin: Number(rt.highMin ?? rt.highMinPercent ?? 65),
            highMax: Number(rt.highMax ?? rt.highMaxPercent ?? 79),
            veryHighMin: Number(rt.veryHighMin ?? rt.veryHighMinPercent ?? 80),
            veryHighMax: Number(rt.veryHighMax ?? rt.veryHighMaxPercent ?? 100),
          };
        }
        if (parsed.assessmentObjectives) {
          parsedObjectives = Array.isArray(parsed.assessmentObjectives)
            ? parsed.assessmentObjectives.join("\n")
            : String(parsed.assessmentObjectives);
        }
      } catch {
        // use defaults
      }
    }
    setThresholds(parsedThresholds);
    setAssessmentObjectives(parsedObjectives);
    setSelectedQuestionIds([]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveRat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("RAT title is required.");
      return;
    }

    const thresholdValidationError = validateReadinessThresholds(thresholds);
    if (thresholdValidationError) {
      setFormError(thresholdValidationError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const compositionPayload = {
        targetQuestionCount:
          selectedQuestionIds.length > 0
            ? selectedQuestionIds.length
            : Number(targetQuestionCount) || 75,
        selectionStrategy,
        assessmentObjectives: assessmentObjectives.trim(),
        readinessThresholds: {
          lowMin: thresholds.lowMin,
          lowMax: thresholds.lowMax,
          borderlineMin: thresholds.borderlineMin,
          borderlineMax: thresholds.borderlineMax,
          highMin: thresholds.highMin,
          highMax: thresholds.highMax,
          veryHighMin: thresholds.veryHighMin,
          veryHighMax: thresholds.veryHighMax,
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
            examType: 4, // ExamType.DiagnosticReadiness (RAT)
            timeLimitMinutes: Number(timeLimitMinutes) || 120,
            passingScorePercent: Number(passingScorePercent) || 72,
            targetQuestionCount: compositionPayload.targetQuestionCount,
            selectionStrategy,
            compositionRulesJson: JSON.stringify(compositionPayload),
            questionIds: selectedQuestionIds,
            isAvailable: true,
            maxAttemptsAllowed: Number(maxAttemptsAllowed) || 3,
            reviewPolicy: "AfterExamSubmission",
            showRationales,
            showScoreImmediately: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          throw new Error(data.error || "Failed to create Readiness Assessment Test.");
        }

        setModalOpen(false);
        setBannerMessage({
          type: "success",
          text: `Readiness Assessment Test "${title.trim()}" created with validated readiness thresholds.`,
        });
      } else {
        // Update family title + revision composition if Draft
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

          const compPut = await fetch(
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
          const compPutData = await compPut.json().catch(() => ({}));
          if (!compPut.ok || compPutData.success === false) {
            throw new Error(
              compPutData.error || "Failed to update RAT readiness thresholds."
            );
          }
        }

        setModalOpen(false);
        setBannerMessage({
          type: "success",
          text: `Readiness Assessment Test "${title.trim()}" updated.`,
        });
      }

      await loadRats();
      onExamCatalogChanged?.();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Readiness Assessment Test.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRat = async () => {
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
            "Cannot delete this RAT because learner attempts or publication history exist. Archive it instead to protect historical scores."
        );
        return;
      }

      setBannerMessage({
        type: "success",
        text: `Readiness Assessment Test "${deleteTarget.title}" deleted.`,
      });
      setDeleteTarget(null);
      await loadRats();
      onExamCatalogChanged?.();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete RAT.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 space-y-6" data-testid="rats-management-workspace">
      {previewRevisionId ? (
        <ExaminationPreviewDialog
          revisionId={previewRevisionId}
          open={!!previewRevisionId}
          onOpenChange={(open) => !open && setPreviewRevisionId(null)}
        />
      ) : deleteTarget ? (
        <FullPageDeleteLayout
          data-testid="rats-delete-fullpage"
          title="Delete Readiness Assessment Test"
          description={`Confirm removal of ${deleteTarget.title} (${deleteTarget.code}).`}
          recordTitle={deleteTarget.title}
          recordSubtitle={`Code: ${deleteTarget.code}`}
          consequences={[
            "Draft Readiness Assessment Tests with zero learner attempts are permanently deleted.",
            "Published RATS or RATS with historical learner readiness scores are protected and must be archived instead.",
          ]}
          dependencyNotice={
            deleteError && (
              <div className="text-amber-800 dark:text-amber-300 font-medium">
                {deleteError}
              </div>
            )
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirmDelete={handleDeleteRat}
          confirmDeleteLabel={deleteSubmitting ? "Deleting..." : "Confirm Delete"}
          isSubmitting={deleteSubmitting}
        />
      ) : modalOpen ? (
        <FullPageFormLayout
          data-testid="rats-form-fullpage"
          eyebrow="Module 2 — Readiness Assessment Tests (RATS)"
          title={
            editingExam
              ? "Configure Readiness Assessment Test (RAT)"
              : "Create Readiness Assessment Test (RAT)"
          }
          description="Configure RAT clinical parameters and non-overlapping Readiness Classification Thresholds (Low, Borderline, High, Very High)."
          backLabel="Return to RATS Catalogue"
          onBack={() => setModalOpen(false)}
        >
          <form onSubmit={handleSaveRat} className="w-full max-w-none space-y-6">
            {formError && (
              <div
                data-testid="rat-form-error"
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400"
              >
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="rat-title">RAT Title *</Label>
                <Input
                  id="rat-title"
                  placeholder="e.g., NCLEX-RN Comprehensive Readiness Assessment #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rat-pathway">Programme *</Label>
                <select
                  id="rat-pathway"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="rat-desc">Instructions & Description</Label>
                <textarea
                  id="rat-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Candidate instructions for this Readiness Assessment..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rat-objectives">Assessment Objectives</Label>
                <textarea
                  id="rat-objectives"
                  rows={3}
                  value={assessmentObjectives}
                  onChange={(e) => setAssessmentObjectives(e.target.value)}
                  placeholder="One objective per line..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rat-qcount" className="text-xs">
                  Question Count
                </Label>
                <Input
                  id="rat-qcount"
                  type="number"
                  min={1}
                  max={265}
                  value={targetQuestionCount}
                  onChange={(e) => setTargetQuestionCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rat-duration" className="text-xs">
                  Duration (Min)
                </Label>
                <Input
                  id="rat-duration"
                  type="number"
                  min={0}
                  max={720}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rat-pass" className="text-xs">
                  Benchmark (%)
                </Label>
                <Input
                  id="rat-pass"
                  type="number"
                  min={1}
                  max={100}
                  value={passingScorePercent}
                  onChange={(e) => setPassingScorePercent(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rat-attempts" className="text-xs">
                  Max Attempts
                </Label>
                <Input
                  id="rat-attempts"
                  type="number"
                  min={1}
                  max={50}
                  value={maxAttemptsAllowed}
                  onChange={(e) => setMaxAttemptsAllowed(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Readiness Classification Thresholds */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" />
                  Readiness Classification Thresholds (0% – 100%)
                </div>
                <span className="text-xs text-muted-foreground">
                  Must be non-overlapping and strictly ordered
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-red-500/25 bg-background space-y-1.5">
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    1. Low Readiness (%)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      aria-label="Low Readiness Min"
                      type="number"
                      value={thresholds.lowMin}
                      onChange={(e) =>
                        setThresholds((t) => ({ ...t, lowMin: Number(e.target.value) }))
                      }
                      className="h-8 text-xs"
                    />
                    <span>–</span>
                    <Input
                      aria-label="Low Readiness Max"
                      type="number"
                      value={thresholds.lowMax}
                      onChange={(e) =>
                        setThresholds((t) => ({ ...t, lowMax: Number(e.target.value) }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-500/25 bg-background space-y-1.5">
                  <div className="font-semibold text-amber-600 dark:text-amber-400">
                    2. Borderline (%)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      aria-label="Borderline Readiness Min"
                      type="number"
                      value={thresholds.borderlineMin}
                      onChange={(e) =>
                        setThresholds((t) => ({
                          ...t,
                          borderlineMin: Number(e.target.value),
                        }))
                      }
                      className="h-8 text-xs"
                    />
                    <span>–</span>
                    <Input
                      aria-label="Borderline Readiness Max"
                      type="number"
                      value={thresholds.borderlineMax}
                      onChange={(e) =>
                        setThresholds((t) => ({
                          ...t,
                          borderlineMax: Number(e.target.value),
                        }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-indigo-500/25 bg-background space-y-1.5">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                    3. High Readiness (%)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      aria-label="High Readiness Min"
                      type="number"
                      value={thresholds.highMin}
                      onChange={(e) =>
                        setThresholds((t) => ({ ...t, highMin: Number(e.target.value) }))
                      }
                      className="h-8 text-xs"
                    />
                    <span>–</span>
                    <Input
                      aria-label="High Readiness Max"
                      type="number"
                      value={thresholds.highMax}
                      onChange={(e) =>
                        setThresholds((t) => ({ ...t, highMax: Number(e.target.value) }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/25 bg-background space-y-1.5">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    4. Very High (%)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      aria-label="Very High Readiness Min"
                      type="number"
                      value={thresholds.veryHighMin}
                      onChange={(e) =>
                        setThresholds((t) => ({
                          ...t,
                          veryHighMin: Number(e.target.value),
                        }))
                      }
                      className="h-8 text-xs"
                    />
                    <span>–</span>
                    <Input
                      aria-label="Very High Readiness Max"
                      type="number"
                      value={thresholds.veryHighMax}
                      onChange={(e) =>
                        setThresholds((t) => ({
                          ...t,
                          veryHighMax: Number(e.target.value),
                        }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {!editingExam && eligibleQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Label>Optional Curated Questions from Question Repository</Label>
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
                          {q.difficulty}
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
                  data-testid="save-rat-btn"
                  className="bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {submitting
                    ? "Saving..."
                    : editingExam
                      ? "Save RAT Configuration"
                      : "Create Readiness Assessment"}
                </Button>
              }
            />
          </form>
        </FullPageFormLayout>
      ) : (
        <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            <Activity className="w-3.5 h-3.5" />
            Module 2 — Readiness Assessment Tests (RATS)
          </div>
          <h2 className="text-xl font-bold text-foreground">
            RATS Management & Readiness Threshold Governance
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, configure, publish, and govern NCLEX-RN and NCLEX-PN Readiness Assessment Tests while preserving learner readiness scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRats}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canModify && (
            <Button
              size="sm"
              onClick={openCreateRatModal}
              data-testid="create-rat-btn"
              className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Readiness Assessment (RAT)
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

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card border border-border rounded-xl p-4">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search Readiness Assessment Tests by title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <select
            aria-label="Filter RATS by Pathway"
            value={pathwayFilter}
            onChange={(e) => setPathwayFilter(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
          >
            <option value="all">All Programmes (RN & PN)</option>
            <option value="rn">NCLEX-RN</option>
            <option value="pn">NCLEX-PN</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Filter RATS by Status"
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

      {/* RATS Catalogue Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
            <p className="text-sm">Loading Readiness Assessment Tests...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={loadRats}>
              Retry
            </Button>
          </div>
        ) : rats.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="w-9 h-9 text-amber-500 mx-auto opacity-75" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">
                No Readiness Assessment Tests (RATS) found
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Create a Readiness Assessment Test with calibrated Low, Borderline, High, and Very High readiness classification bands.
              </p>
            </div>
            {canModify && (
              <Button
                size="sm"
                onClick={openCreateRatModal}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create First RAT Assessment
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">RAT Assessment Title</th>
                  <th className="py-3 px-4">Programme</th>
                  <th className="py-3 px-4">Questions & Duration</th>
                  <th className="py-3 px-4">Benchmark & Bands</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {rats.map((rat) => {
                  const rev = rat.latestRevision || rat.currentRevision;
                  const state = rev?.lifecycleState || "Draft";
                  return (
                    <tr key={rat.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {rat.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{rat.title}</div>
                        {rev?.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                            {rev.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="uppercase text-xs">
                          NCLEX-{rat.pathway}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {rev?.questionCount ?? rev?.targetQuestionCount ?? 75} Qs
                        </span>{" "}
                        • {rev?.timeLimitMinutes ?? 120} min
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          Pass {rev?.passingScorePercent ?? 72}% • 4 Bands
                        </Badge>
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
                              title="Preview RAT"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {canModify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditRatModal(rat)}
                              title="Edit RAT Thresholds & Settings"
                            >
                              <Gauge className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          {rev?.id && (
                            <Link
                              href={`/admin/examinations/${rat.id}/revisions/${rev.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Studio
                            </Link>
                          )}
                          {canModify && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(rat);
                                setDeleteError(null);
                              }}
                              title="Delete RAT"
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
