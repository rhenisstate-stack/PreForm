"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  X,
  FileCheck,
  Check,
  ShieldAlert,
  Clock,
  Layers,
  Archive,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Copy,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { getAdminCapabilities } from "@/lib/admin/authz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BackendExamRevisionDto,
  BackendExamQuestionMembershipDto,
  BackendRevisionValidationDto,
} from "@/lib/api-services";
import { QuestionPickerDialog } from "@/components/admin/question-picker-dialog";
import { DuplicateExaminationDialog } from "@/components/admin/duplicate-examination-dialog";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";

function getStatusBadge(state?: string) {
  switch (state?.toLowerCase()) {
    case "published":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Published</Badge>;
    case "approved":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">Approved</Badge>;
    case "inreview":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">In Review</Badge>;
    case "archived":
      return <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30">Archived</Badge>;
    case "retired":
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">Retired</Badge>;
    case "draft":
    default:
      return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30">Draft</Badge>;
  }
}

export function AdminRevisionStudioClient({
  familyId,
  revisionId,
}: {
  familyId: string;
  revisionId: string;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const capabilities = getAdminCapabilities(user?.role);

  // Active Tab: "metadata" | "questions" | "validation"
  const [activeTab, setActiveTab] = React.useState<"metadata" | "questions" | "validation">("metadata");
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  // Metadata form
  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  const [metaExamType, setMetaExamType] = React.useState(0);
  const [metaTimeLimit, setMetaTimeLimit] = React.useState(60);
  const [metaPassingScore, setMetaPassingScore] = React.useState(75.0);

  // Modals for lifecycle actions
  const [lifecycleModal, setLifecycleModal] = React.useState<{
    action: string;
    title: string;
    description: string;
    requireReason?: boolean;
    requireNotes?: boolean;
    buttonText: string;
    variant?: "default" | "destructive";
  } | null>(null);

  const [lifecycleReason, setLifecycleReason] = React.useState("");
  const [lifecycleNotes, setLifecycleNotes] = React.useState("");
  const [isDiscardOpen, setIsDiscardOpen] = React.useState(false);
  const [questionToRemove, setQuestionToRemove] = React.useState<{
    questionId: string;
    position: number;
    stem?: string;
  } | null>(null);
  const [isDuplicateOpen, setIsDuplicateOpen] = React.useState(false);

  // Fetch Revision
  const {
    data: revision,
    isLoading: isLoadingRev,
    error: revError,
    refetch: refetchRev,
  } = useQuery<BackendExamRevisionDto>({
    queryKey: ["admin-revision", revisionId],
    queryFn: async (): Promise<BackendExamRevisionDto> => {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}`);
      if (!res.ok) throw new Error("Failed to load exam revision");
      const data = await res.json();
      return data.revision;
    },
    enabled: isAuthenticated && capabilities.canViewExaminations,
  });

  // Fetch Questions
  const {
    data: questions = [],
    isLoading: isLoadingQuestions,
    refetch: refetchQuestions,
  } = useQuery<BackendExamQuestionMembershipDto[]>({
    queryKey: ["admin-revision-questions", revisionId],
    queryFn: async (): Promise<BackendExamQuestionMembershipDto[]> => {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/questions`);
      if (!res.ok) throw new Error("Failed to load revision questions");
      const data = await res.json();
      return data.questions || [];
    },
    enabled: isAuthenticated && capabilities.canViewExaminations,
  });

  // Fetch Validation status
  const {
    data: validationResult,
    refetch: refetchValidation,
  } = useQuery<BackendRevisionValidationDto>({
    queryKey: ["admin-revision-validation", revisionId],
    queryFn: async (): Promise<BackendRevisionValidationDto> => {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/validate`);
      if (!res.ok) throw new Error("Failed to validate revision");
      const data = await res.json();
      return data.validation;
    },
    enabled: isAuthenticated && capabilities.canViewExaminations,
  });

  // Fetch Sibling Revisions for Family
  const { data: familyData } = useQuery<{
    examination: {
      id: string;
      code: string;
      title: string;
      pathway: string;
      revisions: BackendExamRevisionDto[];
    };
  }>({
    queryKey: ["admin-examination-family", familyId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/examinations/${encodeURIComponent(familyId)}`);
      if (!res.ok)
        return {
          examination: {
            id: familyId,
            code: "",
            title: "",
            pathway: "",
            revisions: [],
          },
        };
      return res.json();
    },
    enabled: isAuthenticated && capabilities.canViewExaminations && Boolean(familyId),
  });

  const siblingRevisions = familyData?.examination?.revisions || [];

  const eligibleRevisions = React.useMemo(() => {
    return (
      siblingRevisions.filter((r) => {
        const st = r.lifecycleState.toLowerCase();
        return st === "published" || st === "approved" || st === "archived";
      }) || []
    );
  }, [siblingRevisions]);

  React.useEffect(() => {
    if (revision) {
      setMetaTitle(revision.title);
      setMetaDescription(revision.description);
      setMetaExamType(revision.examType);
      setMetaTimeLimit(revision.timeLimitMinutes);
      setMetaPassingScore(revision.passingScorePercent);
    }
  }, [revision]);

  const isDirty = Boolean(
    revision &&
      (metaTitle !== revision.title ||
        metaDescription !== (revision.description || "") ||
        metaExamType !== revision.examType ||
        metaTimeLimit !== revision.timeLimitMinutes ||
        metaPassingScore !== revision.passingScorePercent)
  );

  // Mutations
  const updateMetaMutation = useMutation({
    mutationFn: async () => {
      if (!revision) return;
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: metaTitle,
          description: metaDescription,
          examType: metaExamType,
          timeLimitMinutes: metaTimeLimit,
          passingScorePercent: metaPassingScore,
          concurrencyToken: revision.concurrencyToken,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update revision metadata");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Draft revision metadata saved.");
      queryClient.invalidateQueries({ queryKey: ["admin-revision", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-revision-validation", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", familyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] });
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("concurrency") || msg.includes("token")) {
        notify.error("Revision was modified concurrently. Reloading latest data...");
        refetchRev();
        refetchQuestions();
        refetchValidation();
      } else {
        notify.error(sanitizeErrorMessage(msg));
      }
    },
  });

  const removeQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (!revision) return;
      const res = await fetch(
        `/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/questions/${encodeURIComponent(questionId)}?concurrencyToken=${revision.concurrencyToken}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove question");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Question removed from examination.");
      setQuestionToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["admin-revision", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-revision-questions", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-revision-validation", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", familyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] });
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("concurrency") || msg.includes("token")) {
        notify.error("Question membership was modified concurrently. Reloading latest data...");
        refetchRev();
        refetchQuestions();
        refetchValidation();
      } else {
        notify.error(sanitizeErrorMessage(msg));
      }
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: Array<{ questionId: string; displayOrder: number }>) => {
      if (!revision) return;
      const res = await fetch(
        `/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/questions/order`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            concurrencyToken: revision.concurrencyToken,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reorder questions");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Question order updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-revision", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-revision-questions", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", familyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] });
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("concurrency") || msg.includes("token")) {
        notify.error("Question ordering was modified concurrently. Reloading latest data...");
        refetchRev();
        refetchQuestions();
        refetchValidation();
      } else {
        notify.error(sanitizeErrorMessage(msg));
      }
    },
  });

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if (!questions || questions.length <= 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const list = [...questions];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const items = list.map((q, idx) => ({
      questionId: q.questionId,
      displayOrder: idx + 1,
    }));

    reorderMutation.mutate(items);
  };

  const discardMutation = useMutation({
    mutationFn: async () => {
      if (!revision) return;
      const res = await fetch(
        `/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}?concurrencyToken=${revision.concurrencyToken}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to discard draft revision");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Draft revision discarded.");
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", familyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] });
      router.push(`/admin/examinations/${encodeURIComponent(familyId)}`);
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err.message));
    },
  });

  const lifecycleTransitionMutation = useMutation({
    mutationFn: async () => {
      if (!revision || !lifecycleModal) return;
      const res = await fetch(
        `/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/${lifecycleModal.action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concurrencyToken: revision.concurrencyToken,
            reason: lifecycleReason,
            notes: lifecycleNotes,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${lifecycleModal.action} revision`);
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success(`Revision transition completed.`);
      setLifecycleModal(null);
      setLifecycleReason("");
      setLifecycleNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-revision", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-revision-validation", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", familyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] });
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("concurrency") || msg.includes("token")) {
        notify.error("Revision lifecycle was modified concurrently. Reloading latest data...");
        refetchRev();
        refetchQuestions();
        refetchValidation();
      } else {
        notify.error(sanitizeErrorMessage(msg));
      }
    },
  });

  if (isLoading) {
    return <BrandedLoading message="Verifying credentials..." />;
  }

  if (!isAuthenticated || !capabilities.canViewExaminations) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <ShieldAlert className="h-14 w-14 text-rose-500 mb-4" />
        <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">
          Access Restricted
        </h2>
        <Link href="/admin">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (isLoadingRev) {
    return (
      <div className="py-16 flex justify-center">
        <BrandedLoading message="Loading revision studio..." />
      </div>
    );
  }

  if (revError || !revision) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-12 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">Revision Not Found</h3>
        <Link href={`/admin/examinations/${familyId}`}>
          <Button variant="outline" size="sm" className="mt-4">
            <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Back to Lineage
          </Button>
        </Link>
      </div>
    );
  }

  const isDraft = revision.lifecycleState.toLowerCase() === "draft";
  const isInReview = revision.lifecycleState.toLowerCase() === "inreview";
  const isApproved = revision.lifecycleState.toLowerCase() === "approved";
  const isPublished = revision.lifecycleState.toLowerCase() === "published";
  const isArchived = revision.lifecycleState.toLowerCase() === "archived";
  const isRetired = revision.lifecycleState.toLowerCase() === "retired";

  // Separation of duties check
  const isCreator = user?.id === revision.createdBy;
  const canApprove = capabilities.canApproveExaminations && !isCreator;

  const existingIds = new Set(questions.map((q) => q.questionId));

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Family Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={`/admin/examinations/${encodeURIComponent(familyId)}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lineage Studio ({revision.examinationCode || familyId.slice(0, 8)})
        </Link>
        <div className="flex items-center gap-3">
          {siblingRevisions.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium hidden sm:inline">Switch Revision:</span>
              <select
                aria-label="Switch examination revision"
                value={revisionId}
                onChange={(e) => {
                  if (e.target.value && e.target.value !== revisionId) {
                    router.push(
                      `/admin/examinations/${encodeURIComponent(familyId)}/revisions/${encodeURIComponent(e.target.value)}`
                    );
                  }
                }}
                className="bg-background border border-border text-foreground text-xs rounded-md px-2 py-1 font-mono"
              >
                {siblingRevisions.map((r) => (
                  <option key={r.id} value={r.id}>
                    Rev {r.revisionNumber} ({r.lifecycleState})
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="font-mono text-xs text-slate-400">
            Token: #{revision.concurrencyToken}
          </span>
        </div>
      </div>

      {!capabilities.canManageExaminations && capabilities.canViewExaminations && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-blue-500 shrink-0" />
          <span>
            Viewing in Clinical Review & Audit Mode. Authoring controls are restricted to examination managers and administrators.
          </span>
        </div>
      )}

      {/* Sticky Studio Header with Lifecycle Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                {revision.examinationCode}
              </span>
              <Badge variant="outline" className="text-xs uppercase font-bold border-teal-500/30 text-teal-700 dark:text-teal-300">
                {revision.pathway.toUpperCase()}
              </Badge>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Revision {revision.revisionNumber}
              </span>
              {getStatusBadge(revision.lifecycleState)}
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#142B4A] dark:text-white">
              {revision.title}
            </h1>
          </div>

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && capabilities.canManageExaminations && (
              <>
                <Button
                  onClick={() => setIsDiscardOpen(true)}
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Discard Draft
                </Button>
                <Button
                  onClick={() =>
                    setLifecycleModal({
                      action: "submit",
                      title: "Submit Revision for Review",
                      description: "Transfers this draft revision to the InReview lifecycle state for formal clinical validation.",
                      buttonText: "Submit Revision",
                    })
                  }
                  size="sm"
                  disabled={!validationResult?.isValid}
                  className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs gap-1.5"
                  title={
                    !validationResult?.isValid
                      ? "Pre-flight validation requirements must be resolved in Tab 3 before submitting for review."
                      : "Submit this draft revision for clinical review"
                  }
                >
                  <Send className="h-3.5 w-3.5" /> Submit for Review
                </Button>
              </>
            )}

            {isInReview && (
              <>
                {capabilities.canReviewExaminations && (
                  <>
                    <Button
                      onClick={() =>
                        setLifecycleModal({
                          action: "return",
                          title: "Return Revision for Changes",
                          description: "Returns revision to Draft state for author remediation. A clear clinical reason is required.",
                          requireReason: true,
                          buttonText: "Return for Changes",
                          variant: "destructive",
                        })
                      }
                      variant="outline"
                      size="sm"
                      className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs"
                    >
                      Return to Draft
                    </Button>
                    <Button
                      onClick={() =>
                        setLifecycleModal({
                          action: "recommend",
                          title: "Recommend Approval",
                          description: "Records an advisory recommendation in the audit log that this revision meets clinical standards.",
                          requireNotes: true,
                          buttonText: "Submit Recommendation",
                        })
                      }
                      variant="outline"
                      size="sm"
                      className="border-teal-500/30 text-teal-700 hover:bg-teal-50 text-xs"
                    >
                      Recommend Approval
                    </Button>
                  </>
                )}

                {capabilities.canApproveExaminations && (
                  <div className="relative group">
                    <Button
                      onClick={() =>
                        setLifecycleModal({
                          action: "approve",
                          title: "Approve Revision",
                          description: "Approves revision for publication. Under separation of duties, the author who created this revision cannot approve it.",
                          buttonText: "Approve Revision",
                        })
                      }
                      size="sm"
                      disabled={!canApprove}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    {!canApprove && isCreator && (
                      <span className="absolute -bottom-8 right-0 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-50">
                        Separation of duties: Creator cannot approve own revision
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {isApproved && capabilities.canPublishExaminations && (
              <Button
                onClick={() =>
                  setLifecycleModal({
                    action: "publish",
                    title: "Publish Examination Revision",
                    description: "Publishes this revision as the authoritative active examination. Any previously published revision will be archived atomically.",
                    buttonText: "Publish Now",
                  })
                }
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Publish Examination
              </Button>
            )}

            {isPublished && capabilities.canPublishExaminations && (
              <Button
                onClick={() =>
                  setLifecycleModal({
                    action: "archive",
                    title: "Archive Published Revision",
                    description: "Deprecates this revision from active candidate delivery. In-progress attempts are captured and preserved.",
                    requireReason: true,
                    buttonText: "Archive Revision",
                  })
                }
                size="sm"
                variant="outline"
                className="text-slate-700 border-slate-300 text-xs"
              >
                <Archive className="h-3.5 w-3.5 mr-1" /> Archive Revision
              </Button>
            )}

            {isArchived && capabilities.canPublishExaminations && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    setLifecycleModal({
                      action: "restore",
                      title: "Superadmin Restore Override",
                      description: "Restores archived revision to Published status (allowed within 30 days of archival if no other revision is published).",
                      requireReason: true,
                      buttonText: "Restore to Published",
                    })
                  }
                  size="sm"
                  variant="outline"
                  className="text-teal-700 border-teal-300 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                </Button>
                <Button
                  onClick={() =>
                    setLifecycleModal({
                      action: "retire",
                      title: "Permanently Retire Revision",
                      description: "Permanently transitions revision to terminal Retired state. It cannot be un-retired.",
                      requireReason: true,
                      buttonText: "Retire Permanently",
                      variant: "destructive",
                    })
                  }
                  size="sm"
                  variant="outline"
                  className="text-rose-700 border-rose-300 text-xs"
                >
                  Retire
                </Button>
              </div>
            )}

            {capabilities.canManageExaminations && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDuplicateOpen(true)}
                disabled={eligibleRevisions.length === 0}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
                title={
                  eligibleRevisions.length === 0
                    ? "No eligible (Published, Approved, or Archived) revisions available in this family to duplicate"
                    : "Duplicate this examination into an independent examination family"
                }
              >
                <Copy className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Duplicate as New Examination</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            onClick={() => setActiveTab("metadata")}
            className={`text-xs font-semibold pb-1 border-b-2 transition-all ${
              activeTab === "metadata"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            1. Metadata Settings
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`text-xs font-semibold pb-1 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "questions"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            2. Question Membership ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("validation")}
            className={`text-xs font-semibold pb-1 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "validation"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            3. Readiness & Audit
            {validationResult?.isValid ? (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Metadata Settings */}
      {activeTab === "metadata" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#142B4A] dark:text-white">
              Revision Metadata Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isDraft
                ? "Configure revision-specific settings, timing limits, and passing thresholds."
                : "This revision has progressed beyond Draft and is read-only."}
            </p>
          </div>

          {!isDraft && (
            <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Read-Only Revision ({revision.lifecycleState})</span>
                <span>
                  This revision has progressed beyond Draft and its settings and questions are permanently frozen.
                  To author changes, create a new revision from the examination family lineage hub.
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4 max-w-2xl">
            <div>
              <Label htmlFor="m-title" className="text-xs font-semibold">
                Revision Title
              </Label>
              <Input
                id="m-title"
                disabled={!isDraft}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                maxLength={128}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="m-desc" className="text-xs font-semibold">
                Description / Clinical Instructions
              </Label>
              <textarea
                id="m-desc"
                disabled={!isDraft}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
                maxLength={1024}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-800 bg-transparent disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="m-time" className="text-xs font-semibold">
                  Time Limit (Minutes)
                </Label>
                <Input
                  id="m-time"
                  type="number"
                  min={0}
                  max={720}
                  disabled={!isDraft}
                  value={metaTimeLimit}
                  onChange={(e) => setMetaTimeLimit(Number(e.target.value))}
                  className="mt-1"
                />
                <span className="text-[10px] text-slate-500">0 for untimed</span>
              </div>
              <div>
                <Label htmlFor="m-pass" className="text-xs font-semibold">
                  Passing Score (%)
                </Label>
                <Input
                  id="m-pass"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  disabled={!isDraft}
                  value={metaPassingScore}
                  onChange={(e) => setMetaPassingScore(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            {isDraft && (
              <div className="flex items-center gap-3 mt-4">
                <Button
                  onClick={() => updateMetaMutation.mutate()}
                  disabled={updateMetaMutation.isPending || !metaTitle.trim() || !isDirty}
                  className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateMetaMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
                {isDirty && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium"
                  >
                    Unsaved changes
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Question Membership Builder */}
      {activeTab === "questions" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#142B4A] dark:text-white">
                Composed Questions ({questions.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authoritative questions associated with this examination revision. Must be pathway-compatible.
              </p>
            </div>

            {isDraft && capabilities.canManageExaminations && (
              <Button
                onClick={() => setIsPickerOpen(true)}
                className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center gap-2 text-xs h-9"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Questions
              </Button>
            )}
          </div>

          {isLoadingQuestions ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Loading membership...
            </div>
          ) : questions.length === 0 ? (
            <div className="p-10 text-center border border-dashed rounded-xl border-slate-300 dark:border-slate-800">
              <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No questions attached yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                At least one question is required before this revision can be submitted for review.
              </p>
              {isDraft && (
                <Button
                  size="sm"
                  onClick={() => setIsPickerOpen(true)}
                  className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Open Question Picker
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg overflow-hidden">
              {questions.map((q, idx) => (
                <div
                  key={q.questionId}
                  className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      {q.displayOrder}
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {q.questionTypeKey}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {q.difficulty}
                        </Badge>
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] px-1.5 py-0">
                          {q.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {q.questionId.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                        {q.stem}
                      </p>
                    </div>
                  </div>

                  {isDraft && (
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => handleMoveQuestion(idx, "up")}
                        disabled={idx === 0 || reorderMutation.isPending}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                        title="Move Up"
                        aria-label={`Move question ${idx + 1} up`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveQuestion(idx, "down")}
                        disabled={idx === questions.length - 1 || reorderMutation.isPending}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                        title="Move Down"
                        aria-label={`Move question ${idx + 1} down`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setQuestionToRemove({ questionId: q.questionId, position: idx + 1, stem: q.stem })}
                        disabled={removeQuestionMutation.isPending}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 ml-1"
                        title="Remove question"
                        aria-label={`Remove question ${idx + 1} from revision`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Pre-flight Readiness Checklist & Audit Info */}
      {activeTab === "validation" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#142B4A] dark:text-white">
                  Pre-flight Review Readiness Checklist
                </h2>
                <p className="text-xs text-slate-500">
                  Authoritative conditions required for formal review submission.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchValidation()}
                className="text-xs h-8"
              >
                Re-validate
              </Button>
            </div>

            {validationResult?.isValid ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Ready for Review Submission
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    All required metadata, question count, and pathway constraints are satisfied.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <h4 className="text-xs font-bold">Unresolved Review Requirements</h4>
                </div>
                <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  {validationResult?.issues?.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Audit Metadata Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#142B4A] dark:text-white">
              Lifecycle Governance & Audit Record
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Created By:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{revision.createdBy}</span>
                <span className="text-[10px] text-slate-400 block">{new Date(revision.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Submitted By:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{revision.submittedBy || "—"}</span>
                {revision.submittedAt && <span className="text-[10px] text-slate-400 block">{new Date(revision.submittedAt).toLocaleString()}</span>}
              </div>
              <div>
                <span className="text-slate-400 block">Reviewed By:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{revision.reviewedBy || "—"}</span>
                {revision.reviewedAt && <span className="text-[10px] text-slate-400 block">{new Date(revision.reviewedAt).toLocaleString()}</span>}
              </div>
              <div>
                <span className="text-slate-400 block">Approved By:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{revision.approvedBy || "—"}</span>
                {revision.approvedAt && <span className="text-[10px] text-slate-400 block">{new Date(revision.approvedAt).toLocaleString()}</span>}
              </div>
              <div>
                <span className="text-slate-400 block">Published By:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{revision.publishedBy || "—"}</span>
                {revision.publishedAt && <span className="text-[10px] text-slate-400 block">{new Date(revision.publishedAt).toLocaleString()}</span>}
              </div>
              <div>
                <span className="text-slate-400 block">Archived / Retired By:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{revision.archivedBy || revision.retiredBy || "—"}</span>
                {(revision.archivedAt || revision.retiredAt) && (
                  <span className="text-[10px] text-slate-400 block">
                    {new Date(revision.archivedAt || revision.retiredAt!).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Picker Dialog */}
      <QuestionPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        revisionId={revisionId}
        revisionPathway={revision.pathway}
        existingQuestionIds={existingIds}
        concurrencyToken={revision.concurrencyToken}
        onQuestionAdded={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-revision", revisionId] });
          queryClient.invalidateQueries({ queryKey: ["admin-revision-questions", revisionId] });
          queryClient.invalidateQueries({ queryKey: ["admin-revision-validation", revisionId] });
        }}
      />

      {/* Discard Draft Dialog */}
      <Dialog open={isDiscardOpen} onOpenChange={setIsDiscardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Discard Draft Revision
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently discard Revision {revision.revisionNumber}?
              This action is only permitted for unused drafts with zero assessment attempts.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscardOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => discardMutation.mutate()}
              disabled={discardMutation.isPending}
            >
              {discardMutation.isPending ? "Discarding..." : "Discard Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lifecycle Action Transition Dialog */}
      {lifecycleModal && (
        <Dialog open={Boolean(lifecycleModal)} onOpenChange={() => setLifecycleModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{lifecycleModal.title}</DialogTitle>
              <DialogDescription>{lifecycleModal.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {lifecycleModal.requireReason && (
                <div>
                  <Label htmlFor="l-reason" className="text-xs font-semibold">
                    Mandatory Reason
                  </Label>
                  <textarea
                    id="l-reason"
                    value={lifecycleReason}
                    onChange={(e) => setLifecycleReason(e.target.value)}
                    placeholder="Provide justification for this transition..."
                    rows={3}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-800 bg-transparent"
                  />
                </div>
              )}

              {lifecycleModal.requireNotes && (
                <div>
                  <Label htmlFor="l-notes" className="text-xs font-semibold">
                    Review / Recommendation Notes (Optional)
                  </Label>
                  <textarea
                    id="l-notes"
                    value={lifecycleNotes}
                    onChange={(e) => setLifecycleNotes(e.target.value)}
                    placeholder="Advisory notes for the approving administrator..."
                    rows={3}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-800 bg-transparent"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setLifecycleModal(null)}>
                Cancel
              </Button>
              <Button
                variant={lifecycleModal.variant || "default"}
                onClick={() => lifecycleTransitionMutation.mutate()}
                disabled={
                  lifecycleTransitionMutation.isPending ||
                  (lifecycleModal.requireReason && !lifecycleReason.trim())
                }
                className={
                  lifecycleModal.variant === "destructive"
                    ? ""
                    : "bg-[#0D9488] hover:bg-[#0F766E] text-white"
                }
              >
                {lifecycleTransitionMutation.isPending ? "Executing..." : lifecycleModal.buttonText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove Question Confirmation Dialog */}
      <Dialog
        open={Boolean(questionToRemove)}
        onOpenChange={(open) => {
          if (!open && !removeQuestionMutation.isPending) {
            setQuestionToRemove(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" /> Remove question from examination?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove Question {questionToRemove?.position} from this examination revision? This changes the revision's question membership and may affect the displayed question order. This action cannot be assumed to be reversible.
            </DialogDescription>
          </DialogHeader>

          {questionToRemove?.stem && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Question prompt:</p>
              <p className="italic">{questionToRemove.stem}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuestionToRemove(null)}
              disabled={removeQuestionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (questionToRemove) {
                  removeQuestionMutation.mutate(questionToRemove.questionId);
                }
              }}
              disabled={removeQuestionMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {removeQuestionMutation.isPending ? "Removing..." : "Remove Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate as New Examination Dialog */}
      <DuplicateExaminationDialog
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        examinationId={familyId}
        examinationCode={familyData?.examination?.code || revision?.examinationCode || ""}
        examinationTitle={familyData?.examination?.title || revision?.title || "Examination"}
        examinationPathway={familyData?.examination?.pathway || revision?.pathway || "rn"}
        eligibleRevisions={eligibleRevisions}
        defaultSourceRevisionId={
          revision && ["published", "approved", "archived"].includes(revision.lifecycleState.toLowerCase())
            ? revision.id
            : undefined
        }
      />
    </div>
  );
}
