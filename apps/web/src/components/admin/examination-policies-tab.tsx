"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Save,
  Clock,
  RotateCcw,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import type { BackendExamRevisionDto } from "@/lib/api-services";

interface ExaminationPoliciesTabProps {
  revision: BackendExamRevisionDto;
  isDraft: boolean;
  onConcurrencyTokenChange?: (token: number) => void;
}

export function ExaminationPoliciesTab({
  revision,
  isDraft,
  onConcurrencyTokenChange,
}: ExaminationPoliciesTabProps) {
  const queryClient = useQueryClient();

  const [isAvailable, setIsAvailable] = React.useState(revision.isAvailable ?? true);
  const [availableFrom, setAvailableFrom] = React.useState<string>(
    revision.availableFrom ? revision.availableFrom.slice(0, 16) : ""
  );
  const [availableTo, setAvailableTo] = React.useState<string>(
    revision.availableTo ? revision.availableTo.slice(0, 16) : ""
  );

  const [maxAttempts, setMaxAttempts] = React.useState<string>(
    revision.maxAttemptsAllowed !== null && revision.maxAttemptsAllowed !== undefined
      ? String(revision.maxAttemptsAllowed)
      : ""
  );
  const [retakeCooldownHours, setRetakeCooldownHours] = React.useState<number>(
    revision.retakeCooldownHours ?? 0
  );
  const [allowInterruptedResume, setAllowInterruptedResume] = React.useState(
    revision.allowInterruptedResume ?? true
  );

  const [reviewPolicy, setReviewPolicy] = React.useState(
    revision.reviewPolicy || "AfterExamSubmission"
  );
  const [showRationales, setShowRationales] = React.useState(
    revision.showRationales ?? true
  );
  const [showScoreImmediately, setShowScoreImmediately] = React.useState(
    revision.showScoreImmediately ?? true
  );

  React.useEffect(() => {
    setIsAvailable(revision.isAvailable ?? true);
    setAvailableFrom(revision.availableFrom ? revision.availableFrom.slice(0, 16) : "");
    setAvailableTo(revision.availableTo ? revision.availableTo.slice(0, 16) : "");
    setMaxAttempts(
      revision.maxAttemptsAllowed !== null && revision.maxAttemptsAllowed !== undefined
        ? String(revision.maxAttemptsAllowed)
        : ""
    );
    setRetakeCooldownHours(revision.retakeCooldownHours ?? 0);
    setAllowInterruptedResume(revision.allowInterruptedResume ?? true);
    setReviewPolicy(revision.reviewPolicy || "AfterExamSubmission");
    setShowRationales(revision.showRationales ?? true);
    setShowScoreImmediately(revision.showScoreImmediately ?? true);
  }, [revision]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fromUtc = availableFrom ? new Date(availableFrom).toISOString() : null;
      const toUtc = availableTo ? new Date(availableTo).toISOString() : null;
      const maxAttParsed = maxAttempts.trim() !== "" ? parseInt(maxAttempts, 10) : null;

      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revision.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: revision.title,
          description: revision.description,
          examType: revision.examType,
          timeLimitMinutes: revision.timeLimitMinutes,
          passingScorePercent: revision.passingScorePercent,
          concurrencyToken: revision.concurrencyToken,
          isAvailable,
          availableFrom: fromUtc,
          availableTo: toUtc,
          maxAttemptsAllowed: maxAttParsed,
          retakeCooldownHours: Number(retakeCooldownHours) || 0,
          allowInterruptedResume,
          reviewPolicy,
          showRationales,
          showScoreImmediately,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update examination policies");
      }
      return data;
    },
    onSuccess: (data) => {
      notify.success("Examination policies and availability updated successfully.");
      if (data.revision?.concurrencyToken) {
        onConcurrencyTokenChange?.(data.revision.concurrencyToken);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "examination", "revision", revision.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "examination", "readiness", revision.id] });
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err?.message || "Failed to update policies"));
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Assessment Availability & Delivery Governance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure examination availability windows, retake limits, and candidate result/rationale visibility policies.
          </p>
        </div>
        {isDraft && (
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium self-end sm:self-auto"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saveMutation.isPending ? "Saving..." : "Save Policies"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Availability Section */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Examination Availability Windows
            </h3>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Examination Active / Enabled
              </Label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                When disabled, learners cannot discover or start attempts regardless of dates.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isAvailable}
              disabled={!isDraft}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Available From (Optional)
            </Label>
            <Input
              type="datetime-local"
              value={availableFrom}
              disabled={!isDraft}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Assessment will not be available to candidates before this date and time.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Available To / Expiration (Optional)
            </Label>
            <Input
              type="datetime-local"
              value={availableTo}
              disabled={!isDraft}
              onChange={(e) => setAvailableTo(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Assessment closes for new candidate attempts after this date and time.
            </p>
          </div>
        </div>

        {/* Retake & Attempt Governance */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <RotateCcw className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Attempt Limits & Retake Policies
            </h3>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Max Completed Attempts Per Candidate</span>
              <span className="text-[10px] text-slate-400">Leave blank for unlimited</span>
            </Label>
            <Input
              type="number"
              min={1}
              max={100}
              placeholder="Unlimited"
              value={maxAttempts}
              disabled={!isDraft}
              onChange={(e) => setMaxAttempts(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Maximum completed attempts permitted before the learner is locked out from retaking.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Retake Cooldown (Hours)</span>
              <span className="text-[10px] text-slate-400">0 = Immediate</span>
            </Label>
            <Input
              type="number"
              min={0}
              max={720}
              value={retakeCooldownHours}
              disabled={!isDraft}
              onChange={(e) => setRetakeCooldownHours(parseInt(e.target.value, 10) || 0)}
              className="text-xs"
            />
            <p className="text-[11px] text-slate-400">
              Required waiting time in hours between finishing an attempt and initiating a retake.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Allow Interrupted Resumption
              </Label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Allows candidate to reconnect and resume an active in-progress attempt before deadline.
              </p>
            </div>
            <input
              type="checkbox"
              checked={allowInterruptedResume}
              disabled={!isDraft}
              onChange={(e) => setAllowInterruptedResume(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Review & Result Disclosure Policies */}
        <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Eye className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Result Disclosure & Clinical Review Policies
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Candidate Review Timing Policy
              </Label>
              <select
                value={reviewPolicy}
                disabled={!isDraft}
                onChange={(e) => setReviewPolicy(e.target.value)}
                className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="AfterExamSubmission">After Exam Submission (Standard)</option>
                <option value="Immediate">Immediate / Item-by-item (Study Mode)</option>
                <option value="AfterDeadline">After Assessment Availability Deadline</option>
                <option value="Never">Never (High-Stakes Examination Security)</option>
                <option value="ManualRelease">Manual Release by Instructor</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Controls when candidates are granted access to view questions, their submitted responses, and correctness.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 md:col-span-1">
              <div>
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Show Clinical Rationales
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Disclose detailed clinical explanations and evidence upon review.
                </p>
              </div>
              <input
                type="checkbox"
                checked={showRationales}
                disabled={!isDraft}
                onChange={(e) => setShowRationales(e.target.checked)}
                className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 md:col-span-1">
              <div>
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Show Numerical Score Immediately
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Display final percentage and tier immediately upon finishing.
                </p>
              </div>
              <input
                type="checkbox"
                checked={showScoreImmediately}
                disabled={!isDraft}
                onChange={(e) => setShowScoreImmediately(e.target.checked)}
                className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
