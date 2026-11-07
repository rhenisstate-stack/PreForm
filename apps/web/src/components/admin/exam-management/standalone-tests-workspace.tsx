"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  BookOpen,
  ClipboardList,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Check,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CourseSubjectManagement,
  type CourseItem,
  type SubjectDomainItem,
} from "./course-subject-management";
import {
  ClientNeedsManagement,
  type ClientNeedItem,
} from "./client-needs-management";
import { ExaminationPreviewDialog } from "@/components/admin/examination-preview-dialog";

interface EligibleQuestionItem {
  id: string;
  questionId: string;
  code?: string;
  stem: string;
  questionTypeKey: string;
  pathway: string;
  difficulty: string;
  status: string;
  optionCount: number;
  clientNeedId?: string;
  clientNeedCode?: string;
  clientNeedName?: string;
  courseId?: string;
  courseTitle?: string;
  subjectDomainId?: string;
  subjectDomainTitle?: string;
  overallRationale?: string;
}

interface StandaloneTestsWorkspaceProps {
  canModify?: boolean;
  initialSubTab?: "tests" | "courses" | "client-needs";
  onExamCatalogChanged?: () => void;
}

export function StandaloneTestsWorkspace({
  canModify = true,
  initialSubTab = "tests",
  onExamCatalogChanged,
}: StandaloneTestsWorkspaceProps) {
  const [subTab, setSubTab] = useState<"tests" | "courses" | "client-needs">(
    initialSubTab
  );

  // Standalone exams catalogue state
  const [exams, setExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [examsError, setExamsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pathwayFilter, setPathwayFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Classification catalogs for the 6-stage wizard
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectDomainItem[]>([]);
  const [clientNeeds, setClientNeeds] = useState<ClientNeedItem[]>([]);

  // 6-Stage Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Stage 1: Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pathway, setPathway] = useState<"rn" | "pn">("rn");

  // Stage 2: Subject Configuration
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Stage 3: Client Needs Configuration
  const [selectedClientNeedCodes, setSelectedClientNeedCodes] = useState<string[]>([]);
  const [clientNeedTargetCounts, setClientNeedTargetCounts] = useState<Record<string, number>>({});

  // Stage 4: Question Selection from Question Repository
  const [repoQuestions, setRepoQuestions] = useState<EligibleQuestionItem[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [repoCourseFilter, setRepoCourseFilter] = useState("all");
  const [repoSubjectFilter, setRepoSubjectFilter] = useState("all");
  const [repoClientNeedFilter, setRepoClientNeedFilter] = useState("all");
  const [repoDifficultyFilter, setRepoDifficultyFilter] = useState("all");
  const [repoTypeFilter, setRepoTypeFilter] = useState("all");
  const [selectedQuestions, setSelectedQuestions] = useState<EligibleQuestionItem[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<EligibleQuestionItem | null>(null);

  // Stage 5: Examination Configuration
  const [targetQuestionCount, setTargetQuestionCount] = useState(25);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(45);
  const [passingScorePercent, setPassingScorePercent] = useState(75);
  const [selectionStrategy, setSelectionStrategy] = useState<"Preset" | "DynamicBalanced">("Preset");
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [reviewPolicy, setReviewPolicy] = useState("AfterExamSubmission");
  const [showRationales, setShowRationales] = useState(true);
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [maxAttemptsAllowed, setMaxAttemptsAllowed] = useState<number>(3);

  // Preview & Delete dialogs
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadStandaloneExams = useCallback(async () => {
    setLoadingExams(true);
    setExamsError(null);
    try {
      const params = new URLSearchParams({ module: "standalone", pageSize: "50" });
      if (pathwayFilter !== "all") params.set("pathway", pathwayFilter);
      if (statusFilter !== "all") params.set("revisionStatus", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/examinations?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to load Standalone Custom Tests.");
      }
      setExams(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setExamsError(err.message || "Failed to load Standalone Custom Tests.");
    } finally {
      setLoadingExams(false);
    }
  }, [pathwayFilter, statusFilter, searchQuery]);

  const loadClassifications = useCallback(async () => {
    try {
      const [cRes, sRes, cnRes] = await Promise.all([
        fetch("/api/admin/curriculum/courses?activeOnly=true"),
        fetch("/api/admin/curriculum/subject-domains?activeOnly=true"),
        fetch("/api/admin/client-needs?activeOnly=true"),
      ]);
      const cData = await cRes.json().catch(() => ({}));
      const sData = await sRes.json().catch(() => ({}));
      const cnData = await cnRes.json().catch(() => ({}));

      if (Array.isArray(cData.courses)) setCourses(cData.courses);
      const rawSubs = Array.isArray(sData.subjectDomains)
        ? sData.subjectDomains
        : Array.isArray(sData.domains)
          ? sData.domains
          : [];
      setSubjects(rawSubs);
      if (Array.isArray(cnData.clientNeeds)) setClientNeeds(cnData.clientNeeds);
    } catch {
      // Non-fatal fallback
    }
  }, []);

  const loadRepositoryQuestions = useCallback(async () => {
    setLoadingRepo(true);
    try {
      const params = new URLSearchParams({ pathway });
      if (repoSearch.trim()) params.set("search", repoSearch.trim());
      if (repoCourseFilter !== "all") params.set("courseId", repoCourseFilter);
      if (repoSubjectFilter !== "all") params.set("subjectDomainId", repoSubjectFilter);
      if (repoClientNeedFilter !== "all") params.set("clientNeedId", repoClientNeedFilter);
      if (repoDifficultyFilter !== "all") params.set("difficulty", repoDifficultyFilter);
      if (repoTypeFilter !== "all") params.set("questionType", repoTypeFilter);

      const res = await fetch(`/api/admin/examinations/eligible-questions?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.questions)) {
        setRepoQuestions(data.questions);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRepo(false);
    }
  }, [
    pathway,
    repoSearch,
    repoCourseFilter,
    repoSubjectFilter,
    repoClientNeedFilter,
    repoDifficultyFilter,
    repoTypeFilter,
  ]);

  useEffect(() => {
    loadStandaloneExams();
    loadClassifications();
  }, [loadStandaloneExams, loadClassifications]);

  useEffect(() => {
    if (wizardOpen && wizardStep === 4) {
      loadRepositoryQuestions();
    }
  }, [wizardOpen, wizardStep, loadRepositoryQuestions]);

  const openWizard = () => {
    setTitle("");
    setDescription("");
    setPathway("rn");
    setSelectedCourseIds([]);
    setSelectedSubjectIds([]);
    setSelectedClientNeedCodes([]);
    setClientNeedTargetCounts({});
    setSelectedQuestions([]);
    setTargetQuestionCount(25);
    setTimeLimitMinutes(45);
    setPassingScorePercent(75);
    setSelectionStrategy("Preset");
    setRandomizeQuestions(true);
    setReviewPolicy("AfterExamSubmission");
    setShowRationales(true);
    setShowScoreImmediately(true);
    setMaxAttemptsAllowed(3);
    setWizardStep(1);
    setWizardError(null);
    setWizardOpen(true);
  };

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleClientNeed = (code: string) => {
    setSelectedClientNeedCodes((prev) => {
      const exists = prev.includes(code);
      if (exists) {
        return prev.filter((x) => x !== code);
      }
      setClientNeedTargetCounts((counts) => ({
        ...counts,
        [code]: counts[code] ?? 5,
      }));
      return [...prev, code];
    });
  };

  const toggleQuestionSelection = (q: EligibleQuestionItem) => {
    const qId = q.questionId || q.id;
    setSelectedQuestions((prev) => {
      const exists = prev.some((item) => (item.questionId || item.id) === qId);
      const next = exists
        ? prev.filter((item) => (item.questionId || item.id) !== qId)
        : [...prev, q];
      if (next.length > 0) {
        setTargetQuestionCount(next.length);
      }
      return next;
    });
  };

  const canProceedWizardStep = () => {
    if (wizardStep === 1) {
      return title.trim().length > 0;
    }
    return true;
  };

  const handleCreateStandaloneTest = async () => {
    if (!title.trim()) {
      setWizardError("Test title is required.");
      setWizardStep(1);
      return;
    }

    setWizardSubmitting(true);
    setWizardError(null);
    try {
      const quotas = selectedClientNeedCodes.map((code) => {
        const cn = clientNeeds.find((c) => c.code === code);
        const count = clientNeedTargetCounts[code] ?? 5;
        return {
          clientNeedCode: code,
          clientNeedName: cn?.name || code,
          targetCount: count,
          targetPercentage:
            targetQuestionCount > 0
              ? Math.round((count / targetQuestionCount) * 100)
              : 0,
        };
      });

      const compositionRules = {
        targetQuestionCount:
          selectedQuestions.length > 0
            ? selectedQuestions.length
            : Number(targetQuestionCount) || 25,
        selectionStrategy,
        courseIds: selectedCourseIds,
        subjectIds: selectedSubjectIds,
        clientNeedQuotas: quotas,
        randomizeQuestions,
      };

      const res = await fetch("/api/admin/examinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathway,
          title: title.trim(),
          initialRevisionTitle: `${title.trim()} — Rev 1`,
          description: description.trim(),
          examType: 5, // ExamType.Standalone
          timeLimitMinutes: Number(timeLimitMinutes) || 0,
          passingScorePercent: Number(passingScorePercent) || 75,
          targetQuestionCount:
            selectedQuestions.length > 0
              ? selectedQuestions.length
              : Number(targetQuestionCount) || 25,
          selectionStrategy,
          compositionRulesJson: JSON.stringify(compositionRules),
          questionIds: selectedQuestions.map((q) => q.questionId || q.id),
          isAvailable: true,
          maxAttemptsAllowed: Number(maxAttemptsAllowed) || 3,
          reviewPolicy,
          showRationales,
          showScoreImmediately,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to create Standalone Custom Test.");
      }

      setWizardOpen(false);
      setBannerMessage({
        type: "success",
        text: `Standalone Custom Test "${title.trim()}" (${data.examination?.code || ""}) created in Draft status.`,
      });
      await loadStandaloneExams();
      onExamCatalogChanged?.();
    } catch (err: any) {
      setWizardError(err.message || "Failed to create Standalone Custom Test.");
    } finally {
      setWizardSubmitting(false);
    }
  };

  const handleDeleteExam = async () => {
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
            "Cannot delete this examination because learner attempts or publication history exist. Archive it from the Revision Studio instead."
        );
        return;
      }

      setBannerMessage({
        type: "success",
        text: `Standalone test "${deleteTarget.title}" deleted.`,
      });
      setDeleteTarget(null);
      await loadStandaloneExams();
      onExamCatalogChanged?.();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete examination.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredCourseOptions = useMemo(() => {
    return courses.filter(
      (c) => c.pathway === pathway || c.pathway === "both" || !c.pathway
    );
  }, [courses, pathway]);

  const filteredSubjectOptions = useMemo(() => {
    return subjects.filter((s) => {
      const pathwayMatch =
        s.pathway === pathway || s.pathway === "both" || !s.pathway;
      if (!pathwayMatch) return false;
      if (selectedCourseIds.length > 0) {
        return selectedCourseIds.includes(s.courseId);
      }
      return true;
    });
  }, [subjects, pathway, selectedCourseIds]);

  const filteredClientNeedOptions = useMemo(() => {
    return clientNeeds.filter(
      (c) => c.pathway === pathway || c.pathway === "both" || !c.pathway
    );
  }, [clientNeeds, pathway]);

  return (
    <div className="space-y-6" data-testid="standalone-tests-workspace">
      {/* Module 1 Sub-Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("tests")}
            data-testid="standalone-subtab-tests"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === "tests"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Standalone Test Management ({exams.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab("courses")}
            data-testid="standalone-subtab-courses"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === "courses"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Course/Subject Management ({courses.length} / {subjects.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab("client-needs")}
            data-testid="standalone-subtab-client-needs"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subTab === "client-needs"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Client Needs Management ({clientNeeds.length})
          </button>
        </div>

        {subTab === "tests" && canModify && (
          <Button
            size="sm"
            onClick={openWizard}
            data-testid="open-standalone-wizard-btn"
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Standalone Custom Test
          </Button>
        )}
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

      {/* Sub-Views */}
      {subTab === "courses" ? (
        <CourseSubjectManagement
          canModify={canModify}
          onCatalogChanged={loadClassifications}
        />
      ) : subTab === "client-needs" ? (
        <ClientNeedsManagement
          canModify={canModify}
          onCatalogChanged={loadClassifications}
        />
      ) : (
        <div className="space-y-5">
          {/* Standalone Catalogue Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card border border-border rounded-xl p-4">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search Standalone Custom Tests by title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div>
              <select
                aria-label="Filter Standalone Tests by Pathway"
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
                aria-label="Filter Standalone Tests by Status"
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

          {/* Standalone Tests Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            {loadingExams ? (
              <div className="p-12 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                <p className="text-sm">Loading Standalone Custom Tests...</p>
              </div>
            ) : examsError ? (
              <div className="p-10 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm text-red-600">{examsError}</p>
                <Button variant="outline" size="sm" onClick={loadStandaloneExams}>
                  Retry
                </Button>
              </div>
            ) : exams.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileSpreadsheet className="w-9 h-9 text-indigo-500 mx-auto opacity-75" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    No Standalone Custom Tests configured yet
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Assemble focused custom examinations by Course/Subject, Client Needs categories, and Question Repository selections.
                  </p>
                </div>
                {canModify && (
                  <Button
                    size="sm"
                    onClick={openWizard}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Launch 6-Stage Custom Test Wizard
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Custom Test Title</th>
                      <th className="py-3 px-4">Pathway</th>
                      <th className="py-3 px-4">Questions & Timing</th>
                      <th className="py-3 px-4">Lifecycle State</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {exams.map((exam) => {
                      const rev = exam.latestRevision || exam.currentRevision;
                      const state = rev?.lifecycleState || "Draft";
                      return (
                        <tr key={exam.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
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
                            <Badge variant="outline" className="uppercase text-xs">
                              NCLEX-{exam.pathway}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {rev?.questionCount ?? rev?.targetQuestionCount ?? 0} Qs
                            </span>{" "}
                            • {rev?.timeLimitMinutes ? `${rev.timeLimitMinutes} min` : "Untimed"} •{" "}
                            Pass {rev?.passingScorePercent ?? 75}%
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
                                  title="Preview Examination"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              {rev?.id && (
                                <Link
                                  href={`/admin/examinations/${exam.id}/revisions/${rev.id}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Configure
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
                                  title="Delete Standalone Test"
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
        </div>
      )}

      {/* 6-Stage Standalone Custom Test Creation Wizard */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Create Custom Test (Stand Alone) — Stage {wizardStep} of 6
            </DialogTitle>
            <DialogDescription>
              Assemble an independently configured examination from Course/Subject classifications, Client Needs, and the Question Repository.
            </DialogDescription>
          </DialogHeader>

          {/* Wizard Step Indicator */}
          <div className="grid grid-cols-6 gap-1.5 py-2 border-b border-border text-[11px] font-semibold">
            {[
              { step: 1, label: "1. Basic Info" },
              { step: 2, label: "2. Subjects" },
              { step: 3, label: "3. Client Needs" },
              { step: 4, label: "4. Questions" },
              { step: 5, label: "5. Policies" },
              { step: 6, label: "6. Review" },
            ].map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => setWizardStep(item.step as any)}
                className={`py-2 px-2 rounded-md text-center transition-all ${
                  wizardStep === item.step
                    ? "bg-indigo-600 text-white"
                    : wizardStep > item.step
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {wizardError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
              {wizardError}
            </div>
          )}

          {/* Stage 1: Basic Information */}
          {wizardStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="sa-title">Standalone Test Title *</Label>
                  <Input
                    id="sa-title"
                    placeholder="e.g., RN Pharmacology & Parenteral Safety Custom Assessment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sa-pathway">Programme / Pathway *</Label>
                  <select
                    id="sa-pathway"
                    value={pathway}
                    onChange={(e) => setPathway(e.target.value as "rn" | "pn")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="rn">NCLEX-RN</option>
                    <option value="pn">NCLEX-PN</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sa-desc">Description & Candidate Instructions</Label>
                <textarea
                  id="sa-desc"
                  rows={3}
                  placeholder="Provide instructions and clinical focus areas for learners taking this standalone test..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Stage 2: Subject Configuration */}
          {wizardStep === 2 && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                Select one or more nursing courses and subject domains to scope this standalone test.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-3.5 space-y-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Courses ({filteredCourseOptions.length})
                  </div>
                  {filteredCourseOptions.map((c) => {
                    const checked = selectedCourseIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCourse(c.id)}
                          />
                          <div>
                            <div className="font-semibold text-foreground">{c.title}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {c.code}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {c.questionCount ?? 0} Qs
                        </Badge>
                      </label>
                    );
                  })}
                </div>

                <div className="border border-border rounded-lg p-3.5 space-y-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject Domains ({filteredSubjectOptions.length})
                  </div>
                  {filteredSubjectOptions.map((s) => {
                    const checked = selectedSubjectIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSubject(s.id)}
                          />
                          <div>
                            <div className="font-semibold text-foreground">{s.title}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {s.code} • {s.courseTitle}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {s.questionCount ?? 0} Qs
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stage 3: Client Needs Configuration */}
          {wizardStep === 3 && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                Select NCLEX Client Needs categories and optional target question counts for this test.
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredClientNeedOptions.map((cn) => {
                  const checked = selectedClientNeedCodes.includes(cn.code);
                  return (
                    <div
                      key={cn.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-xs ${
                        checked
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-border bg-card"
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClientNeed(cn.code)}
                        />
                        <div>
                          <div className="font-semibold text-foreground">
                            {cn.name}{" "}
                            <span className="font-mono text-indigo-500">({cn.code})</span>
                          </div>
                          {cn.description && (
                            <div className="text-muted-foreground line-clamp-1">
                              {cn.description}
                            </div>
                          )}
                        </div>
                      </label>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{cn.questionCount ?? 0} available</Badge>
                        {checked && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Target:</span>
                            <Input
                              type="number"
                              min={1}
                              max={265}
                              value={clientNeedTargetCounts[cn.code] ?? 5}
                              onChange={(e) =>
                                setClientNeedTargetCounts((prev) => ({
                                  ...prev,
                                  [cn.code]: Number(e.target.value) || 1,
                                }))
                              }
                              className="w-16 h-7 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage 4: Question Selection from Question Repository */}
          {wizardStep === 4 && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Search and select Approved/Published questions from the centralized Question Repository.
                </span>
                <Badge variant="default" className="bg-indigo-600 text-white">
                  {selectedQuestions.length} Questions Selected
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  placeholder="Search question stem or code..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="sm:col-span-2 h-8 text-xs"
                />
                <select
                  value={repoClientNeedFilter}
                  onChange={(e) => setRepoClientNeedFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">All Client Needs</option>
                  {filteredClientNeedOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={repoDifficultyFilter}
                  onChange={(e) => setRepoDifficultyFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="border border-border rounded-lg max-h-64 overflow-y-auto divide-y divide-border">
                {loadingRepo ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Loading eligible repository questions...
                  </div>
                ) : repoQuestions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No matching questions found in the Question Repository. You can also use Dynamic Balanced selection in Stage 5.
                  </div>
                ) : (
                  repoQuestions.map((q) => {
                    const qId = q.questionId || q.id;
                    const isSelected = selectedQuestions.some(
                      (item) => (item.questionId || item.id) === qId
                    );
                    return (
                      <div
                        key={qId}
                        className={`flex items-start justify-between gap-3 p-3 text-xs ${
                          isSelected ? "bg-indigo-500/10" : "hover:bg-muted/20"
                        }`}
                      >
                        <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleQuestionSelection(q)}
                            className="mt-0.5"
                          />
                          <div className="space-y-1">
                            <div className="font-medium text-foreground line-clamp-2">
                              {q.stem}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                              {q.code && <span className="font-mono">{q.code}</span>}
                              <Badge variant="outline" className="text-[10px]">
                                {q.questionTypeKey}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {q.difficulty}
                              </Badge>
                              {q.clientNeedCode && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {q.clientNeedCode}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewQuestion(q)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Stage 5: Examination Configuration */}
          {wizardStep === 5 && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sa-qcount">Target Question Count</Label>
                  <Input
                    id="sa-qcount"
                    type="number"
                    min={1}
                    max={265}
                    value={targetQuestionCount}
                    onChange={(e) => setTargetQuestionCount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sa-duration">Duration (Minutes, 0 = Untimed)</Label>
                  <Input
                    id="sa-duration"
                    type="number"
                    min={0}
                    max={720}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sa-pass">Passing Score (%)</Label>
                  <Input
                    id="sa-pass"
                    type="number"
                    min={1}
                    max={100}
                    value={passingScorePercent}
                    onChange={(e) => setPassingScorePercent(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sa-strategy">Question Selection Mode</Label>
                  <select
                    id="sa-strategy"
                    value={selectionStrategy}
                    onChange={(e) => setSelectionStrategy(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="Preset">Fixed / Curated Question Set</option>
                    <option value="DynamicBalanced">Dynamic Balanced Pool</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sa-review">Result & Review Policy</Label>
                  <select
                    id="sa-review"
                    value={reviewPolicy}
                    onChange={(e) => setReviewPolicy(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="AfterExamSubmission">After Submission</option>
                    <option value="Immediate">Immediate Feedback</option>
                    <option value="Never">Summary Score Only</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sa-attempts">Max Attempts Allowed</Label>
                  <Input
                    id="sa-attempts"
                    type="number"
                    min={1}
                    max={50}
                    value={maxAttemptsAllowed}
                    onChange={(e) => setMaxAttemptsAllowed(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  />
                  Randomize Question Order
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRationales}
                    onChange={(e) => setShowRationales(e.target.checked)}
                  />
                  Show Clinical Rationales After Completion
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScoreImmediately}
                    onChange={(e) => setShowScoreImmediately(e.target.checked)}
                  />
                  Show Score Immediately
                </label>
              </div>
            </div>
          )}

          {/* Stage 6: Review & Save */}
          {wizardStep === 6 && (
            <div className="space-y-4 py-2 text-sm">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground font-semibold">
                      Standalone Custom Test Summary
                    </div>
                    <h4 className="text-base font-bold text-foreground">
                      {title || "Untitled Test"}
                    </h4>
                  </div>
                  <Badge variant="outline" className="uppercase">
                    NCLEX-{pathway}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {description || "No additional candidate instructions specified."}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block">Courses / Subjects</span>
                    <strong>
                      {selectedCourseIds.length} courses, {selectedSubjectIds.length} subjects
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Client Needs</span>
                    <strong>{selectedClientNeedCodes.length} categories</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Selected Questions</span>
                    <strong>
                      {selectedQuestions.length > 0
                        ? `${selectedQuestions.length} curated Qs`
                        : `${targetQuestionCount} dynamic Qs`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Timing & Passing</span>
                    <strong>
                      {timeLimitMinutes} min • {passingScorePercent}% pass
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                wizardStep > 1
                  ? setWizardStep((s) => (s - 1) as any)
                  : setWizardOpen(false)
              }
              disabled={wizardSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {wizardStep > 1 ? "Previous Stage" : "Cancel"}
            </Button>

            {wizardStep < 6 ? (
              <Button
                type="button"
                onClick={() => setWizardStep((s) => (s + 1) as any)}
                disabled={!canProceedWizardStep()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Next Stage
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreateStandaloneTest}
                disabled={wizardSubmitting}
                data-testid="submit-standalone-wizard-btn"
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Check className="w-4 h-4 mr-1.5" />
                {wizardSubmitting ? "Creating Standalone Test..." : "Save Standalone Custom Test"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Preview Modal */}
      <Dialog
        open={!!previewQuestion}
        onOpenChange={(open) => !open && setPreviewQuestion(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Question Repository Preview</DialogTitle>
            <DialogDescription>
              {previewQuestion?.code} • {previewQuestion?.questionTypeKey} •{" "}
              {previewQuestion?.difficulty}
            </DialogDescription>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                {previewQuestion.stem}
              </div>
              {previewQuestion.overallRationale && (
                <div className="text-xs text-muted-foreground">
                  <strong>Clinical Rationale:</strong> {previewQuestion.overallRationale}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Examination Preview Dialog */}
      {previewRevisionId && (
        <ExaminationPreviewDialog
          revisionId={previewRevisionId}
          open={!!previewRevisionId}
          onOpenChange={(open) => !open && setPreviewRevisionId(null)}
        />
      )}

      {/* Delete Standalone Test Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" />
              Delete Standalone Custom Test
            </DialogTitle>
            <DialogDescription>
              Confirm removal of <strong>{deleteTarget?.title}</strong> ({deleteTarget?.code}).
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteExam}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
