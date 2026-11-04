"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";

export interface EligibleRevisionSummary {
  id: string;
  revisionNumber: number;
  lifecycleState: string;
  questionCount: number;
  title: string;
}

interface DuplicateExaminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examinationId: string;
  examinationCode: string;
  examinationTitle: string;
  examinationPathway: string;
  eligibleRevisions: EligibleRevisionSummary[];
  defaultSourceRevisionId?: string;
}

export function DuplicateExaminationDialog({
  open,
  onOpenChange,
  examinationId,
  examinationCode,
  examinationTitle,
  examinationPathway,
  eligibleRevisions,
  defaultSourceRevisionId,
}: DuplicateExaminationDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = React.useState("");
  const [sourceRevisionId, setSourceRevisionId] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      setTitle(`${examinationTitle || "Examination"} (Copy)`);
      if (defaultSourceRevisionId && eligibleRevisions.some((r) => r.id === defaultSourceRevisionId)) {
        setSourceRevisionId(defaultSourceRevisionId);
      } else {
        const published = eligibleRevisions.find(
          (r) => r.lifecycleState.toLowerCase() === "published"
        );
        const fallback = published || eligibleRevisions[0];
        if (fallback) {
          setSourceRevisionId(fallback.id);
        } else {
          setSourceRevisionId("");
        }
      }
    }
  }, [open, examinationTitle, defaultSourceRevisionId, eligibleRevisions]);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/examinations/${encodeURIComponent(examinationId)}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            sourceRevisionId: sourceRevisionId || undefined,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to duplicate examination");
      }

      return res.json();
    },
    onSuccess: (data) => {
      notify.success(`Examination duplicated as ${data.examinationCode}.`);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] });
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", examinationId] });
      if (data?.examinationId) {
        router.push(`/admin/examinations/${encodeURIComponent(data.examinationId)}`);
      }
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err.message));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicate as New Examination Family</DialogTitle>
          <DialogDescription>
            Creates an independent examination family with a newly allocated permanent code (
            {examinationPathway.toUpperCase()}-EX-XXXXXX) starting at Revision 1.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
            <p className="font-semibold">Independent Identity & Clean Lineage</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-indigo-800 dark:text-indigo-300">
              <li>Allocates a new permanent examination code from the sequence generator.</li>
              <li>Initializes Revision 1 in Draft lifecycle state.</li>
              <li>Copies question memberships and preserves ordering from source.</li>
              <li>Candidate attempts and historical statistics are NOT copied (0 attempts).</li>
              <li>Original examination ({examinationCode}) remains completely untouched.</li>
            </ul>
          </div>

          <div>
            <Label htmlFor="dup-title" className="text-xs font-semibold">
              New Examination Family Title *
            </Label>
            <Input
              id="dup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              placeholder="e.g. NCLEX-RN Comprehensive Readiness Exam (Copy)"
              maxLength={128}
              disabled={duplicateMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="dup-source" className="text-xs font-semibold">
              Source Revision *
            </Label>
            <select
              id="dup-source"
              value={sourceRevisionId}
              onChange={(e) => setSourceRevisionId(e.target.value)}
              disabled={duplicateMutation.isPending || eligibleRevisions.length === 0}
              className="w-full mt-1 px-3 py-2 text-xs border rounded-md border-slate-300 dark:border-slate-800 bg-background text-foreground"
            >
              {eligibleRevisions.length > 0 ? (
                eligibleRevisions.map((r) => (
                  <option key={r.id} value={r.id}>
                    Rev {r.revisionNumber} ({r.lifecycleState}) — {r.questionCount} Questions — {r.title}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No eligible source revisions available
                </option>
              )}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Only Published, Approved, or Archived revisions can be duplicated into a new family.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={duplicateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => duplicateMutation.mutate()}
            disabled={
              !title.trim() ||
              !sourceRevisionId ||
              duplicateMutation.isPending ||
              eligibleRevisions.length === 0
            }
            className="bg-[#142B4A] hover:bg-[#1E3A8A] text-white"
          >
            {duplicateMutation.isPending ? "Duplicating..." : "Duplicate Examination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
