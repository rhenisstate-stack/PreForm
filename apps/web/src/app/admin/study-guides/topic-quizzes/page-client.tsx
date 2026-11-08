"use client";

import * as React from "react";
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  Edit3,
  Sparkles,
  BarChart3,
  BookOpen,
  Database,
  CheckSquare,
  Clock,
  Award,
  AlertCircle,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminStudyService,
  AdminTopicQuiz,
  AdminQuizQuestion,
  AIDraftQuestion,
  AdminQuizAnalytics,
} from "@/lib/admin-study-service";
import { notify as toast } from "@/lib/notifications";

export function AdminTopicQuizzesClient() {
  const [activeTab, setActiveTab] = React.useState<"quizzes" | "analytics">("quizzes");

  // Quizzes State
  const [quizzes, setQuizzes] = React.useState<AdminTopicQuiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = React.useState<boolean>(true);
  const [search, setSearch] = React.useState<string>("");
  const [programmeFilter, setProgrammeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Quiz Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = React.useState<boolean>(false);
  const [editingQuizId, setEditingQuizId] = React.useState<string | null>(null);
  const [quizTitle, setQuizTitle] = React.useState<string>("");
  const [quizDescription, setQuizDescription] = React.useState<string>("");
  const [quizProgramme, setQuizProgramme] = React.useState<"rn" | "pn" | "both">("rn");
  const [quizTopicTitle, setQuizTopicTitle] = React.useState<string>("");
  const [quizTargetScore, setQuizTargetScore] = React.useState<number>(75);
  const [quizTimeLimit, setQuizTimeLimit] = React.useState<number>(30);
  const [quizFeedbackMode, setQuizFeedbackMode] = React.useState<"immediate" | "at_end">("immediate");
  const [quizMaxAttempts, setQuizMaxAttempts] = React.useState<number>(0);
  const [quizStatus, setQuizStatus] = React.useState<string>("Draft");
  const [isSavingQuiz, setIsSavingQuiz] = React.useState<boolean>(false);

  // Question Bank Picker Modal State
  const [assigningQuiz, setAssigningQuiz] = React.useState<AdminTopicQuiz | null>(null);
  const [bankQuestions, setBankQuestions] = React.useState<AdminQuizQuestion[]>([]);
  const [loadingBank, setLoadingBank] = React.useState<boolean>(false);
  const [bankSearch, setBankSearch] = React.useState<string>("");
  const [bankPathway, setBankPathway] = React.useState<string>("all");
  const [bankDifficulty, setBankDifficulty] = React.useState<string>("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = React.useState<string[]>([]);
  const [isSavingQuestions, setIsSavingQuestions] = React.useState<boolean>(false);

  // AI Question Generator Drawer State
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = React.useState<boolean>(false);
  const [aiTopic, setAiTopic] = React.useState<string>("");
  const [aiProgramme, setAiProgramme] = React.useState<string>("rn");
  const [aiCount, setAiCount] = React.useState<number>(5);
  const [aiDifficulty, setAiDifficulty] = React.useState<string>("moderate");
  const [isGeneratingAI, setIsGeneratingAI] = React.useState<boolean>(false);
  const [draftQuestions, setDraftQuestions] = React.useState<AIDraftQuestion[]>([]);

  // Analytics State
  const [analytics, setAnalytics] = React.useState<AdminQuizAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState<boolean>(false);

  // Deletion State
  const [deleteQuizId, setDeleteQuizId] = React.useState<string | null>(null);

  // Fetch Quizzes
  const fetchQuizzes = React.useCallback(async () => {
    try {
      setLoadingQuizzes(true);
      const prog = programmeFilter === "all" ? undefined : programmeFilter;
      const stat = statusFilter === "all" ? undefined : statusFilter;
      const res = await adminStudyService.getQuizzes(prog, stat, search.trim() || undefined);
      setQuizzes(res.quizzes);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load topic quizzes");
    } finally {
      setLoadingQuizzes(false);
    }
  }, [programmeFilter, statusFilter, search]);

  // Fetch Analytics
  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await adminStudyService.getQuizAnalytics();
      setAnalytics(res.analytics);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load quiz analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  React.useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  React.useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // Quiz CRUD Handlers
  const handleOpenQuizModal = (quiz?: AdminTopicQuiz) => {
    if (quiz) {
      setEditingQuizId(quiz.id);
      setQuizTitle(quiz.title);
      setQuizDescription(quiz.description || "");
      setQuizProgramme(quiz.programme);
      setQuizTopicTitle(quiz.topicTitle || "");
      setQuizTargetScore(quiz.targetScore);
      setQuizTimeLimit(quiz.timeLimitMinutes || 30);
      setQuizFeedbackMode(quiz.feedbackMode);
      setQuizMaxAttempts(quiz.maxAttempts);
      setQuizStatus(quiz.status);
    } else {
      setEditingQuizId(null);
      setQuizTitle("");
      setQuizDescription("");
      setQuizProgramme("rn");
      setQuizTopicTitle("");
      setQuizTargetScore(75);
      setQuizTimeLimit(30);
      setQuizFeedbackMode("immediate");
      setQuizMaxAttempts(0);
      setQuizStatus("Draft");
    }
    setIsQuizModalOpen(true);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      toast.error("Please enter a quiz title.");
      return;
    }

    try {
      setIsSavingQuiz(true);
      if (editingQuizId) {
        await adminStudyService.updateQuiz(editingQuizId, {
          title: quizTitle.trim(),
          description: quizDescription.trim(),
          programme: quizProgramme,
          topicTitle: quizTopicTitle.trim() || null,
          targetScore: quizTargetScore,
          timeLimitMinutes: quizTimeLimit > 0 ? quizTimeLimit : null,
          feedbackMode: quizFeedbackMode,
          maxAttempts: quizMaxAttempts,
          status: quizStatus,
        });
        toast.success("Topic quiz updated successfully");
      } else {
        await adminStudyService.createQuiz({
          title: quizTitle.trim(),
          description: quizDescription.trim(),
          programme: quizProgramme,
          topicTitle: quizTopicTitle.trim() || null,
          targetScore: quizTargetScore,
          timeLimitMinutes: quizTimeLimit > 0 ? quizTimeLimit : null,
          feedbackMode: quizFeedbackMode,
          maxAttempts: quizMaxAttempts,
          status: quizStatus,
        });
        toast.success("Topic quiz created successfully");
      }

      setIsQuizModalOpen(false);
      fetchQuizzes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save quiz");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleDuplicateQuiz = async (id: string) => {
    try {
      await adminStudyService.duplicateQuiz(id);
      toast.success("Quiz duplicated successfully");
      fetchQuizzes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate quiz");
    }
  };

  const handlePublishQuizToggle = async (quiz: AdminTopicQuiz) => {
    try {
      await adminStudyService.publishQuiz(quiz.id, !quiz.isPublished);
      toast.success(quiz.isPublished ? "Quiz unpublished" : "Quiz published to Study Studio");
      fetchQuizzes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle quiz publication");
    }
  };

  const handleDeleteQuizConfirm = async () => {
    if (!deleteQuizId) return;
    try {
      await adminStudyService.deleteQuiz(deleteQuizId);
      toast.success("Quiz deleted successfully");
      setDeleteQuizId(null);
      fetchQuizzes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete quiz");
    }
  };

  // Question Bank Picker Handlers
  const handleOpenAssignModal = async (quiz: AdminTopicQuiz) => {
    setAssigningQuiz(quiz);
    setSelectedQuestionIds(quiz.questionIds || []);
    try {
      setLoadingBank(true);
      const res = await adminStudyService.searchQuestions({
        pathway: quiz.programme === "both" ? undefined : quiz.programme,
        limit: 50,
      });
      setBankQuestions(res.questions);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load question bank");
    } finally {
      setLoadingBank(false);
    }
  };

  const handleSearchBank = async () => {
    try {
      setLoadingBank(true);
      const res = await adminStudyService.searchQuestions({
        search: bankSearch.trim() || undefined,
        pathway: bankPathway === "all" ? undefined : bankPathway,
        difficulty: bankDifficulty === "all" ? undefined : bankDifficulty,
        limit: 50,
      });
      setBankQuestions(res.questions);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to search questions");
    } finally {
      setLoadingBank(false);
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const handleSaveAssignedQuestions = async () => {
    if (!assigningQuiz) return;
    try {
      setIsSavingQuestions(true);
      await adminStudyService.assignQuestions(assigningQuiz.id, selectedQuestionIds);
      toast.success(`Assigned ${selectedQuestionIds.length} questions to quiz`);
      setAssigningQuiz(null);
      fetchQuizzes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign questions");
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // AI Question Generation Handler
  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter a clinical topic for question generation.");
      return;
    }
    try {
      setIsGeneratingAI(true);
      const res = await adminStudyService.generateDraftQuestions({
        topic: aiTopic.trim(),
        programme: aiProgramme,
        questionCount: aiCount,
        difficulty: aiDifficulty,
      });
      setDraftQuestions(res.questions);
      toast.success(`Generated ${res.questions.length} AI draft questions with clinical rationales`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate AI questions");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Topic Quizzes Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Author modular clinical quizzes, source questions from the canonical question bank, and generate AI draft items.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDraftQuestions([]);
              setIsAIGeneratorOpen(true);
            }}
            className="flex items-center gap-2 text-xs"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI Question Generator
          </Button>
          <Button onClick={() => handleOpenQuizModal()} className="flex items-center gap-2 text-xs">
            <Plus className="h-4 w-4" />
            New Topic Quiz
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          variant={activeTab === "quizzes" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("quizzes")}
          className="text-xs"
        >
          All Topic Quizzes
        </Button>
        <Button
          variant={activeTab === "analytics" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("analytics")}
          className="text-xs gap-1.5"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Quiz Performance Analytics
        </Button>
      </div>

      {/* TAB 1: ALL QUIZZES */}
      {activeTab === "quizzes" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search topic quizzes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div>
              <select
                value={programmeFilter}
                onChange={(e) => setProgrammeFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
              >
                <option value="all">All Programmes</option>
                <option value="rn">NCLEX-RN</option>
                <option value="pn">NCLEX-PN</option>
                <option value="both">Both (RN & PN)</option>
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="PendingReview">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published</option>
              </select>
            </div>
          </div>

          {/* Quizzes Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingQuizzes ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading topic quizzes...
                </div>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card">
                No topic quizzes found matching criteria.
              </div>
            ) : (
              quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-foreground text-base leading-snug">
                        {quiz.title}
                      </div>
                      <Badge variant="outline" className="text-xs uppercase font-mono shrink-0">
                        {quiz.programme}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                      {quiz.description || "Reinforces core topic clinical competencies."}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                      <span className="font-semibold text-primary">
                        {quiz.questionCount} questions
                      </span>
                      <span>•</span>
                      <span>Pass: {quiz.targetScore}%</span>
                      <span>•</span>
                      {quiz.isPublished ? (
                        <Badge className="bg-emerald-600 text-white text-xs">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {quiz.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignModal(quiz)}
                      className="text-xs gap-1.5"
                    >
                      <Database className="h-3.5 w-3.5 text-primary" />
                      Assign Bank ({quiz.questionCount})
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenQuizModal(quiz)}
                        title="Edit Quiz"
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateQuiz(quiz.id)}
                        title="Duplicate Quiz"
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePublishQuizToggle(quiz)}
                        title={quiz.isPublished ? "Unpublish Quiz" : "Publish Quiz"}
                        className={`h-8 w-8 p-0 ${
                          quiz.isPublished ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteQuizId(quiz.id)}
                        title="Delete Quiz"
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Quiz Attempts</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {analytics?.totalAttempts ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analytics?.completedAttempts ?? 0} completed ({analytics?.completionRate ?? 0}%)
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Average Score</span>
                <Award className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {analytics?.averageScore ?? 0}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Across all completed topic quizzes
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Average Time</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {Math.round((analytics?.averageDurationSeconds ?? 0) / 60)} min
              </div>
              <div className="text-xs text-muted-foreground mt-1">Per completed attempt</div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Missed Questions</span>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {analytics?.frequentlyMissedQuestions.length ?? 0} High-Yield
              </div>
              <div className="text-xs text-muted-foreground mt-1">&gt; 35% error rate</div>
            </div>
          </div>

          {/* Frequently Missed Items */}
          <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-base text-foreground">
              Frequently Missed Questions Across Topic Quizzes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b uppercase font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Question Stem</th>
                    <th className="px-3 py-2.5">Difficulty</th>
                    <th className="px-3 py-2.5">Total Responses</th>
                    <th className="px-3 py-2.5">Incorrect</th>
                    <th className="px-3 py-2.5">Miss Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics?.frequentlyMissedQuestions.map((q) => (
                    <tr key={q.questionId} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 max-w-md truncate font-medium">{q.stem}</td>
                      <td className="px-3 py-2.5 capitalize">{q.difficulty}</td>
                      <td className="px-3 py-2.5 font-mono">{q.totalResponses}</td>
                      <td className="px-3 py-2.5 font-mono text-destructive">{q.incorrectResponses}</td>
                      <td className="px-3 py-2.5 font-mono">
                        <Badge variant="destructive" className="text-[11px]">
                          {q.missRatePercentage}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Authoring Modal */}
      <Dialog open={isQuizModalOpen} onOpenChange={setIsQuizModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuizId ? "Edit Topic Quiz" : "Create Topic Quiz"}</DialogTitle>
            <DialogDescription>
              Configure scoring thresholds, time allocations, and feedback delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-foreground block mb-1">Quiz Title *</label>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Endocrine Emergencies: DKA vs HHS"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Description</label>
              <textarea
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder="Briefly describe the clinical focus..."
                className="w-full h-20 rounded-md border border-input bg-background p-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Programme *</label>
                <select
                  value={quizProgramme}
                  onChange={(e) => setQuizProgramme(e.target.value as "rn" | "pn" | "both")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                  <option value="both">Both (RN & PN)</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Topic</label>
                <Input
                  value={quizTopicTitle}
                  onChange={(e) => setQuizTopicTitle(e.target.value)}
                  placeholder="e.g. Endocrine"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Target Score %</label>
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={quizTargetScore}
                  onChange={(e) => setQuizTargetScore(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Time Limit (min)</label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={quizTimeLimit}
                  onChange={(e) => setQuizTimeLimit(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Feedback Mode</label>
                <select
                  value={quizFeedbackMode}
                  onChange={(e) => setQuizFeedbackMode(e.target.value as "immediate" | "at_end")}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                >
                  <option value="immediate">Immediate</option>
                  <option value="at_end">At End of Quiz</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Status</label>
              <select
                value={quizStatus}
                onChange={(e) => setQuizStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
              >
                <option value="Draft">Draft</option>
                <option value="PendingReview">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQuizModalOpen(false)}
              disabled={isSavingQuiz}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveQuiz} disabled={isSavingQuiz}>
              {isSavingQuiz ? "Saving..." : "Save Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Bank Picker Modal */}
      <Dialog open={!!assigningQuiz} onOpenChange={(open) => !open && setAssigningQuiz(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Source Questions from Question Bank
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select canonical NCLEX questions for &ldquo;{assigningQuiz?.title}&rdquo;. Selected:{" "}
              <span className="font-semibold text-primary">{selectedQuestionIds.length}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Search toolbar */}
          <div className="px-6 py-2 border-b grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search question stem or code..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchBank()}
                className="pl-8 text-xs h-8"
              />
            </div>
            <div>
              <select
                value={bankPathway}
                onChange={(e) => setBankPathway(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="all">All Pathways</option>
                <option value="rn">RN</option>
                <option value="pn">PN</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <Button size="sm" onClick={handleSearchBank} className="w-full h-8 text-xs">
                Search
              </Button>
            </div>
          </div>

          {/* Question List */}
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {loadingBank ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Loading question bank...
              </div>
            ) : bankQuestions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No questions found. Try adjusting filters.
              </div>
            ) : (
              bankQuestions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestionSelection(q.id)}
                    className={`p-3 rounded-md border text-xs cursor-pointer transition-colors flex items-start gap-3 ${
                      isSelected
                        ? "bg-primary/10 border-primary ring-1 ring-primary"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-input"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-muted-foreground text-[11px]">{q.code}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {q.pathway}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {q.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <p className="font-medium text-foreground leading-snug line-clamp-2">
                        {q.stem}
                      </p>
                      {q.overallRationale && (
                        <p className="text-muted-foreground text-[11px] line-clamp-1 italic">
                          Rationale: {q.overallRationale}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="p-4 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selectedQuestionIds.length} questions currently selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAssigningQuiz(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAssignedQuestions}
                disabled={isSavingQuestions}
              >
                {isSavingQuestions ? "Assigning..." : "Save Assigned Questions"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Question Generator Drawer / Modal */}
      <Dialog open={isAIGeneratorOpen} onOpenChange={setIsAIGeneratorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              AI-Assisted Question Generator
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generate draft clinical items with rationales, review before publishing to the question bank.
            </DialogDescription>
          </DialogHeader>

          {/* Generator Parameters */}
          <div className="px-6 py-3 border-b bg-muted/20 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="sm:col-span-2">
              <label className="font-medium text-foreground block mb-1">Clinical Topic *</label>
              <Input
                placeholder="e.g. Pediatric Dehydration & Fluid Resuscitation"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Programme</label>
              <select
                value={aiProgramme}
                onChange={(e) => setAiProgramme(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="rn">NCLEX-RN</option>
                <option value="pn">NCLEX-PN</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGeneratingAI}
                className="w-full h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isGeneratingAI ? "Generating..." : "Generate Items"}
              </Button>
            </div>
          </div>

          {/* Drafted Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {draftQuestions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Enter a topic above and click &ldquo;Generate Items&rdquo; to draft clinical NCLEX questions.
              </div>
            ) : (
              draftQuestions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card text-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-primary">Item #{idx + 1}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {q.difficulty}
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground leading-relaxed">{q.stem}</p>
                  <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded text-[11px] ${
                          oIdx === q.correctOptionIndex
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold dark:bg-emerald-950 dark:text-emerald-200"
                            : "bg-muted/20"
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}. {opt}{" "}
                        {oIdx === q.correctOptionIndex && "✓ (Correct Choice)"}
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 rounded bg-muted/30 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Rationale: </span>
                    {q.rationale}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="p-4 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {draftQuestions.length} draft questions generated
            </span>
            <Button variant="outline" size="sm" onClick={() => setIsAIGeneratorOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Quiz Dialog */}
      <Dialog open={!!deleteQuizId} onOpenChange={(open) => !open && setDeleteQuizId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Topic Quiz?</DialogTitle>
            <DialogDescription>
              This will permanently delete this quiz configuration and its attempt history from PostgreSQL.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteQuizId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteQuizConfirm}>
              Delete Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
