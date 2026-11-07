"use client";

import * as React from "react";
import {
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Archive,
  RotateCcw,
  Eye,
  Edit,
  History,
  Send,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Trash2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { getAdminCapabilities } from "@/lib/admin/authz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FullPageFormLayout,
  FullPageDetailsLayout,
  FullPageDeleteLayout,
  FullPageActionBar,
} from "@/components/ui/full-page-crud";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notifications";
import {
  CANONICAL_QUESTION_TYPES,
  getQuestionTypeDefinition,
  getDefaultStructuredContent,
  isOptionBasedQuestionType,
  validateQuestionPayload,
} from "@/lib/question-types";
import {
  QuestionTypeEditor,
  type EditableQuestionOption,
} from "@/components/questions/question-type-editor";
import { QuestionTypeRenderer } from "@/components/questions/question-type-renderer";
import type {
  AdminQuestionSummary,
  AdminQuestionDetail,
  AdminQuestionVersion,
  AdminClientNeed,
  AdminCurriculumTreeNode,
} from "@/lib/api-services";

const QUESTION_STATUS_LABELS: Record<
  number,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success"; className?: string }
> = {
  0: { label: "Draft", variant: "secondary" },
  1: { label: "In Review", variant: "outline", className: "border-amber-500/50 text-amber-600 bg-amber-500/10" },
  2: { label: "Approved", variant: "default", className: "bg-purple-600 text-white" },
  3: { label: "Published", variant: "success" },
  4: { label: "Archived", variant: "destructive" },
};

