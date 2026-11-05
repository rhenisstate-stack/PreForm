"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
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
  FileText,
  Layers,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notifications";
import type {
  AdminQuestionSummary,
  AdminQuestionDetail,
  AdminQuestionVersion,
  AdminClientNeed,
  AdminCurriculumTreeNode,
  AdminQuestionOption,
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

const TRADITIONAL_TYPES = [
  { key: "single-choice", name: "Single Choice" },
  { key: "multiple-choice", name: "Multiple Choice" },
  { key: "sata", name: "Select All That Apply (SATA)" },
  { key: "checkbox", name: "Checkbox Response" },
  { key: "image-based", name: "Image-Based Question" },
  { key: "multiple-image", name: "Multiple-Image Item" },
  { key: "true-false", name: "True / False" },
];

const NGN_TYPES = [
  { key: "case-study", name: "NGN Case Study" },
  { key: "drag-drop", name: "Drag-and-Drop" },
  { key: "ordering", name: "Ordering / Sequencing" },
  { key: "matrix", name: "Matrix / Grid Response" },
  { key: "tabular", name: "Tabular Response" },
  { key: "dynamic-lab", name: "Dynamic Lab Value Response" },
  { key: "fill-blank", name: "Fill-in-the-Blank" },
  { key: "numeric", name: "Numeric Response" },
  { key: "essay", name: "Extended Response / Essay" },
  { key: "matching", name: "Matching" },
  { key: "short-answer", name: "Short-Answer Response" },
];

export function AdminQuestionsClient() {
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

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [viewingQuestionId, setViewingQuestionId] = React.useState<string | null>(null);
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
  const [formChangeSummary, setFormChangeSummary] = React.useState("");
  const [formOptions, setFormOptions] = React.useState<Array<{
    id?: string;
    optionKey: string;
    content: string;
    isCorrect: boolean;
    rationale: string;
    distractorRationale: string;
    mediaUrl: string;
  }>>([
    { optionKey: "A", content: "", isCorrect: true, rationale: "", distractorRationale: "", mediaUrl: "" },
    { optionKey: "B", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
    { optionKey: "C", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
    { optionKey: "D", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
  ]);

  // Fetch Questions
  const { data: questionsData, isLoading: isLoadingQuestions, refetch: refetchQuestions } = useQuery({
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
    enabled: !!viewingQuestionId,
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
    enabled: !!historyQuestionId,
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
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
    },
    onError: (err: any) => {
      notify.error(err.message || "Status transition failed");
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
    setFormChangeSummary("");
    setFormOptions([
      { optionKey: "A", content: "", isCorrect: true, rationale: "", distractorRationale: "", mediaUrl: "" },
      { optionKey: "B", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
      { optionKey: "C", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
      { optionKey: "D", content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
    ]);
  };

  const openEditorForCreate = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const openEditorForEdit = async (question: AdminQuestionSummary) => {
    resetForm();
    setEditingQuestionId(question.id);
    setIsEditorOpen(true);

    try {
      const res = await fetch(`/api/admin/questions/${question.id}`);
      if (res.ok) {
        const json = await res.json();
        const q: AdminQuestionDetail = json.question;
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
        setFormChangeSummary("");

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
      }
    } catch {
      notify.error("Failed to load full question for editing");
    }
  };

  const handleSaveQuestion = () => {
    if (!formStem.trim()) {
      notify.error("Question stem is required.");
      return;
    }

    const payload = {
      pathway: formPathway,
      topicId: formTopicId || null,
      clientNeedId: formClientNeedId || null,
      questionTypeKey: formType,
      stem: formStem.trim(),
      instructions: formInstructions.trim() || null,
      difficulty: formDifficulty,
      clinicalScenario: formClinicalScenario.trim() || null,
      overallRationale: formOverallRationale.trim() || null,
      cognitiveLevel: formCognitiveLevel.trim() || null,
      clinicalJudgmentStep: formClinicalJudgmentStep.trim() || null,
      source: formSource.trim() || null,
      structuredContentJson: formStructuredContent.trim() || null,
      changeSummary: formChangeSummary.trim() || null,
      options: formOptions.map((o, idx) => ({
        id: o.id,
        optionKey: o.optionKey || String.fromCharCode(65 + idx),
        content: o.content.trim(),
        displayOrder: idx,
        isCorrect: o.isCorrect,
        rationale: o.rationale.trim() || null,
        distractorRationale: o.distractorRationale.trim() || null,
        mediaUrl: o.mediaUrl.trim() || null,
      })),
    };

    if (editingQuestionId) {
      updateMutation.mutate({ id: editingQuestionId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleOptionCorrectChange = (index: number, checked: boolean) => {
    const isSingle = formType === "single-choice" || formType === "image-based" || formType === "true-false";
    setFormOptions((prev) =>
      prev.map((opt, i) => {
        if (i === index) {
          return { ...opt, isCorrect: checked };
        }
        if (isSingle && checked) {
          return { ...opt, isCorrect: false };
        }
        return opt;
      })
    );
  };

  const addOption = () => {
    const nextKey = String.fromCharCode(65 + formOptions.length);
    setFormOptions((prev) => [
      ...prev,
      { optionKey: nextKey, content: "", isCorrect: false, rationale: "", distractorRationale: "", mediaUrl: "" },
    ]);
  };

  const removeOption = (index: number) => {
    if (formOptions.length <= 2) {
      notify.error("A question must have at least 2 options.");
      return;
    }
    setFormOptions((prev) => prev.filter((_, i) => i !== index));
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground text-sm">
            Author, review, approve, and manage canonical NCLEX questions with complete revision traceability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {caps.canManageQuestions && (
            <Button onClick={openEditorForCreate} className="gap-2">
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
            <option value="">All Question Types</option>
            <optgroup label="Traditional Types">
              {TRADITIONAL_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="NGN Clinical Types">
              {NGN_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
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
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {questionsData.items.map((q: AdminQuestionSummary) => {
                  const statusInfo = QUESTION_STATUS_LABELS[q.status] || { label: "Unknown", variant: "secondary" };
                  const diffInfo = QUESTION_DIFFICULTY_LABELS[q.difficulty] || { label: "Moderate", className: "" };
                  const isAuthor = user?.id && q.createdById === user.id;

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
                        {q.authorName || "System"}
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

                          {/* Edit (allowed for draft or published) */}
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

      {/* Question Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Question Details: {viewingQuestion?.code || "Draft"}</span>
              {viewingQuestion && (
                <Badge
                  variant={QUESTION_STATUS_LABELS[viewingQuestion.status]?.variant || "secondary"}
                  className={QUESTION_STATUS_LABELS[viewingQuestion.status]?.className}
                >
                  {QUESTION_STATUS_LABELS[viewingQuestion.status]?.label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Version {viewingQuestion?.version} • Pathway: {viewingQuestion?.pathway?.toUpperCase()} • Type:{" "}
              {viewingQuestion?.questionTypeName}
            </DialogDescription>
          </DialogHeader>

          {isLoadingView || !viewingQuestion ? (
            <div className="py-8 text-center">
              <BrandedLoading message="Loading question details..." fullScreen={false} />
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {viewingQuestion.rejectionReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Reviewer Rejection Feedback
                  </div>
                  <div className="mt-1 text-xs">{viewingQuestion.rejectionReason}</div>
                </div>
              )}

              {viewingQuestion.clinicalScenario && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Clinical Scenario / Vignette
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{viewingQuestion.clinicalScenario}</p>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Stem</span>
                <p className="mt-1 text-base font-medium">{viewingQuestion.stem}</p>
              </div>

              {viewingQuestion.instructions && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Instructions</span>
                  <p className="mt-1 text-muted-foreground italic">{viewingQuestion.instructions}</p>
                </div>
              )}

              {viewingQuestion.options && viewingQuestion.options.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Options</span>
                  <div className="mt-2 space-y-2">
                    {viewingQuestion.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`rounded-lg border p-3 ${
                          opt.isCorrect
                            ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs px-2 py-0.5 rounded bg-muted">
                              {opt.optionKey}
                            </span>
                            <span className="font-medium">{opt.content}</span>
                          </div>
                          {opt.isCorrect && (
                            <Badge variant="success" className="text-xs">
                              Correct Key
                            </Badge>
                          )}
                        </div>
                        {opt.rationale && (
                          <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                            <strong>Rationale:</strong> {opt.rationale}
                          </div>
                        )}
                        {opt.distractorRationale && (
                          <div className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                            <strong>Distractor:</strong> {opt.distractorRationale}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingQuestion.structuredContentJson && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Structured NGN Schema JSON
                  </span>
                  <pre className="mt-1 rounded bg-muted p-3 text-xs overflow-x-auto font-mono">
                    {viewingQuestion.structuredContentJson}
                  </pre>
                </div>
              )}

              {viewingQuestion.overallRationale && (
                <div className="rounded-lg border bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 p-3">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
                    Overall Clinical Rationale
                  </span>
                  <p className="mt-1 text-xs leading-relaxed">{viewingQuestion.overallRationale}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-xs text-muted-foreground">
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision History Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revision History & Audit Snapshots</DialogTitle>
            <DialogDescription>
              Prior snapshots captured when published questions were modified or archived.
            </DialogDescription>
          </DialogHeader>

          {isLoadingVersions ? (
            <div className="py-8 text-center">
              <BrandedLoading message="Loading revision snapshots..." fullScreen={false} />
            </div>
          ) : !questionVersions || questionVersions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No historical revision snapshots recorded yet. Snapshots are automatically generated when a
              published question is edited or archived.
            </div>
          ) : (
            <div className="space-y-3">
              {questionVersions.map((v) => (
                <div key={v.id} className="rounded-lg border bg-card p-3 shadow-sm text-sm">
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
                    <pre className="mt-2 rounded bg-muted p-2 font-mono text-[11px] overflow-x-auto max-h-48">
                      {v.snapshotJson}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return Question to Draft</DialogTitle>
            <DialogDescription>
              Provide specific clinical feedback for why this question is being returned for revisions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="rejectionReason">Rejection Reason / Required Changes *</Label>
            <textarea
              id="rejectionReason"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Option C is clinically ambiguous; revise the rationale to cite recent ADA clinical guidelines."
              className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Question Modal */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestionId ? "Edit Question" : "Create Canonical Question"}
            </DialogTitle>
            <DialogDescription>
              Define the question stem, clinical scenario, taxonomy alignment, and type-specific response keys.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Top row: Type, Pathway, Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Question Type *</Label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <optgroup label="Traditional Types">
                    {TRADITIONAL_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="NGN Clinical Types">
                    {NGN_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <Label>Pathway *</Label>
                <select
                  value={formPathway}
                  onChange={(e) => setFormPathway(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                  <option value="both">Both (RN & PN)</option>
                </select>
              </div>

              <div>
                <Label>Difficulty</Label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(Number(e.target.value))}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={1}>Easy</option>
                  <option value={2}>Moderate</option>
                  <option value={3}>Hard</option>
                  <option value={4}>Expert</option>
                </select>
              </div>
            </div>

            {/* Curriculum alignment row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Client Need Classification</Label>
                <select
                  value={formClientNeedId}
                  onChange={(e) => setFormClientNeedId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <Label>Curriculum Topic</Label>
                <select
                  value={formTopicId}
                  onChange={(e) => setFormTopicId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Stem */}
            <div>
              <Label>Question Stem *</Label>
              <textarea
                rows={3}
                value={formStem}
                onChange={(e) => setFormStem(e.target.value)}
                placeholder="Which clinical manifestation should the nurse prioritize when evaluating the client's condition?"
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Instructions */}
            <div>
              <Label>Candidate Instructions (Optional)</Label>
              <Input
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder="e.g. Select all that apply."
              />
            </div>

            {/* Options Editor for Traditional Types */}
            {TRADITIONAL_TYPES.some((t) => t.key === formType) ? (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-base">Options & Rationales</Label>
                  <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Option
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formType === "single-choice" || formType === "image-based"
                    ? "Single Choice questions require at least 2 options and exactly 1 correct key."
                    : formType === "sata" || formType === "checkbox" || formType === "multiple-choice" || formType === "multiple-image"
                    ? "Multi-response questions require at least 2 options and at least 1 correct key."
                    : "True/False requires exactly 2 options with 1 correct key."}
                </p>

                <div className="space-y-3">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs px-2 py-1 rounded bg-muted w-8 text-center">
                          {opt.optionKey}
                        </span>
                        <Input
                          placeholder={`Option ${opt.optionKey} text...`}
                          value={opt.content}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, content: val } : o))
                            );
                          }}
                          className="flex-1"
                        />
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none px-2 py-1 rounded border bg-background hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={opt.isCorrect}
                            onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          Correct
                        </label>
                        {formOptions.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeOption(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <Input
                          placeholder="Option rationale (why correct or valid)..."
                          value={opt.rationale}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, rationale: val } : o))
                            );
                          }}
                        />
                        <Input
                          placeholder="Distractor rationale (why unsafe or incorrect)..."
                          value={opt.distractorRationale}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, distractorRationale: val } : o))
                            );
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Structured Editor for NGN Types */
              <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-base">NGN Structured Content Schema</Label>
                  <Badge variant="outline">NGN Catalogued Format</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provide JSON schema specifying prompts, tabs, matrix grids, or drag targets for this NGN
                  question type.
                </p>
                <textarea
                  rows={6}
                  value={formStructuredContent}
                  onChange={(e) => setFormStructuredContent(e.target.value)}
                  placeholder={`{\n  "matrixRows": ["Manifestation 1", "Manifestation 2"],\n  "columns": ["Expected", "Unexpected"]\n}`}
                  className="w-full font-mono text-xs rounded-md border border-input bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            {/* Overall Rationale */}
            <div>
              <Label>Overall Clinical Rationale</Label>
              <textarea
                rows={3}
                value={formOverallRationale}
                onChange={(e) => setFormOverallRationale(e.target.value)}
                placeholder="Comprehensive clinical explanation supporting the correct nursing decision and citing standard nursing protocols..."
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Cognitive & Clinical Judgment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Cognitive Level</Label>
                <select
                  value={formCognitiveLevel}
                  onChange={(e) => setFormCognitiveLevel(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="mt-1"
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
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingQuestionId ? "Save Changes" : "Create Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