const QUESTION_DIFFICULTY_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: "Easy", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  2: { label: "Moderate", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  3: { label: "Hard", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  4: { label: "Expert", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const TRADITIONAL_TYPES = CANONICAL_QUESTION_TYPES.filter((t) => t.category === "Traditional");
const CLINICAL_TYPES = CANONICAL_QUESTION_TYPES.filter((t) => t.category === "Clinical");
const NGN_TYPES = CANONICAL_QUESTION_TYPES.filter((t) => t.category === "NGN");

export function AdminQuestionsClient({
  initialMode,
  initialQuestionId,
}: {
  initialMode?: "create" | "details" | "edit" | "delete";
  initialQuestionId?: string;
} = {}) {
  const { user } = useAuth();
  const caps = getAdminCapabilities(user?.role);
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [pathwayFilter, setPathwayFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = React.useState<string>("");
  const [clientNeedFilter, setClientNeedFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Full-Page CRUD view state
  const [isEditorOpen, setIsEditorOpen] = React.useState(initialMode === "create" || initialMode === "edit");
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(
    initialMode === "edit" && initialQuestionId ? initialQuestionId : null
  );
  const [isDetailOpen, setIsDetailOpen] = React.useState(initialMode === "details" && Boolean(initialQuestionId));
  const [viewingQuestionId, setViewingQuestionId] = React.useState<string | null>(
    initialMode === "details" && initialQuestionId ? initialQuestionId : null
  );
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(initialMode === "delete" && Boolean(initialQuestionId));
  const [deletingQuestionId, setDeletingQuestionId] = React.useState<string | null>(
    initialMode === "delete" && initialQuestionId ? initialQuestionId : null
  );
  const [deleteConflictError, setDeleteConflictError] = React.useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [historyQuestionId, setHistoryQuestionId] = React.useState<string | null>(null);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [rejectingQuestionId, setRejectingQuestionId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Editor Form State
  const [formPathway, setFormPathway] = React.useState("rn");
  const [formType, setFormType] = React.useState("single-choice");
  const [formStem, setFormStem] = React.useState("");
  const [formInstructions, setFormInstructions] = React.useState("");
  const [formDifficulty, setFormDifficulty] = React.useState(2);
  const [formClientNeedId, setFormClientNeedId] = React.useState("");
  const [formTopicId, setFormTopicId] = React.useState("");
  const [formClinicalScenario, setFormClinicalScenario] = React.useState("");
  const [formOverallRationale, setFormOverallRationale] = React.useState("");
  const [formCognitiveLevel, setFormCognitiveLevel] = React.useState("");
  const [formClinicalJudgmentStep, setFormClinicalJudgmentStep] = React.useState("");
  const [formSource, setFormSource] = React.useState("");
  const [formStructuredContent, setFormStructuredContent] = React.useState("");
  const [formExhibitsJson, setFormExhibitsJson] = React.useState("");
  const [formChangeSummary, setFormChangeSummary] = React.useState("");
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = React.useState<"admin-preview" | "candidate-interactive">("admin-preview");
  const [formOptions, setFormOptions] = React.useState<EditableQuestionOption[]>([
    { optionKey: "A", content: "", isCorrect: true, rationale: "", distractorRationale: "", mediaUrl: "" },
    { optionKey: "B", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
    { optionKey: "C", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
    { optionKey: "D", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
  ]);

  const populateFormFromQuestion = React.useCallback((q: AdminQuestionDetail) => {
    setFormPathway(q.pathway || "rn");
    setFormType(q.questionTypeKey || "single-choice");
    setFormStem(q.stem || "");
    setFormInstructions(q.instructions || "");
    setFormDifficulty(q.difficulty || 2);
    setFormClientNeedId(q.clientNeedId || "");
    setFormTopicId(q.topicId || "");
    setFormClinicalScenario(q.clinicalScenario || "");
    setFormOverallRationale(q.overallRationale || "");
    setFormCognitiveLevel(q.cognitiveLevel || "");
    setFormClinicalJudgmentStep(q.clinicalJudgmentStep || "");
    setFormSource(q.source || "");
    setFormStructuredContent(q.structuredContentJson || "");
    setFormExhibitsJson(q.exhibitsJson || "");
    setFormChangeSummary("");
    setValidationErrors({});

    if (q.options && q.options.length > 0) {
      setFormOptions(
        q.options.map((o) => ({
          id: o.id,
          optionKey: o.optionKey,
          content: o.content,
          isCorrect: o.isCorrect,
          rationale: o.rationale || "",
          distractorRationale: o.distractorRationale || "",
          mediaUrl: o.mediaUrl || "",
        }))
      );
    }
  }, []);

  // Load initial question if mounted in edit mode via dedicated route
  React.useEffect(() => {
    if (initialMode === "edit" && initialQuestionId) {
      fetch(`/api/admin/questions/${initialQuestionId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load question"))))
        .then((json) => {
          if (json?.question) {
            populateFormFromQuestion(json.question);
          }
        })
        .catch(() => {
          notify.error("Failed to load question for editing.");
        });
    }
  }, [initialMode, initialQuestionId, populateFormFromQuestion]);

  // Fetch Questions
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["admin", "questions", { search, typeFilter, pathwayFilter, statusFilter, difficultyFilter, clientNeedFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (pathwayFilter) params.set("pathway", pathwayFilter);
      if (statusFilter !== "") params.set("status", statusFilter);
      if (difficultyFilter !== "") params.set("difficulty", difficultyFilter);
      if (clientNeedFilter) params.set("clientNeedId", clientNeedFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load questions");
      const json = await res.json();
      return json.result;
    },
  });

  // Fetch Client Needs
  const { data: clientNeedsData } = useQuery({
    queryKey: ["admin", "client-needs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/client-needs");
      if (!res.ok) throw new Error("Failed to load client needs");
      const json = await res.json();
      return json.clientNeeds as AdminClientNeed[];
    },
  });

  // Fetch Curriculum Tree
  const { data: curriculumData } = useQuery({
    queryKey: ["admin", "curriculum-tree"],
    queryFn: async () => {
      const res = await fetch("/api/admin/curriculum/tree");
      if (!res.ok) throw new Error("Failed to load curriculum tree");
      const json = await res.json();
      return json.tree as AdminCurriculumTreeNode[];
    },
  });

  // Fetch Single Question for viewing
  const { data: viewingQuestion, isLoading: isLoadingView } = useQuery({
    queryKey: ["admin", "questions", viewingQuestionId],
    queryFn: async () => {
      if (!viewingQuestionId) return null;
      const res = await fetch(`/api/admin/questions/${viewingQuestionId}`);
      if (!res.ok) throw new Error("Failed to load question details");
      const json = await res.json();
      return json.question as AdminQuestionDetail;
    },
    enabled: !!viewingQuestionId && isDetailOpen,
  });

  // Fetch Single Question for deletion review
  const { data: deletingQuestion, isLoading: isLoadingDeleteTarget } = useQuery({
    queryKey: ["admin", "questions", deletingQuestionId, "delete-target"],
    queryFn: async () => {
      if (!deletingQuestionId) return null;
      const res = await fetch(`/api/admin/questions/${deletingQuestionId}`);
      if (!res.ok) throw new Error("Failed to load question details");
      const json = await res.json();
      return json.question as AdminQuestionDetail;
    },
    enabled: !!deletingQuestionId && isDeleteOpen,
  });

  // Fetch Versions for Question
  const { data: questionVersions, isLoading: isLoadingVersions } = useQuery({
    queryKey: ["admin", "questions", historyQuestionId, "versions"],
    queryFn: async () => {
      if (!historyQuestionId) return [];
      const res = await fetch(`/api/admin/questions/${historyQuestionId}/versions`);
      if (!res.ok) throw new Error("Failed to load versions");
      const json = await res.json();
      return json.versions as AdminQuestionVersion[];
    },
    enabled: !!historyQuestionId && isHistoryOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || errorJson.error || "Failed to create question");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Question created successfully in Draft status.");
      setIsEditorOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to create question");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || errorJson.error || "Failed to update question");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Question updated successfully.");
      setIsEditorOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to update question");
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, targetStatus, reason, changeSummary }: { id: string; targetStatus: number; reason?: string; changeSummary?: string }) => {
      const res = await fetch(`/api/admin/questions/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          rejectionReason: reason,
          changeSummary,
        }),
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || errorJson.error || "Failed to transition question status");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      const targetLabel = QUESTION_STATUS_LABELS[variables.targetStatus]?.label || "Status";
      notify.success(`Question transitioned to ${targetLabel}.`);
      setIsRejectOpen(false);
      setIsDeleteOpen(false);
      setDeletingQuestionId(null);
      setDeleteConflictError(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
    },
    onError: (err: any) => {
      notify.error(err.message || "Status transition failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const message =
          errorJson.detail ||
          errorJson.error ||
          (res.status === 409
            ? "Question cannot be permanently deleted because it is referenced by examinations or learner attempts."
            : "Failed to delete question");
        const error = new Error(message) as Error & { status?: number };
        error.status = res.status;
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Question permanently deleted from the repository.");
      setIsDeleteOpen(false);
      setDeletingQuestionId(null);
      setDeleteConflictError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
    },
    onError: (err: any) => {
      if (err?.status === 409) {
        setDeleteConflictError(err.message);
      }
      notify.error(err.message || "Failed to delete question");
    },
  });

  const resetForm = () => {
    setEditingQuestionId(null);
    setFormPathway("rn");
    setFormType("single-choice");
    setFormStem("");
    setFormInstructions("");
    setFormDifficulty(2);
    setFormClientNeedId("");
    setFormTopicId("");
    setFormClinicalScenario("");
    setFormOverallRationale("");
    setFormCognitiveLevel("");
    setFormClinicalJudgmentStep("");
    setFormSource("");
    setFormStructuredContent("");
    setFormExhibitsJson("");
    setFormChangeSummary("");
    setValidationErrors({});
    setFormOptions([
      { optionKey: "A", content: "", isCorrect: true, rationale: "", distractorRationale: "", mediaUrl: "" },
      { optionKey: "B", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
      { optionKey: "C", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
      { optionKey: "D", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
    ]);
  };

  const handleQuestionTypeChange = (nextType: string) => {
    const def = getQuestionTypeDefinition(nextType);
    setFormType(def.key);
    setValidationErrors({});
    if (!def.isOptionBased && !formStructuredContent.trim()) {
      setFormStructuredContent(JSON.stringify(getDefaultStructuredContent(def.key), null, 2));
    }
  };

  const openEditorForCreate = () => {
    resetForm();
    setIsDetailOpen(false);
    setIsDeleteOpen(false);
    setIsEditorOpen(true);
  };

  const openEditorForEdit = async (question: AdminQuestionSummary | AdminQuestionDetail) => {
    resetForm();
    setIsDetailOpen(false);
    setIsDeleteOpen(false);
    setEditingQuestionId(question.id);
    setIsEditorOpen(true);

    try {
      const res = await fetch(`/api/admin/questions/${question.id}`);
      if (res.ok) {
        const json = await res.json();
        const q: AdminQuestionDetail = json.question;
        populateFormFromQuestion(q);
      }
    } catch {
      notify.error("Failed to load full question for editing");
    }
  };

  const openDeleteForQuestion = (questionId: string) => {
    setIsDetailOpen(false);
    setIsEditorOpen(false);
    setDeleteConflictError(null);
    setDeletingQuestionId(questionId);
    setIsDeleteOpen(true);
  };

  const handleSaveQuestion = () => {
    const validation = validateQuestionPayload({
      questionTypeKey: formType,
      stem: formStem,
      options: formOptions,
      structuredContentJson: formStructuredContent,
      exhibitsJson: formExhibitsJson,
    });

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0] || "Please resolve validation errors before saving.";
      notify.error(firstError);
      return;
    }

    setValidationErrors({});
    const optionBased = isOptionBasedQuestionType(formType);

    const payload = {
      pathway: formPathway,
      topicId: formTopicId || null,
      clientNeedId: formClientNeedId || null,
      questionTypeKey: formType,
      stem: formStem.trim(),
      instructions: formInstructions.trim() || null,
      difficulty: formDifficulty,
      clinicalScenario: formClinicalScenario.trim() || null,
      exhibitsJson: formExhibitsJson.trim() || null,
      overallRationale: formOverallRationale.trim() || null,
      cognitiveLevel: formCognitiveLevel.trim() || null,
      clinicalJudgmentStep: formClinicalJudgmentStep.trim() || null,
      source: formSource.trim() || null,
      structuredContentJson: formStructuredContent.trim() || null,
      changeSummary: formChangeSummary.trim() || null,
      options: optionBased
        ? formOptions.map((o, idx) => ({
            id: o.id,
            optionKey: o.optionKey || String.fromCharCode(65 + idx),
            content: o.content.trim(),
            displayOrder: idx,
            isCorrect: o.isCorrect,
            rationale: o.rationale.trim() || null,
            distractorRationale: o.distractorRationale.trim() || null,
            mediaUrl: o.mediaUrl.trim() || null,
          }))
        : [],
    };

    if (editingQuestionId) {
      updateMutation.mutate({ id: editingQuestionId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Flatten topics from curriculum tree for dropdown
  const allTopics = React.useMemo(() => {
    if (!curriculumData) return [];
    const list: Array<{ id: string; title: string }> = [];
    const traverse = (node: AdminCurriculumTreeNode) => {
      if (node.type === "topic") {
        list.push({ id: node.id, title: node.name });
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    curriculumData.forEach(traverse);
    return list;
  }, [curriculumData]);

  if (!caps.canViewQuestions) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-8 text-center">
        <HelpCircle className="h-12 w-12 text-muted-foreground/60 mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          You do not have the required permissions (`content.view`) to view the Question Bank.
        </p>
      </div>
    );
  }

  const isDeleteBlocked = Boolean(
    deleteConflictError ||
      (deletingQuestion &&
        (deletingQuestion.canDelete === false ||
          (deletingQuestion.referencedByExamCount ?? 0) > 0 ||
          (deletingQuestion.referencedByAttemptCount ?? 0) > 0))
  );

  return (
    <div className="w-full max-w-none min-w-0 space-y-6">
      {isDeleteOpen ? (
        <FullPageDeleteLayout
          data-testid="question-delete-fullpage"
          title={`Delete Question: ${deletingQuestion?.code || deletingQuestionId || "Record"}`}
          description="Verify examination and learner-attempt dependencies before deleting or archiving this canonical question."
          recordTitle={deletingQuestion?.stem || "Loading question..."}
          recordSubtitle={`Code: ${deletingQuestion?.code || "N/A"} • Type: ${deletingQuestion?.questionTypeName || deletingQuestion?.questionTypeKey || "Unknown"} • Pathway: ${(deletingQuestion?.pathway || "rn").toUpperCase()}`}
          recordMetadata={[
            {
              label: "Lifecycle Status",
              value: QUESTION_STATUS_LABELS[deletingQuestion?.status ?? 0]?.label || "Draft",
            },
            {
              label: "Referenced by Examinations",
              value: String(deletingQuestion?.referencedByExamCount ?? 0),
            },
            {
              label: "Referenced by Learner Attempts",
              value: String(deletingQuestion?.referencedByAttemptCount ?? 0),
            },
            {
              label: "Client Need Category",
              value: deletingQuestion?.clientNeedCode || "Unassigned",
            },
          ]}
          isBlocked={isDeleteBlocked}
          blockedReason={
            deleteConflictError ||
            `This question is referenced by ${deletingQuestion?.referencedByExamCount ?? 0} examination revision(s) and ${deletingQuestion?.referencedByAttemptCount ?? 0} learner attempt(s). Hard deletion is blocked (HTTP 409 Conflict) to preserve audit and psychometric integrity.`
          }
          consequences={[
            "Permanently removes this question, its answer options, and its version snapshots from the repository.",
            "This operation cannot be undone once confirmed.",
          ]}
          dependencyNotice={
            deletingQuestion?.referencedExams && deletingQuestion.referencedExams.length > 0 ? (
              <div className="space-y-2">
                <div className="font-semibold text-foreground">Referenced Examinations:</div>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  {deletingQuestion.referencedExams.map((exam) => (
                    <li key={exam.revisionId || exam.examinationId}>
                      <span className="font-mono font-semibold">{exam.examinationCode || exam.examinationId}</span> — {exam.title} ({exam.lifecycleState})
                    </li>
                  ))}
                </ul>
              </div>
            ) : undefined
          }
          backLabel="Return to Question Bank"
          onBack={() => {
            setIsDeleteOpen(false);
            setDeletingQuestionId(null);
            setDeleteConflictError(null);
          }}
          onCancel={() => {
            setIsDeleteOpen(false);
            setDeletingQuestionId(null);
            setDeleteConflictError(null);
          }}
          onConfirmDelete={
            deletingQuestionId
              ? () => deleteMutation.mutate(deletingQuestionId)
              : undefined
          }
          confirmDeleteLabel="Permanently Delete Question"
          onArchiveInstead={
            deletingQuestionId && deletingQuestion?.status !== 4
              ? () =>
                  transitionMutation.mutate({
                    id: deletingQuestionId,
                    targetStatus: 4,
                    changeSummary: "Archived via Deactivate Instead fallback",
                  })
              : undefined
          }
          archiveInsteadLabel="Archive / Deactivate Instead"
          isSubmitting={deleteMutation.isPending || transitionMutation.isPending || isLoadingDeleteTarget}
        />
      ) : isDetailOpen ? (
        <FullPageDetailsLayout
          data-testid="question-details-fullpage"
          eyebrow="Centralized Question Repository"
          title={`Question Details: ${viewingQuestion?.code || "Draft"}`}
          description={`Version ${viewingQuestion?.version ?? 1} • Pathway: ${viewingQuestion?.pathway?.toUpperCase() || "RN"} • Type: ${viewingQuestion?.questionTypeName || viewingQuestion?.questionTypeKey || ""}`}
          badge={
            viewingQuestion && (
              <Badge
                variant={QUESTION_STATUS_LABELS[viewingQuestion.status]?.variant || "secondary"}
                className={QUESTION_STATUS_LABELS[viewingQuestion.status]?.className}
              >
                {QUESTION_STATUS_LABELS[viewingQuestion.status]?.label}
              </Badge>
            )
          }
          actions={
            viewingQuestion && caps.canManageQuestions ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditorForEdit(viewingQuestion)}
                  className="gap-1.5"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Question
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeleteForQuestion(viewingQuestion.id)}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete / Archive
                </Button>
              </div>
            ) : undefined
          }
          backLabel="Return to Question Bank"
          onBack={() => setIsDetailOpen(false)}
          footer={
            <FullPageActionBar
              onCancel={() => setIsDetailOpen(false)}
              cancelLabel="Close"
            />
          }
        >
          {isLoadingView || !viewingQuestion ? (
            <div className="py-8 text-center">
              <BrandedLoading message="Loading question details..." fullScreen={false} />
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              {viewingQuestion.rejectionReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Reviewer Rejection Feedback
                  </div>
                  <div className="mt-1 text-xs">{viewingQuestion.rejectionReason}</div>
                </div>
              )}

              {/* Canonical Question Type Renderer Preview */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Learner & Clinical Key Preview
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Rendered with the canonical PrepFord NCLEX question-type presentation engine.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={previewMode === "admin-preview" ? "default" : "outline"}
                      onClick={() => setPreviewMode("admin-preview")}
                    >
                      Admin Key View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={previewMode === "candidate-interactive" ? "default" : "outline"}
                      onClick={() => setPreviewMode("candidate-interactive")}
                    >
                      Interactive Learner View
                    </Button>
                  </div>
                </div>

                <QuestionTypeRenderer
                  questionId={viewingQuestion.id}
                  questionCode={viewingQuestion.code}
                  questionTypeKey={viewingQuestion.questionTypeKey}
                  stem={viewingQuestion.stem}
                  instructions={viewingQuestion.instructions}
                  clinicalScenario={viewingQuestion.clinicalScenario}
                  exhibitsJson={viewingQuestion.exhibitsJson}
                  structuredContentJson={viewingQuestion.structuredContentJson}
                  overallRationale={viewingQuestion.overallRationale}
                  options={viewingQuestion.options}
                  mode={previewMode}
                />
              </div>

              {/* Dependency & Governance Section */}
              <div
                data-testid="question-dependency-panel"
                className="rounded-2xl border border-border bg-card p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">
                      Dependency & Examination Governance
                    </h3>
                  </div>
                  <Badge variant={viewingQuestion.canDelete === false ? "outline" : "secondary"}>
                    {viewingQuestion.canDelete === false
                      ? "Protected Record (Archive Only)"
                      : "No Active Dependencies"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-xl border bg-muted/20 p-3.5">
                    <span className="text-muted-foreground block">Referenced by Examinations</span>
                    <span className="text-lg font-bold text-foreground">
                      {viewingQuestion.referencedByExamCount ?? 0}
                    </span>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3.5">
                    <span className="text-muted-foreground block">Referenced by Learner Attempts</span>
                    <span className="text-lg font-bold text-foreground">
                      {viewingQuestion.referencedByAttemptCount ?? 0}
                    </span>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3.5">
                    <span className="text-muted-foreground block">Deletion Governance</span>
                    <span className="text-sm font-semibold text-foreground">
                      {viewingQuestion.canDelete === false
                        ? "Blocked (HTTP 409 Conflict)"
                        : "Eligible for Hard Deletion"}
                    </span>
                  </div>
                </div>

                {viewingQuestion.referencedExams && viewingQuestion.referencedExams.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Linked Examination Blueprints & Revisions
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {viewingQuestion.referencedExams.map((exam) => (
                        <div
                          key={exam.revisionId || exam.examinationId}
                          className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold">{exam.examinationCode || exam.examinationId}</span> — {exam.title}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {exam.lifecycleState}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold block">Client Need:</span>
                    {viewingQuestion.clientNeedCode || "None"}
                  </div>
                  <div>
                    <span className="font-semibold block">Cognitive Level:</span>
                    {viewingQuestion.cognitiveLevel || "Unspecified"}
                  </div>
                  <div>
                    <span className="font-semibold block">Clinical Judgment:</span>
                    {viewingQuestion.clinicalJudgmentStep || "Unspecified"}
                  </div>
                  <div>
                    <span className="font-semibold block">Author:</span>
                    {viewingQuestion.authorName || "System"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </FullPageDetailsLayout>
      ) : isHistoryOpen ? (
        <FullPageDetailsLayout
          data-testid="question-history-fullpage"
          eyebrow="Centralized Question Repository"
          title="Revision History & Audit Snapshots"
          description="Prior snapshots captured when published questions were modified or archived."
          backLabel="Return to Question Bank"
          onBack={() => setIsHistoryOpen(false)}
          footer={
            <FullPageActionBar
              onCancel={() => setIsHistoryOpen(false)}
              cancelLabel="Close"
            />
          }
        >
          {isLoadingVersions ? (
            <div className="py-8 text-center">
              <BrandedLoading message="Loading revision snapshots..." fullScreen={false} />
            </div>
          ) : !questionVersions || questionVersions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
              No historical revision snapshots recorded yet. Snapshots are automatically generated when a
              published question is edited or archived.
            </div>
          ) : (
            <div className="space-y-4">
              {questionVersions.map((v) => (
                <div key={v.id} className="rounded-xl border bg-card p-4 shadow-sm text-sm">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Version {v.versionNumber}
                      </span>
                      <Badge
                        variant={QUESTION_STATUS_LABELS[v.status]?.variant || "secondary"}
                        className={QUESTION_STATUS_LABELS[v.status]?.className}
                      >
                        {QUESTION_STATUS_LABELS[v.status]?.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>Change Summary:</strong> {v.changeSummary || "No note provided"}
                    {v.createdByName && ` • By ${v.createdByName}`}
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary font-medium hover:underline">
                      View Snapshot JSON
                    </summary>
                    <pre className="mt-2 rounded bg-muted p-3 font-mono text-[11px] overflow-x-auto">
                      {v.snapshotJson}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </FullPageDetailsLayout>
      ) : isRejectOpen ? (
        <FullPageFormLayout
          data-testid="question-reject-fullpage"
          eyebrow="Question Review Governance"
          title="Return Question to Draft"
          description="Provide specific clinical feedback for why this question is being returned for revisions."
          backLabel="Return to Question Bank"
          onBack={() => setIsRejectOpen(false)}
          footer={
            <FullPageActionBar
              onCancel={() => setIsRejectOpen(false)}
              primaryAction={
                <Button
                  variant="destructive"
                  disabled={!rejectionReason.trim() || transitionMutation.isPending}
                  onClick={() => {
                    if (rejectingQuestionId) {
                      transitionMutation.mutate({
                        id: rejectingQuestionId,
                        targetStatus: 0,
                        reason: rejectionReason.trim(),
                      });
                    }
                  }}
                >
                  Confirm Return to Draft
                </Button>
              }
            />
          }
        >
          <div className="space-y-3">
            <Label htmlFor="rejectionReason">Rejection Reason / Required Changes *</Label>
            <textarea
              id="rejectionReason"
              rows={5}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Option C is clinically ambiguous; revise the rationale to cite recent ADA clinical guidelines."
              className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </FullPageFormLayout>
      ) : isEditorOpen ? (
        <FullPageFormLayout
          data-testid="question-editor-fullpage"
          eyebrow="Centralized Question Repository"
          title={editingQuestionId ? "Edit Question" : "Create Canonical Question"}
          description="Define the question stem, clinical scenario, taxonomy alignment, and type-specific response keys across all 18 canonical NCLEX formats."
          backLabel="Return to Question Bank"
          onBack={() => setIsEditorOpen(false)}
          footer={
            <FullPageActionBar
              onCancel={() => setIsEditorOpen(false)}
              primaryAction={
                <Button
                  data-testid="save-question-btn"
                  onClick={handleSaveQuestion}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingQuestionId ? "Save Changes" : "Create Question"}
                </Button>
              }
            />
          }
        >
          <div className="space-y-6 text-sm">
            {Object.keys(validationErrors).length > 0 && (
              <div
                data-testid="question-validation-errors"
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive space-y-1"
              >
                <div className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Please resolve the following validation issues before saving:</span>
                </div>
                <ul className="list-disc pl-5 text-xs space-y-0.5">
                  {Object.entries(validationErrors).map(([field, msg]) => (
                    <li key={field}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top row: Type, Pathway, Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="question-type-select">Question Type *</Label>
                <select
                  id="question-type-select"
                  data-testid="question-type-select"
                  value={formType}
                  onChange={(e) => handleQuestionTypeChange(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <optgroup label="Traditional Formats (5)">
                    {TRADITIONAL_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Clinical Media Formats (2)">
                    {CLINICAL_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="NGN Structured Formats (11)">
                    {NGN_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <Label htmlFor="question-pathway-select">Pathway *</Label>
                <select
                  id="question-pathway-select"
                  value={formPathway}
                  onChange={(e) => setFormPathway(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                  <option value="both">Both (RN & PN)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="question-difficulty-select">Difficulty</Label>
                <select
                  id="question-difficulty-select"
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(Number(e.target.value))}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={1}>Easy</option>
                  <option value={2}>Moderate</option>
                  <option value={3}>Hard</option>
                  <option value={4}>Expert</option>
                </select>
              </div>
            </div>

            {/* Curriculum alignment row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Client Need Classification</Label>
                <select
                  value={formClientNeedId}
                  onChange={(e) => setFormClientNeedId(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select Client Need Category...</option>
                  {clientNeedsData?.map((cn) => (
                    <option key={cn.id} value={cn.id}>
                      {cn.code} - {cn.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Curriculum Topic / Subject Domain</Label>
                <select
                  value={formTopicId}
                  onChange={(e) => setFormTopicId(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select Topic...</option>
                  {allTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clinical Scenario Vignette */}
            <div>
              <Label>Clinical Scenario / EHR Vignette (Optional)</Label>
              <textarea
                rows={3}
                value={formClinicalScenario}
                onChange={(e) => setFormClinicalScenario(e.target.value)}
                placeholder="A 58-year-old client with a history of heart failure is admitted to the progressive care unit..."
                className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Stem */}
            <div>
              <Label htmlFor="question-stem-input">Question Stem *</Label>
              <textarea
                id="question-stem-input"
                data-testid="question-stem-input"
                rows={3}
                value={formStem}
                onChange={(e) => {
                  setFormStem(e.target.value);
                  if (validationErrors.stem) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.stem;
                      return next;
                    });
                  }
                }}
                placeholder="Which clinical manifestation should the nurse prioritize when evaluating the client's condition?"
                className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {validationErrors.stem && (
                <p className="mt-1 text-xs text-destructive font-medium">{validationErrors.stem}</p>
              )}
            </div>

            {/* Instructions */}
            <div>
              <Label>Candidate Instructions (Optional)</Label>
              <Input
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder={getQuestionTypeDefinition(formType).defaultInstructions}
              />
            </div>

            {/* Canonical 18-Type Configuration Editor + Exhibits Builder */}
            <QuestionTypeEditor
              questionTypeKey={formType}
              options={formOptions}
              onOptionsChange={setFormOptions}
              structuredContentJson={formStructuredContent}
              onStructuredContentJsonChange={setFormStructuredContent}
              exhibitsJson={formExhibitsJson}
              onExhibitsJsonChange={setFormExhibitsJson}
              validationErrors={validationErrors}
            />

            {/* Live Learner Preview inside the Editor */}
            <div className="rounded-2xl border border-border bg-muted/15 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Live Question Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewMode === "admin-preview" ? "default" : "outline"}
                    onClick={() => setPreviewMode("admin-preview")}
                  >
                    Admin Key Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewMode === "candidate-interactive" ? "default" : "outline"}
                    onClick={() => setPreviewMode("candidate-interactive")}
                  >
                    Interactive Learner Preview
                  </Button>
                </div>
              </div>

              <QuestionTypeRenderer
                questionTypeKey={formType}
                stem={formStem || "Enter a question stem above to preview how learners will experience this question."}
                instructions={formInstructions}
                clinicalScenario={formClinicalScenario}
                exhibitsJson={formExhibitsJson}
                structuredContentJson={formStructuredContent}
                overallRationale={formOverallRationale}
                options={formOptions}
                mode={previewMode}
              />
            </div>

            {/* Overall Rationale */}
            <div>
              <Label>Overall Clinical Rationale</Label>
              <textarea
                rows={3}
                value={formOverallRationale}
                onChange={(e) => setFormOverallRationale(e.target.value)}
                placeholder="Comprehensive clinical explanation supporting the correct nursing decision and citing standard nursing protocols..."
                className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Cognitive & Clinical Judgment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Cognitive Level</Label>
                <select
                  value={formCognitiveLevel}
                  onChange={(e) => setFormCognitiveLevel(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select Level...</option>
                  <option value="Remembering">Remembering</option>
                  <option value="Understanding">Understanding</option>
                  <option value="Applying">Applying</option>
                  <option value="Analyzing">Analyzing</option>
                  <option value="Evaluating">Evaluating</option>
                </select>
              </div>

              <div>
                <Label>Clinical Judgment Step (NCJMM)</Label>
                <select
                  value={formClinicalJudgmentStep}
                  onChange={(e) => setFormClinicalJudgmentStep(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select Step...</option>
                  <option value="Recognize Cues">1. Recognize Cues</option>
                  <option value="Analyze Cues">2. Analyze Cues</option>
                  <option value="Prioritize Hypotheses">3. Prioritize Hypotheses</option>
                  <option value="Generate Solutions">4. Generate Solutions</option>
                  <option value="Take Action">5. Take Action</option>
                  <option value="Evaluate Outcomes">6. Evaluate Outcomes</option>
                </select>
              </div>

              <div>
                <Label>Source / Attribution</Label>
                <Input
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="e.g. PrepFord NCLEX Expert Committee"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* If editing an existing question, show Change Summary */}
            {editingQuestionId && (
              <div>
                <Label>Change Summary (Audit Traceability)</Label>
                <Input
                  value={formChangeSummary}
                  onChange={(e) => setFormChangeSummary(e.target.value)}
                  placeholder="Describe what was modified (e.g. Corrected distractor typo in option C)..."
                  className="mt-1.5"
                />
              </div>
            )}
          </div>
        </FullPageFormLayout>
      ) : (
        <>
          {/* Top Banner */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
              <p className="text-muted-foreground text-sm">
                Author, review, approve, and manage canonical NCLEX questions across all 18 supported question types.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {caps.canManageQuestions && (
                <Button data-testid="new-question-btn" onClick={openEditorForCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Question
                </Button>
              )}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-6">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stems, codes, or rationales..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All 18 Question Types</option>
                <optgroup label="Traditional Formats">
                  {TRADITIONAL_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Clinical Media Formats">
                  {CLINICAL_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="NGN Structured Formats">
                  {NGN_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <select
                value={pathwayFilter}
                onChange={(e) => {
                  setPathwayFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Pathways</option>
                <option value="rn">NCLEX-RN</option>
                <option value="pn">NCLEX-PN</option>
                <option value="both">Both (RN & PN)</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="0">Draft</option>
                <option value="1">In Review</option>
                <option value="2">Approved</option>
                <option value="3">Published</option>
                <option value="4">Archived</option>
              </select>
            </div>

            <div>
              <select
                value={clientNeedFilter}
                onChange={(e) => {
                  setClientNeedFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Client Needs</option>
                {clientNeedsData?.map((cn) => (
                  <option key={cn.id} value={cn.id}>
                    {cn.code} - {cn.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Questions List Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {isLoadingQuestions ? (
              <div className="p-12 text-center">
                <BrandedLoading message="Loading questions..." fullScreen={false} />
              </div>
            ) : !questionsData?.items || questionsData.items.length === 0 ? (
              <div className="p-12 text-center">
                <HelpCircle className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No questions found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Try adjusting your filters or search keywords, or create a new question.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                    <tr>
                      <th className="px-4 py-3">Code / Ver</th>
                      <th className="px-4 py-3">Question Stem</th>
                      <th className="px-4 py-3">Type & Pathway</th>
                      <th className="px-4 py-3">Client Need</th>
                      <th className="px-4 py-3">Difficulty</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Dependencies</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {questionsData.items.map((q: AdminQuestionSummary) => {
                      const statusInfo = QUESTION_STATUS_LABELS[q.status] || { label: "Unknown", variant: "secondary" };
                      const diffInfo = QUESTION_DIFFICULTY_LABELS[q.difficulty] || { label: "Moderate", className: "" };
                      const isAuthor = user?.id && q.createdById === user.id;
                      const examRefs = q.referencedByExamCount ?? 0;
                      const attemptRefs = q.referencedByAttemptCount ?? 0;

                      return (
                        <tr key={q.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{q.code || "PENDING"}</span>
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-sans">
                                v{q.version}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs md:max-w-md truncate">
                            <span className="font-medium text-foreground">{q.stem}</span>
                            {q.topicTitle && (
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                Topic: {q.topicTitle}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-xs font-medium">{q.questionTypeName}</span>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                {q.pathway.toUpperCase()}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                            {q.clientNeedCode ? (
                              <span title={q.clientNeedName}>{q.clientNeedCode}</span>
                            ) : (
                              <span className="italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${diffInfo.className}`}>
                              {diffInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                            {examRefs > 0 || attemptRefs > 0 ? (
                              <span title={`${examRefs} exam(s), ${attemptRefs} attempt(s)`}>
                                {examRefs} exam{examRefs === 1 ? "" : "s"} • {attemptRefs} attempt{attemptRefs === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span>Unreferenced</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View details */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View Question Details"
                                onClick={() => {
                                  setViewingQuestionId(q.id);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Version history */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Revision History"
                                onClick={() => {
                                  setHistoryQuestionId(q.id);
                                  setIsHistoryOpen(true);
                                }}
                              >
                                <History className="h-4 w-4" />
                              </Button>

                              {/* Edit */}
                              {caps.canManageQuestions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit Question"
                                  onClick={() => openEditorForEdit(q)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Delete / Archive */}
                              {caps.canManageQuestions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`delete-question-${q.id}`}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Delete Question"
                                  onClick={() => openDeleteForQuestion(q.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Workflow status actions */}
                              {/* 1. Submit for review (Draft -> InReview) */}
                              {q.status === 0 && caps.canManageQuestions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  title="Submit for Review"
                                  onClick={() =>
                                    transitionMutation.mutate({ id: q.id, targetStatus: 1 })
                                  }
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}

                              {/* 2. Review actions (InReview -> Approved or Rejected) */}
                              {q.status === 1 && caps.canReviewQuestions && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    title={
                                      isAuthor && user?.role !== "superadmin"
                                        ? "Author cannot approve their own question (Separation of Duties)"
                                        : "Approve Question"
                                    }
                                    disabled={Boolean(isAuthor && user?.role !== "superadmin")}
                                    onClick={() =>
                                      transitionMutation.mutate({ id: q.id, targetStatus: 2 })
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    title="Reject / Request Changes"
                                    onClick={() => {
                                      setRejectingQuestionId(q.id);
                                      setIsRejectOpen(true);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* 3. Publish (Approved -> Published) */}
                              {q.status === 2 && caps.canPublishQuestions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Publish Question"
                                  onClick={() =>
                                    transitionMutation.mutate({ id: q.id, targetStatus: 3 })
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}

                              {/* 4. Archive (Published or Approved -> Archived) */}
                              {(q.status === 2 || q.status === 3) && caps.canPublishQuestions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Archive Question"
                                  onClick={() =>
                                    transitionMutation.mutate({ id: q.id, targetStatus: 4 })
                                  }
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}

                              {/* 5. Restore (Archived -> Draft) */}
                              {q.status === 4 && caps.canManageQuestions && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Restore to Draft"
                                  onClick={() =>
                                    transitionMutation.mutate({ id: q.id, targetStatus: 0 })
                                  }
                                >
                                  <RotateCcw className="h-4 w-4" />
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

            {/* Pagination Footer */}
            {questionsData && questionsData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, questionsData.totalCount)} of {questionsData.totalCount} questions
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="px-2 font-medium">
                    {page} / {questionsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= questionsData.totalPages}
                    onClick={() => setPage((p) => Math.min(questionsData.totalPages, p + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
