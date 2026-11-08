"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { NCLEXRNDashboardView } from "@/components/dashboard/nclex-rn-dashboard-view";
import { NCLEXPNDashboardView } from "@/components/dashboard/nclex-pn-dashboard-view";
import {
  ArrowRight,
  BarChart2,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Compass,
  CircleDot,
  Eye,
  EyeOff,
  FileEdit,
  FileQuestion,
  FileText,
  GraduationCap,
  HeartPulse,
  History,
  Info,
  Layers,
  ListChecks,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { QuestionFlagButton } from "@/components/assessments/question-flag-button";
import { InExamReauthModal, ExamReauthResult } from "@/components/assessments/in-exam-reauth-modal";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { BRAND } from "@/lib/brand";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";
import { fetchStudyOverview, StudyOverview } from "@/lib/study-service";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CompletedAssessmentAttempt,
  getTierShortCode,
  getTierStyles,
  SAMPLE_BENCHMARK_ATTEMPTS,
  getStoredAttempts,
  saveStoredAttempt,
  createCompletedAttempt,
  fetchAuthoritativeAttempts,
  CLINICAL_QUESTION_BANK,
  PerformanceTier,
  QuestionType,
  getPerformanceTier,
} from "@/lib/assessment-store";
import type {
  AvailableAssessmentDto,
  BackendExamAttemptDto,
  CandidateQuestionDto,
  ClientNeedMastery,
  StudyRecommendation,
  LearnerAnalyticsSummary,
  ReadinessTrend,
  TopicMastery,
} from "@/lib/api-services";

const OFFICIAL_NCSBN_CLIENT_NEEDS: Array<{ code: string; name: string; keywords: string[] }> = [
  { code: "MOC", name: "Safe and Effective Care Environment: Management of Care", keywords: ["management of care", "delegation", "prioritization"] },
  { code: "SIC", name: "Safe and Effective Care Environment: Safety and Infection Control", keywords: ["safety", "infection control"] },
  { code: "HPM", name: "Health Promotion and Maintenance", keywords: ["health promotion", "maternal", "pediatric"] },
  { code: "PSI", name: "Psychosocial Integrity", keywords: ["psychosocial", "mental health", "psychiatric"] },
  { code: "BCC", name: "Physiological Integrity: Basic Care and Comfort", keywords: ["basic care", "comfort", "nutrition", "mobility"] },
  { code: "PHA", name: "Physiological Integrity: Pharmacological and Parenteral Therapies", keywords: ["pharmacology", "pharmacological", "parenteral", "medication"] },
  { code: "RRP", name: "Physiological Integrity: Reduction of Risk Potential", keywords: ["reduction of risk", "risk potential", "diagnostic", "lab"] },
  { code: "PPT", name: "Physiological Integrity: Physiological Adaptation", keywords: ["physiological adaptation", "hemodynamic", "acute", "medical-surgical"] },
];

export const RECENT_ACTIVITY_STORAGE_KEY = "prepford_recent_study_activity";

export interface RecentStudyActivity {
  title: string;
  categoryTitle: string;
  href: string;
  pathway: "rn" | "pn";
  visitedAt: string;
}

function readStoredRecentActivity(): RecentStudyActivity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecentStudyActivity>;
    if (
      typeof parsed.title === "string" &&
      typeof parsed.href === "string" &&
      parsed.href.startsWith("/")
    ) {
      return {
        title: parsed.title,
        categoryTitle: parsed.categoryTitle || "Nursing Study Guide",
        href: parsed.href,
        pathway: parsed.pathway === "pn" ? "pn" : "rn",
        visitedAt: parsed.visitedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export interface DashboardClientProps {
  lockedPathway?: "rn" | "pn";
  initialPathway?: "rn" | "pn";
}

export function DashboardClient({ lockedPathway, initialPathway }: DashboardClientProps = {}) {
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();

  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [recentActivity, setRecentActivity] = React.useState<RecentStudyActivity | null>(
    () => readStoredRecentActivity()
  );

  // Sidebar & drawer state
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState<boolean>(false);

  // Active sub-tab: "tutored_cat" | "rat" | "all"
  const [activeTab, setActiveTab] = React.useState<"tutored_cat" | "rat" | "all">("tutored_cat");

  // Sample Benchmark preview toggle (when user has 0 attempts)
  const [showSamplePreview, setShowSamplePreview] = React.useState<boolean>(false);

  // Chart tooltip state
  const [hoveredAttemptIndex, setHoveredAttemptIndex] = React.useState<number | null>(null);

  // Interactive Modals
  const [createModalOpen, setCreateModalOpen] = React.useState<boolean>(false);
  const [reviewModalAttempt, setReviewModalAttempt] = React.useState<CompletedAssessmentAttempt | null>(null);
  const [reportModalAttempt, setReportModalAttempt] = React.useState<CompletedAssessmentAttempt | null>(null);

  // Refresh trigger for stored learner attempts
  const [attemptRefreshKey, setAttemptRefreshKey] = React.useState<number>(0);

  // Stored learner attempts computed from localStorage
  const storedAttempts = React.useMemo(() => {
    // attemptRefreshKey triggers re-reading when a new test attempt completes
    void attemptRefreshKey;
    return getStoredAttempts(user?.id);
  }, [user?.id, attemptRefreshKey]);

  // Synchronize authoritative attempt histories from PostgreSQL datastore
  const userId = user?.id;
  const userEmail = user?.email;
  const userName = user?.name;
  const userDisplayName = user?.displayName;
  const userRole = user?.role;
  const userPathway = user?.pathway;

  // AI Study Studio (Phase 1) live summary — real server data only; failures
  // surface an honest unavailable state rather than fabricated numbers.
  const [studyOverview, setStudyOverview] = React.useState<StudyOverview | null>(null);
  const [studyOverviewState, setStudyOverviewState] = React.useState<"loading" | "ready" | "unavailable">("loading");
  const [studyReloadKey, setStudyReloadKey] = React.useState<number>(0);

  React.useEffect(() => {
    if (!userId || !userEmail) return;
    let cancelled = false;
    setStudyOverviewState("loading");
    fetchStudyOverview()
      .then((overview) => {
        if (cancelled) return;
        setStudyOverview(overview);
        setStudyOverviewState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStudyOverviewState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, studyReloadKey]);

  React.useEffect(() => {
    if (userId && userEmail) {
      const syntheticSession = {
        userId,
        email: userEmail,
        name: userName || userDisplayName || "Candidate",
        displayName: userDisplayName || userName || "Candidate",
        role: userRole || "candidate",
        pathway: (userPathway === "pn" ? "pn" : "rn") as "rn" | "pn",
        csrfToken: "",
        sessionId: "",
        expiresAt: "",
      };
      fetchAuthoritativeAttempts(syntheticSession)
        .then(() => setAttemptRefreshKey((k) => k + 1))
        .catch(() => {});
    }
  }, [userId, userEmail, userName, userDisplayName, userRole, userPathway]);

  // Authoritative Learner Analytics & Lifecycle Attempts from PostgreSQL
  const [analyticsSummary, setAnalyticsSummary] = React.useState<LearnerAnalyticsSummary | null>(null);
  const [readinessTrend, setReadinessTrend] = React.useState<ReadinessTrend | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = React.useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = React.useState<string | null>(null);
  const [clientNeeds, setClientNeeds] = React.useState<ClientNeedMastery[]>([]);
  const [curriculumTopics, setCurriculumTopics] = React.useState<TopicMastery[]>([]);
  const [recommendations, setRecommendations] = React.useState<StudyRecommendation[]>([]);
  const [authoritativeAttempts, setAuthoritativeAttempts] = React.useState<BackendExamAttemptDto[]>([]);
  const [chartTimeRange, setChartTimeRange] = React.useState<"all" | "30d" | "7d">("all");
  const [selectedDomainFilter, setSelectedDomainFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    fetch("/api/attempts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list = data?.attempts || (Array.isArray(data) ? data : null);
        if (Array.isArray(list)) {
          setAuthoritativeAttempts(list);
        }
      })
      .catch(() => {});

    fetch("/api/learner/analytics/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.success && data.data) {
          setAnalyticsSummary(data.data);
        } else if (data && typeof data.totalCompletedAttempts === "number") {
          setAnalyticsSummary(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnalyticsError("Live server analytics unavailable; displaying verified account telemetry.");
        }
      });

    fetch("/api/learner/analytics/readiness-trend")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.success && data.data) {
          setReadinessTrend(data.data);
        } else if (data && data.attempts) {
          setReadinessTrend(data);
        }
      })
      .catch(() => {});

    fetch("/api/learner/analytics/client-needs")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.success && data.data) {
          setClientNeeds(data.data);
        } else if (Array.isArray(data)) {
          setClientNeeds(data);
        }
      })
      .catch(() => {});

    fetch("/api/learner/analytics/curriculum")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.success && Array.isArray(data.data)) {
          setCurriculumTopics(data.data);
        } else if (Array.isArray(data)) {
          setCurriculumTopics(data);
        }
      })
      .catch(() => {});

    fetch("/api/learner/analytics/recommendations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.success && data.data) {
          setRecommendations(data.data);
        } else if (Array.isArray(data)) {
          setRecommendations(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, attemptRefreshKey]);

  // Create test interactive form state
  const [createTestType, setCreateTestType] = React.useState<"tutored_cat" | "rat">("tutored_cat");
  const [testQuestionCount, setTestQuestionCount] = React.useState<number>(5);
  const [testInProgress, setTestInProgress] = React.useState<boolean>(false);
  const [availableAssessments, setAvailableAssessments] = React.useState<AvailableAssessmentDto[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = React.useState<string | null>(null);
  const [liveQuestions, setLiveQuestions] = React.useState<CandidateQuestionDto[]>([]);
  const [currentTestAnswers, setCurrentTestAnswers] = React.useState<Record<number, number | number[]>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = React.useState<number>(0);
  const [isSubmittingTest, setIsSubmittingTest] = React.useState<boolean>(false);
  const [referenceNowMs, setReferenceNowMs] = React.useState<number | null>(null);

  // Examination continuity: active attempt tracking and in-exam reauthentication modal
  const [activeAttemptId, setActiveAttemptId] = React.useState<string | null>(null);
  const [inExamReauthOpen, setInExamReauthOpen] = React.useState<boolean>(false);
  const [inExamReauthReason, setInExamReauthReason] = React.useState<string>("SESSION_EXPIRED");

  // Dedicated launcher for Create Test Now and Take Readiness Assessment
  const handleOpenCreateTest = React.useCallback(
    (type: "tutored_cat" | "rat" = "tutored_cat", domainCode?: string | null) => {
      setCreateTestType(type);
      setSelectedAssessmentId(null);
      setSelectedDomainFilter(domainCode ?? null);
      setTestQuestionCount(type === "rat" ? 65 : 5);
      setTestInProgress(false);
      setCreateModalOpen(true);
    },
    []
  );

  // Resumes an authoritative InProgress attempt (strictly refuses Completed/Abandoned attempts)
  const handleResumeAttempt = React.useCallback(
    (attemptId: string, testType: "tutored_cat" | "rat" = "tutored_cat", status: string = "InProgress") => {
      if (status !== "InProgress") return;
      setActiveAttemptId(attemptId);
      setCreateTestType(testType);
      setCurrentTestAnswers({});
      setActiveQuestionIndex(0);
      setTestInProgress(true);
      setCreateModalOpen(true);

      if (typeof window !== "undefined") {
        fetch(`/api/attempts/${encodeURIComponent(attemptId)}/questions`)
          .then((res) => (res.ok ? res.json() : null))
          .then((qData) => {
            if (qData?.success && Array.isArray(qData.questions) && qData.questions.length > 0) {
              setLiveQuestions(qData.questions);
              setTestQuestionCount(qData.questions.length);
            }
          })
          .catch(() => {});
      }
    },
    []
  );

  // Support direct links and bookmarked assessment routes (?action=rat, ?action=create-test, ?tab=rat, ?clientNeed=...)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const tab = params.get("tab");
    const clientNeed = params.get("clientNeed");

    if (tab === "rat" || tab === "tutored_cat" || tab === "all") {
      setActiveTab(tab);
    }
    if (action === "rat") {
      setActiveTab("rat");
      handleOpenCreateTest("rat");
    } else if (action === "create-test") {
      handleOpenCreateTest("tutored_cat", clientNeed);
    } else if (clientNeed) {
      handleOpenCreateTest("tutored_cat", clientNeed);
    }
  }, [handleOpenCreateTest]);

  const handleExamReauthenticated = (result: ExamReauthResult) => {
    setInExamReauthOpen(false);
    if (result.attempt?.remainingSeconds !== null && result.attempt?.remainingSeconds !== undefined) {
      setSessionSeconds(result.attempt.remainingSeconds);
    }
    if (result.attempt?.id) {
      setActiveAttemptId(result.attempt.id);
    }
  };

  // Cognitive fatigue relief: calm timer, note-taking scratchpad, collapsible rationales
  const [isTimerVisible, setIsTimerVisible] = React.useState<boolean>(true);
  const [sessionSeconds, setSessionSeconds] = React.useState<number>(0);
  const [questionNotes, setQuestionNotes] = React.useState<Record<number, string>>({});
  const [showNotePad, setShowNotePad] = React.useState<boolean>(false);
  const [expandedRationales, setExpandedRationales] = React.useState<Record<string, boolean>>({});

  // Calm timer ticking only when test is active
  React.useEffect(() => {
    if (!testInProgress) {
      setSessionSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [testInProgress]);

  const formatTimerDisplay = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activePathway: "rn" | "pn" | null =
    lockedPathway ?? (user?.pathway === "rn" || user?.pathway === "pn" ? user.pathway : null);
  const pathwayLabel = activePathway === "pn" ? "NCLEX-PN" : activePathway === "rn" ? "NCLEX-RN" : "Unassigned";
  const cartItemCount = cart?.itemCount ?? 0;

  const recordActivity = React.useCallback(
    (entry: Omit<RecentStudyActivity, "visitedAt">) => {
      const next: RecentStudyActivity = {
        ...entry,
        visitedAt: new Date().toISOString(),
      };
      setRecentActivity(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(RECENT_ACTIVITY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    []
  );

  // Fetch published assessments for active pathway
  React.useEffect(() => {
    if (!isAuthenticated || !activePathway) return;
    let cancelled = false;
    fetch(`/api/assessments/available?pathway=${encodeURIComponent(activePathway)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.assessments && Array.isArray(data.assessments)) {
          setAvailableAssessments(data.assessments);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, activePathway]);

  // Determine current active attempts list based on tab & preview toggle
  const filteredAttempts = React.useMemo(() => {
    let source = storedAttempts;
    if (storedAttempts.length === 0 && showSamplePreview) {
      source = SAMPLE_BENCHMARK_ATTEMPTS;
    }

    if (activeTab === "tutored_cat") {
      return source.filter((a) => a.type === "tutored_cat");
    }
    if (activeTab === "rat") {
      return source.filter((a) => a.type === "rat");
    }
    return source;
  }, [storedAttempts, showSamplePreview, activeTab]);

  // Launches an assessment session with backend snapshot dispatch and offline fallback
  const handleStartTestSession = (overrideAssessmentId?: string) => {
    const tempId = "att_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    setActiveAttemptId(tempId);
    setCurrentTestAnswers({});
    setActiveQuestionIndex(0);
    setTestInProgress(true);

    if (isAuthenticated && typeof window !== "undefined") {
      const examId = overrideAssessmentId || selectedAssessmentId || undefined;
      fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          pathway: activePathway ?? "rn",
          testType: createTestType,
          questionCount: testQuestionCount,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then(async (data) => {
          if (data?.success && data.attemptId) {
            setActiveAttemptId(data.attemptId);
            const qRes = await fetch(`/api/attempts/${encodeURIComponent(data.attemptId)}/questions`);
            if (qRes.ok) {
              const qData = await qRes.json();
              if (qData?.success && Array.isArray(qData.questions) && qData.questions.length > 0) {
                setLiveQuestions(qData.questions);
                setTestQuestionCount(qData.questions.length);
              }
            }
          }
        })
        .catch(() => {});
    }
  };

  // Handle submitting a completed test in the test simulator with debounce and double-submit protection
  const handleCompleteTest = () => {
    if (isSubmittingTest) return;
    setIsSubmittingTest(true);

    const finishLocally = () => {
      try {
        const qSlice: typeof CLINICAL_QUESTION_BANK = [];
        for (let i = 0; i < testQuestionCount; i++) {
          qSlice.push(CLINICAL_QUESTION_BANK[i % CLINICAL_QUESTION_BANK.length]);
        }

        const formattedAnswers = qSlice.map((q, idx) => {
          const ans = currentTestAnswers[idx];
          if (q.questionType === "multi_select") {
            return {
              questionIndex: idx,
              selectedOptionIndices: Array.isArray(ans) ? ans : typeof ans === "number" ? [ans] : [],
            };
          } else {
            return {
              questionIndex: idx,
              selectedOptionIndex: typeof ans === "number" ? ans : -1,
            };
          }
        });

        const nextAttemptNumber = storedAttempts.filter((a) => a.type === createTestType).length + 1;
        const completed = createCompletedAttempt({
          testType: createTestType,
          attemptNumber: nextAttemptNumber,
          questionCount: testQuestionCount,
          userAnswers: formattedAnswers,
          pathway: activePathway ?? "rn",
        });

        const candidateSession = user?.id ? {
          userId: user.id,
          email: user.email,
          name: user.name || user.displayName || "Candidate",
          displayName: user.displayName || user.name || "Candidate",
          role: user.role || "candidate",
          pathway: (activePathway === "pn" ? "pn" : "rn") as "rn" | "pn",
          csrfToken: "",
          sessionId: "",
          expiresAt: "",
        } : null;

        saveStoredAttempt(user?.id, completed, candidateSession);
        setAttemptRefreshKey((k) => k + 1);
        setTestInProgress(false);
        setCreateModalOpen(false);
        setCurrentTestAnswers({});
        setActiveQuestionIndex(0);
        // Open review modal immediately for the new attempt
        setReviewModalAttempt(completed);
      } finally {
        setIsSubmittingTest(false);
      }
    };

    if (activeAttemptId && liveQuestions.length > 0 && !activeAttemptId.startsWith("att_")) {
      fetch(`/api/attempts/${encodeURIComponent(activeAttemptId)}/submit`, {
        method: "POST",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then(async (submitData) => {
          if (submitData?.success) {
            const detailRes = await fetch(`/api/attempts/${encodeURIComponent(activeAttemptId)}`);
            if (detailRes.ok) {
              const detailJson = await detailRes.json();
              const backendAttempt = detailJson.attempt || detailJson;
              if (backendAttempt && backendAttempt.id) {
                const now = new Date();
                const completed: CompletedAssessmentAttempt = {
                  id: backendAttempt.id,
                  name: backendAttempt.name || (createTestType === "tutored_cat" ? `Tutored CAT ${storedAttempts.length + 1}` : `Readiness Test ${storedAttempts.length + 1}`),
                  type: createTestType,
                  date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                  timestamp: Date.now(),
                  scorePercent: Math.round(backendAttempt.scorePercent ?? 0),
                  performanceTier: (backendAttempt.performanceTier || getPerformanceTier(backendAttempt.scorePercent ?? 0)) as PerformanceTier,
                  totalQuestions: backendAttempt.totalResponses || liveQuestions.length,
                  correctCount: backendAttempt.correctCount ?? 0,
                  durationMinutes: backendAttempt.durationMinutes || Math.max(5, Math.round(liveQuestions.length * 0.8)),
                  domains: (backendAttempt.domainBreakdown || []).map((db: any) => ({
                    domain: db.domain || db.domainName || "Care Management",
                    scorePercent: Math.round(db.scorePercent ?? 0),
                    totalQuestions: db.totalQuestions ?? 0,
                    correctCount: db.correctCount ?? 0,
                  })),
                  questions: (backendAttempt.questions || liveQuestions).map((q: any, idx: number) => {
                    const ans = currentTestAnswers[idx];
                    const selectedIdx = typeof ans === "number" ? ans : -1;
                    const selectedIndices = Array.isArray(ans) ? ans : typeof ans === "number" ? [ans] : [];
                    const correctIndices = q.correctAnswerIndices || [];
                    const isCorrect = q.isCorrect !== undefined
                      ? q.isCorrect
                      : (correctIndices.length > 0 && selectedIndices.length === correctIndices.length && selectedIndices.every((i: number) => correctIndices.includes(i)));
                    return {
                      id: q.id || `q-${idx}`,
                      questionNumber: idx + 1,
                      stem: q.stem,
                      domain: q.domain || "Safe and Effective Care Environment: Management of Care",
                      subdomain: q.subdomain,
                      questionType: (["sata", "multiple-choice", "checkbox", "multiple-image"].includes(q.questionType) ? "multi_select" : "single_choice") as QuestionType,
                      userAnswerIndex: selectedIdx,
                      userAnswerIndices: selectedIndices,
                      correctAnswerIndex: correctIndices[0],
                      correctAnswerIndices: correctIndices,
                      options: Array.isArray(q.options) ? q.options.map((o: any) => typeof o === "string" ? o : o.text || "") : [],
                      rationale: q.rationale || q.explanation || "",
                      isCorrect,
                      scoreAwarded: isCorrect ? 1 : 0,
                      isUnanswered: selectedIndices.length === 0 && selectedIdx === -1,
                    };
                  }),
                  isSampleData: false,
                };

                const candidateSession = user?.id ? {
                  userId: user.id,
                  email: user.email,
                  name: user.name || user.displayName || "Candidate",
                  displayName: user.displayName || user.name || "Candidate",
                  role: user.role || "candidate",
                  pathway: (activePathway === "pn" ? "pn" : "rn") as "rn" | "pn",
                  csrfToken: "",
                  sessionId: "",
                  expiresAt: "",
                } : null;

                saveStoredAttempt(user?.id, completed, candidateSession);
                setAttemptRefreshKey((k) => k + 1);
                setTestInProgress(false);
                setCreateModalOpen(false);
                setCurrentTestAnswers({});
                setActiveQuestionIndex(0);
                setReviewModalAttempt(completed);
                setIsSubmittingTest(false);
                return;
              }
            }
          }
          finishLocally();
        })
        .catch(() => finishLocally());
      return;
    }

    finishLocally();
  };

  if (isLoading) {
    return <BrandedLoading message="Loading learner study workspace..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    const signInReturnPath = lockedPathway === "rn" ? "/dashboard/rn" : lockedPathway === "pn" ? "/dashboard/pn" : "/dashboard";
    return (
      <div
        data-testid="dashboard-unauthenticated"
        className="w-full py-24 px-4 text-center bg-background"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 text-secondary mb-6">
          <Stethoscope className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-3">
          Sign In Required
        </h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-md mx-auto leading-relaxed">
          Please sign in to access your PrepFord learner dashboard, study guides, practice scenarios, and account settings.
        </p>
        <Link
          href={`/sign-in?from=${signInReturnPath}`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <span>Sign In to Workspace</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  // Entitlement verification for locked pathway routes
  if (
    user &&
    lockedPathway &&
    user.role !== "admin" &&
    user.role !== "superadmin" &&
    user.pathway &&
    user.pathway !== lockedPathway
  ) {
    const isRn = lockedPathway === "rn";
    return (
      <div
        data-testid="dashboard-entitlement-blocked"
        className="w-full py-24 px-4 text-center bg-background"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-3">
          {isRn ? "NCLEX-RN Entitlement Required" : "NCLEX-PN Entitlement Required"}
        </h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-md mx-auto leading-relaxed">
          Your PrepFord account is currently configured for the{" "}
          <strong className="text-foreground">
            {user?.pathway === "pn" ? "NCLEX-PN (Practical Nursing)" : "NCLEX-RN (Registered Nursing)"}
          </strong>{" "}
          pathway. To access this dashboard, return to your enrolled pathway or add this examination package to your account.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={isRn ? "/dashboard/pn" : "/dashboard/rn"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <span>Return to {isRn ? "NCLEX-PN" : "NCLEX-RN"} Dashboard</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={isRn ? "/nclex-rn#rn-study-plans" : "/nclex-pn#pn-study-plans"}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <span>View {isRn ? "NCLEX-RN" : "NCLEX-PN"} Plans</span>
          </Link>
        </div>
      </div>
    );
  }

  const learnerName = user.displayName || user.name || "Candidate";

  // Chart coordinate calculations (width 760, height 260) with time-range filter
  const baseChronologicalAttempts = filteredAttempts.slice().reverse(); // Chronological left-to-right
  const latestAttemptTimestampMs =
    baseChronologicalAttempts.length > 0
      ? Math.max(...baseChronologicalAttempts.map((a) => a.timestamp))
      : 0;
  const activeReferenceNowMs = referenceNowMs ?? latestAttemptTimestampMs;
  const chartAttempts = baseChronologicalAttempts.filter((attempt) => {
    if (chartTimeRange === "all" || attempt.isSampleData) return true;
    const cutoffMs =
      chartTimeRange === "7d"
        ? activeReferenceNowMs - 7 * 24 * 60 * 60 * 1000
        : activeReferenceNowMs - 30 * 24 * 60 * 60 * 1000;
    return attempt.timestamp >= cutoffMs;
  });
  const chartWidth = 760;
  const chartHeight = 240;
  const paddingX = 60;
  const paddingYTop = 30;
  const paddingYBottom = 30;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingYTop - paddingYBottom;

  const getYCoord = (score: number) => {
    const validScore = typeof score === "number" && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
    return paddingYTop + plotHeight - (validScore / 100) * plotHeight;
  };

  const getXCoord = (index: number, count: number) => {
    if (count <= 1) return paddingX + plotWidth / 2;
    return paddingX + (index / (count - 1)) * plotWidth;
  };

  const chartPoints = chartAttempts.map((attempt, idx) => ({
    attempt,
    x: getXCoord(idx, chartAttempts.length),
    y: getYCoord(attempt.scorePercent),
    shortCode: getTierShortCode(attempt.performanceTier),
  }));

  const chartPathD =
    chartPoints.length > 1
      ? chartPoints.reduce((acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), "")
      : "";

  const benchmarkY = getYCoord(65); // 65% PrepFord practice benchmark reference line

  // Computed Authoritative Metrics for KPI Cards & Activity Analytics
  const displayTotalCompleted = analyticsSummary?.totalCompletedAttempts ?? storedAttempts.length;
  const displayTotalQuestions =
    analyticsSummary?.totalPracticeQuestions ??
    storedAttempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
  const displayAccuracy = analyticsSummary?.averageScorePercent
    ? Math.round(analyticsSummary.averageScorePercent)
    : storedAttempts.length > 0
    ? Math.round(storedAttempts.reduce((acc, a) => acc + a.scorePercent, 0) / storedAttempts.length)
    : 0;

  const rawReadinessTier =
    analyticsSummary?.currentReadinessTier && analyticsSummary.currentReadinessTier !== "Unassessed"
      ? analyticsSummary.currentReadinessTier
      : storedAttempts.length > 0
      ? storedAttempts[0].performanceTier
      : "Unassessed";

  const displayReadinessTier: PerformanceTier | "Unassessed" =
    rawReadinessTier === "HighReadiness" || rawReadinessTier === "Very High"
      ? "Very High"
      : rawReadinessTier === "ProbableReadiness" || rawReadinessTier === "High"
      ? "High"
      : rawReadinessTier === "MarginalReadiness" || rawReadinessTier === "Borderline"
      ? "Borderline"
      : rawReadinessTier === "RemediationRequired" || rawReadinessTier === "Low"
      ? "Low"
      : "Unassessed";

  const displayReadinessStyle =
    displayReadinessTier === "Unassessed"
      ? { badgeBg: "bg-muted text-muted-foreground", badgeBorder: "border-border", accentHex: "#94a3b8" }
      : getTierStyles(displayReadinessTier);

  const ratCompletedCount =
    readinessTrend?.totalDiagnosticAttempts ??
    storedAttempts.filter((a) => a.type === "rat").length;
  const catCompletedCount = Math.max(
    0,
    displayTotalCompleted - ratCompletedCount || storedAttempts.filter((a) => a.type === "tutored_cat").length
  );

  // Authoritative Lifecycle Counts (Completed vs InProgress vs Abandoned)
  // Interrupted or abandoned attempts are strictly excluded from completed totals.
  const inProgressAttempts = authoritativeAttempts.filter((a) => a.status === "InProgress");
  const abandonedAttempts = authoritativeAttempts.filter((a) => a.status === "Abandoned");
  const activeAvailableResumables = availableAssessments.filter(
    (asm) => asm.hasActiveAttempt && asm.activeAttemptId && !inProgressAttempts.some((ip) => ip.id === asm.activeAttemptId)
  );
  const inProgressAttemptsCount = inProgressAttempts.length + activeAvailableResumables.length;
  const abandonedAttemptsCount = abandonedAttempts.length;
  const totalLifecycleAttemptsCount = displayTotalCompleted + inProgressAttemptsCount + abandonedAttemptsCount;
  const completionRatePercent =
    totalLifecycleAttemptsCount > 0
      ? Math.round((displayTotalCompleted / totalLifecycleAttemptsCount) * 100)
      : displayTotalCompleted > 0
      ? 100
      : 0;

  const totalDurationMinutes =
    analyticsSummary?.totalDurationMinutes ??
    storedAttempts.reduce((acc, a) => acc + (a.durationMinutes || 0), 0);
  const avgDurationMinutes =
    displayTotalCompleted > 0 ? Math.max(1, Math.round(totalDurationMinutes / displayTotalCompleted)) : 0;

  // Question-Performance Analytics (Correct, Incorrect, Unanswered)
  const activeQuestionSource =
    storedAttempts.length > 0 ? storedAttempts : showSamplePreview ? SAMPLE_BENCHMARK_ATTEMPTS : [];
  const localTotalQuestions = activeQuestionSource.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
  const localCorrectQuestions = activeQuestionSource.reduce((acc, a) => acc + (a.correctCount || 0), 0);
  const localUnansweredQuestions = activeQuestionSource.reduce(
    (acc, a) => acc + (a.questions ? a.questions.filter((q) => q.isUnanswered).length : 0),
    0
  );
  const clientNeedsTotalAssessed = clientNeeds.reduce((acc, cn) => acc + (cn.totalAssessedQuestions || 0), 0);
  const clientNeedsTotalCorrect = clientNeeds.reduce((acc, cn) => acc + (cn.correctCount || 0), 0);

  const effectiveTotalQuestions =
    displayTotalQuestions > 0 ? displayTotalQuestions : localTotalQuestions;
  const totalCorrectQuestions =
    clientNeedsTotalAssessed > 0
      ? clientNeedsTotalCorrect
      : storedAttempts.length > 0 || showSamplePreview
      ? localCorrectQuestions
      : Math.round((effectiveTotalQuestions * displayAccuracy) / 100);
  const totalUnansweredQuestions = localUnansweredQuestions;
  const totalIncorrectQuestions = Math.max(
    0,
    effectiveTotalQuestions - totalCorrectQuestions - totalUnansweredQuestions
  );

  // Effective 8-Category NCSBN Client Needs Mastery (merges authoritative API data with verified attempt domains)
  const effectiveClientNeeds: ClientNeedMastery[] =
    clientNeeds.length > 0
      ? clientNeeds
      : OFFICIAL_NCSBN_CLIENT_NEEDS.map((cat) => {
          let totalQ = 0;
          let correctQ = 0;
          for (const attempt of activeQuestionSource) {
            for (const dom of attempt.domains || []) {
              const lowerDom = dom.domain.toLowerCase();
              if (cat.keywords.some((kw) => lowerDom.includes(kw))) {
                totalQ += dom.totalQuestions || 0;
                correctQ += dom.correctCount || 0;
              }
            }
          }
          const acc = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
          const isLow = totalQ > 0 && totalQ < 5;
          const tier =
            totalQ === 0
              ? "Unassessed"
              : acc >= 75
              ? "Strong"
              : acc >= 65
              ? "Proficient"
              : "Needs Review";
          return {
            categoryCode: cat.code,
            categoryName: cat.name,
            totalAssessedQuestions: totalQ,
            correctCount: correctQ,
            accuracyPercent: acc,
            isLowSample: isLow,
            performanceTier: tier,
          };
        });

  return (
    <div
      data-testid="learner-dashboard"
      className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground"
    >
      {/* =====================================================================
          1. PERSISTENT DARK TEAL SIDEBAR (Desktop + Mobile Drawer)
         ===================================================================== */}
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          data-testid="mobile-sidebar-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        data-testid="learner-sidebar"
        aria-label="Learner Workspace Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-card border-r border-border text-foreground dark:bg-[#07161C] dark:border-[#153441] dark:text-slate-100 transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? "w-20" : "w-64"
        } ${
          mobileDrawerOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border dark:border-[#153441]">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label={`${BRAND.fullName} home`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo.assetPath}
              alt={BRAND.logo.alt}
              className="h-10 w-10 rounded-xl object-contain shrink-0 bg-muted/60 dark:bg-white/10 p-1 border border-border/60 dark:border-white/10"
              width={40}
              height={40}
            />
            {!sidebarCollapsed && (
              <span
                data-testid="brand-wordmark-stacked"
                className="flex flex-col font-serif tracking-tight font-bold leading-none text-left -space-y-0.5 justify-center"
              >
                <span className="text-base sm:text-lg leading-none text-teal-600 dark:text-teal-300">Prep</span>
                <span className="text-base sm:text-lg leading-none text-foreground dark:text-white">Ford</span>
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            data-testid="sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {/* Actions: Create Test Now & Take Readiness Assessment */}
          <div className="px-1 space-y-2">
            <button
              type="button"
              data-testid="sidebar-create-test-btn"
              onClick={() => handleOpenCreateTest("tutored_cat")}
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-98 text-slate-950 font-semibold text-sm transition-all shadow-md py-2.5 px-3 ${
                sidebarCollapsed ? "px-2" : ""
              }`}
              title="Create Test Now"
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
              {!sidebarCollapsed && <span>+ Create Test Now</span>}
            </button>
            <button
              type="button"
              data-testid="sidebar-take-rat-btn"
              onClick={() => handleOpenCreateTest("rat")}
              className={`w-full flex items-center justify-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-200 font-semibold text-xs transition-all py-2 px-3 ${
                sidebarCollapsed ? "px-2" : ""
              }`}
              title="Take Readiness Assessment (RAT)"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {!sidebarCollapsed && <span>Take Readiness Test</span>}
            </button>
          </div>

          {/* Group 1: LEARN */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Learn
              </div>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-teal-700 bg-teal-500/10 font-semibold shadow-2xs dark:text-teal-300 dark:bg-white/10 border-l-2 border-teal-600 dark:border-teal-400 transition-colors"
              title="Dashboard"
            >
              <Compass className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>
            {activePathway === "rn" ? (
              <Link
                href="/dashboard/rn"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
                title="NCLEX-RN"
              >
                <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
                {!sidebarCollapsed && <span>NCLEX-RN</span>}
              </Link>
            ) : (
              <Link
                href="/dashboard/pn"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
                title="NCLEX-PN"
              >
                <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
                {!sidebarCollapsed && <span>NCLEX-PN</span>}
              </Link>
            )}
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Study Guides"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Study Guides</span>}
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Practice Activities"
            >
              <FileQuestion className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Practice Activities</span>}
            </Link>
          </div>

          {/* Group 1b: AI STUDY STUDIO (Phase 1 active-recall tools) */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                AI Study Studio
              </div>
            )}
            <Link
              href="/dashboard/study"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="AI Study Studio Overview"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {!sidebarCollapsed ? (
                <div className="flex-1 flex items-center justify-between">
                  <span>Study Studio</span>
                  {studyOverviewState === "ready" && studyOverview && studyOverview.dueCount > 0 && (
                    <span className="text-[10px] bg-teal-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full">
                      {studyOverview.dueCount} due
                    </span>
                  )}
                </div>
              ) : (
                studyOverviewState === "ready" &&
                studyOverview && studyOverview.dueCount > 0 && (
                  <span className="absolute ml-6 text-[10px] bg-teal-500 text-slate-950 font-bold px-1 py-0.5 rounded-full">
                    {studyOverview.dueCount}
                  </span>
                )
              )}
            </Link>
            <Link
              href="/dashboard/study/review"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Flashcard review session"
            >
              <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Review Flashcards</span>}
            </Link>
            <Link
              href="/dashboard/study/flashcards"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Flashcard decks"
            >
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Flashcard Decks</span>}
            </Link>
            <Link
              href="/dashboard/study/quizzes"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Quick topic drills"
            >
              <FileQuestion className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Topic Quizzes</span>}
            </Link>
          </div>

          {/* Group 2: TEST BANK & ASSESSMENTS */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Test Bank & Assessments
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("tutored_cat")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "tutored_cat"
                  ? "text-teal-700 bg-teal-500/10 dark:text-teal-300 dark:bg-white/10 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
              }`}
              title="Tutored CATs"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {!sidebarCollapsed && <span>Tutored CATs</span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rat")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "rat"
                  ? "text-teal-700 bg-teal-500/10 dark:text-teal-300 dark:bg-white/10 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
              }`}
              title="Readiness Assessment Tests (RAT)"
            >
              <HeartPulse className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Readiness Tests (RAT)</span>}
            </button>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Test-Taking Strategies"
            >
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Test-Taking Strategies</span>}
            </Link>
          </div>

          {/* Group 3: REPORTS */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Reports
              </div>
            )}
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-teal-700 bg-teal-500/10 border border-teal-500/30 dark:text-teal-300 dark:bg-teal-500/15"
              title="Previous Tests"
            >
              <History className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {!sidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Previous Tests</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-700 dark:text-teal-300 font-mono px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              )}
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Statistics"
            >
              <BarChart2 className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </Link>
          </div>

          {/* Group 4: ACCOUNT */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Account
              </div>
            )}
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Profile"
            >
              <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Profile & Settings</span>}
            </Link>
            <Link
              href="/dashboard/settings/security"
              data-testid="sidebar-nav-security"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Security & Devices"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Security & Devices</span>}
            </Link>
            <Link
              href="/cart"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Cart"
            >
              <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Cart</span>
                  {cartItemCount > 0 && (
                    <span className="text-[10px] bg-teal-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                      {cartItemCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Learning Notes"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Learning Notes</span>}
            </Link>
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-border dark:border-[#153441] bg-muted/40 dark:bg-[#0A1D25]">
          <div className="flex items-center gap-3">
            <LearnerAvatar
              picture={user?.picture}
              name={learnerName}
              sizeClassName="h-9 w-9"
              fallbackClassName="bg-teal-600/30 text-teal-700 dark:text-teal-300 border-teal-500/40"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground dark:text-slate-200 truncate">{learnerName}</p>
                <p className="text-[11px] text-teal-600 dark:text-teal-400/80 truncate font-mono uppercase">
                  {pathwayLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          2. MAIN CONTENT AREA (Pushed by Sidebar on Desktop)
         ===================================================================== */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Compact Top Header */}
        <header
          data-testid="dashboard-header"
          className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-card/95 backdrop-blur-md border-b border-border shadow-2xs"
        >
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="mobile-sidebar-toggle"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <nav data-testid="dashboard-breadcrumbs" aria-label="Breadcrumbs" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              {lockedPathway === "rn" ? (
                <>
                  <Link href="/nclex-rn" className="hover:text-foreground transition-colors">
                    NCLEX-RN
                  </Link>
                  <span>/</span>
                  <span className="text-foreground font-medium">RN Learner Dashboard</span>
                </>
              ) : lockedPathway === "pn" ? (
                <>
                  <Link href="/nclex-pn" className="hover:text-foreground transition-colors">
                    NCLEX-PN
                  </Link>
                  <span>/</span>
                  <span className="text-foreground font-medium">PN Learner Dashboard</span>
                </>
              ) : (
                <span className="text-foreground font-medium">Previous Tests</span>
              )}
            </nav>
          </div>

          {/* Right: Pathway Switcher, Theme Switcher, Cart & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Pathway Badge */}
            <span
              data-testid="dashboard-pathway-badge"
              className="px-2.5 py-1 rounded-md bg-card text-foreground font-semibold shadow-2xs border border-border text-xs"
            >
              {pathwayLabel}
            </span>

            {/* Cart Link */}
            <Link
              href="/cart"
              data-testid="dashboard-cart-link"
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Notifications Bell */}
            <button
              type="button"
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-card" />
            </button>

            {/* Theme switcher */}
            <ThemeSwitcher />

            {/* Learner Avatar Chip */}
            <Link
              href="/profile"
              data-testid="learner-account-menu"
              className="flex items-center gap-2 pl-2 border-l border-border hover:opacity-90 transition-opacity"
            >
              <LearnerAvatar
                picture={user?.picture}
                name={learnerName}
                sizeClassName="h-8 w-8"
                alt={`${learnerName} — profile & settings`}
              />
              <span className="hidden md:inline-block text-xs font-semibold text-foreground max-w-[100px] truncate">
                {learnerName}
              </span>
            </Link>
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] w-full mx-auto">
          {lockedPathway === "rn" || (!lockedPathway && activePathway === "rn") ? (
            <NCLEXRNDashboardView
              learnerName={learnerName}
              userEmail={userEmail}
              userRole={userRole}
              userPathway={userPathway}
              activePlan={user?.activePlan}
              targetExamDate={user?.targetExamDate}
              recentActivity={recentActivity}
              onOpenCreateTest={handleOpenCreateTest}
              onResumeAttempt={handleResumeAttempt}
              onReviewAttempt={setReviewModalAttempt}
              onViewReport={setReportModalAttempt}
              authoritativeAttempts={authoritativeAttempts}
              storedAttempts={storedAttempts}
              analyticsSummary={analyticsSummary}
              readinessTrend={readinessTrend}
              clientNeeds={clientNeeds}
              curriculumTopics={curriculumTopics}
              recommendations={recommendations}
              studyOverview={studyOverview}
              studyOverviewState={studyOverviewState}
              availableAssessments={availableAssessments}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showSamplePreview={showSamplePreview}
              setShowSamplePreview={setShowSamplePreview}
              chartTimeRange={chartTimeRange}
              setChartTimeRange={setChartTimeRange}
              hoveredAttemptIndex={hoveredAttemptIndex}
              setHoveredAttemptIndex={setHoveredAttemptIndex}
            />
          ) : lockedPathway === "pn" || (!lockedPathway && activePathway === "pn") ? (
            <NCLEXPNDashboardView
              learnerName={learnerName}
              userEmail={userEmail}
              userRole={userRole}
              userPathway={userPathway}
              activePlan={user?.activePlan}
              targetExamDate={user?.targetExamDate}
              recentActivity={recentActivity}
              onOpenCreateTest={handleOpenCreateTest}
              onResumeAttempt={handleResumeAttempt}
              onReviewAttempt={setReviewModalAttempt}
              onViewReport={setReportModalAttempt}
              authoritativeAttempts={authoritativeAttempts}
              storedAttempts={storedAttempts}
              analyticsSummary={analyticsSummary}
              readinessTrend={readinessTrend}
              clientNeeds={clientNeeds}
              curriculumTopics={curriculumTopics}
              recommendations={recommendations}
              studyOverview={studyOverview}
              studyOverviewState={studyOverviewState}
              availableAssessments={availableAssessments}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showSamplePreview={showSamplePreview}
              setShowSamplePreview={setShowSamplePreview}
              chartTimeRange={chartTimeRange}
              setChartTimeRange={setChartTimeRange}
              hoveredAttemptIndex={hoveredAttemptIndex}
              setHoveredAttemptIndex={setHoveredAttemptIndex}
            />
          ) : (
            <div
              data-testid="dashboard-unassigned-resolution"
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4 max-w-xl mx-auto my-12"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
                <ShieldCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Pathway Enrollment Required
              </h2>
              <p className="text-sm text-muted-foreground">
                Your account does not have an active examination pathway assigned. PrepFord students study one examination pathway (NCLEX-RN or NCLEX-PN).
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button asChild variant="default">
                  <Link href="/subscriptions">Select Study Plan</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/contact">Contact Support</Link>
                </Button>
              </div>
            </div>
          )}
    </main>
      </div>

      {/* =====================================================================
          3. FULL-PAGE ASSESSMENT WORKSPACES & INTERACTIVE SIMULATOR
         ===================================================================== */}
      {/* WORKSPACE 1: Create Test Now / RAT / Interactive Simulator */}
      {createModalOpen && (
        <div
          data-testid="modal-create-test"
          className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-y-auto"
        >
          {/* Workspace Sticky Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-card/95 backdrop-blur-md border-b border-border shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                {testInProgress ? (
                  <HeartPulse className="h-5 w-5 text-teal-600 dark:text-teal-400 animate-pulse" />
                ) : createTestType === "rat" ? (
                  <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-foreground">
                    {testInProgress ? (
                      createTestType === "rat" ? (
                        <>
                          <span className="sr-only">Readiness Assessment Test (RAT) in Progress</span>
                          <span>{pathwayLabel} Readiness Assessment Test (RAT) in Progress</span>
                        </>
                      ) : (
                        <>
                          <span className="sr-only">Practice Test in Progress</span>
                          <span>{pathwayLabel} Practice Test in Progress</span>
                        </>
                      )
                    ) : createTestType === "rat" ? (
                      <>
                        <span className="sr-only">Take Readiness Assessment (RAT)</span>
                        <span>Take {pathwayLabel} Readiness Assessment (RAT)</span>
                      </>
                    ) : (
                      <>
                        <span className="sr-only">Create New Assessment Test</span>
                        <span>Create New {pathwayLabel} Assessment Test</span>
                      </>
                    )}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono font-semibold uppercase text-secondary border-secondary/40">
                    {pathwayLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {testInProgress
                    ? `Question ${activeQuestionIndex + 1} of ${testQuestionCount}`
                    : createTestType === "rat"
                    ? "Standardized multi-domain clinical examination to measure exam preparedness"
                    : `Configure ${pathwayLabel} test parameters and begin your adaptive session`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {testInProgress && (
                <button
                  type="button"
                  onClick={() => setIsTimerVisible(!isTimerVisible)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors border border-border"
                  aria-label={isTimerVisible ? "Hide session timer" : "Show session timer"}
                  title={isTimerVisible ? "Click to minimize timer" : "Click to display timer"}
                >
                  <Clock className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                  <span>{isTimerVisible ? formatTimerDisplay(sessionSeconds) : "Timer Hidden"}</span>
                  {isTimerVisible ? (
                    <EyeOff className="h-3 w-3 text-muted-foreground ml-0.5" />
                  ) : (
                    <Eye className="h-3 w-3 text-muted-foreground ml-0.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                  setTestInProgress(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </header>

          {/* Full Workspace Scrollable Body */}
          <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-6">
            {!testInProgress ? (
              /* Configuration Step */
              <div className="space-y-6">
                {selectedDomainFilter && createTestType === "tutored_cat" && (
                  <div
                    data-testid="active-domain-filter-banner"
                    className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="font-semibold text-foreground">
                        Targeted NCSBN Client Need Focus:{" "}
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                          {selectedDomainFilter}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDomainFilter(null)}
                      className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                    >
                      Clear Domain Filter
                    </button>
                  </div>
                )}

                {/* Standardized Published Assessments if available (filtered so RAT never appears in Create Test Now) */}
                {(() => {
                  const modeFilteredAssessments = availableAssessments.filter((asm) => {
                    const matchesPathway =
                      Boolean(activePathway && asm.pathway?.toLowerCase() === activePathway.toLowerCase());
                    if (!matchesPathway) return false;
                    const isRatExam =
                      asm.examType?.toLowerCase().includes("rat") ||
                      asm.examType?.toLowerCase().includes("readiness") ||
                      asm.title?.toLowerCase().includes("readiness assessment");
                    return createTestType === "rat" ? isRatExam : !isRatExam;
                  });
                  if (modeFilteredAssessments.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Standardized Published Assessments
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modeFilteredAssessments.map((asm) => (
                          <div
                            key={asm.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedAssessmentId(asm.id);
                              if (asm.questionCount) {
                                setTestQuestionCount(asm.questionCount);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedAssessmentId(asm.id);
                                if (asm.questionCount) {
                                  setTestQuestionCount(asm.questionCount);
                                }
                              }
                            }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              selectedAssessmentId === asm.id
                                ? "border-teal-500 bg-teal-500/10 text-foreground shadow-2xs"
                                : "border-border hover:border-border/80 text-muted-foreground"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-foreground">{asm.title}</p>
                                {asm.hasActiveAttempt && (
                                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px]">
                                    In-Progress Attempt Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs mt-0.5 text-muted-foreground">
                                {asm.description || `${asm.questionCount} Questions • Multi-Domain Distribution`}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs font-mono shrink-0 ml-2">
                              {asm.questionCount} Qs
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Assessment Mode Description (RAT option removed from Create Test Now) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      Assessment Mode
                    </label>
                    {selectedAssessmentId && (
                      <button
                        type="button"
                        onClick={() => setSelectedAssessmentId(null)}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        Reset to Custom Parameters
                      </button>
                    )}
                  </div>
                  {createTestType === "rat" ? (
                    <div className="p-4 rounded-xl border border-teal-500/40 bg-teal-500/5 text-foreground space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <span>Standardized Readiness Assessment Test (RAT)</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        High-fidelity diagnostic exam simulating official NCLEX test-plan distribution across all 8 NCSBN Client Needs. Produces an authoritative readiness determination and performance tier.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-teal-500/40 bg-teal-500/5 text-foreground space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <ClipboardCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <span>Tutored Computer Adaptive Test (CAT)</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Computer Adaptive Test with immediate clinical rationales, case analyses, and multi-domain candidate feedback.
                      </p>
                    </div>
                  )}
                </div>

                {/* Question Count Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Question Count
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(createTestType === "rat" ? [1, 5, 65, 85, 100, 150] : [1, 5, 20, 40, 65, 85]).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setTestQuestionCount(cnt)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          testQuestionCount === cnt
                            ? "bg-teal-600 text-white"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cnt} {cnt === 1 ? "Question (Quick Test)" : cnt === 5 ? "Questions (Quick Demo)" : "Questions"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Note */}
                <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Info className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                  <p>
                    Completing this session will immediately save an authentic result to your learner account history, updating your performance trend and domain reports.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStartTestSession()}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
                  >
                    <span>Start Test Session</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Active Test Taking Step */
              <div className="space-y-5">
                {(() => {
                  const qSlice = liveQuestions.length > 0
                    ? liveQuestions.map((lq) => ({
                        id: lq.id,
                        stem: lq.stem,
                        domain: lq.domain || "Safe and Effective Care Environment: Management of Care",
                        subdomain: lq.subdomain,
                        questionType: (["sata", "multiple-choice", "checkbox", "multiple-image"].includes(lq.questionType) ? "multi_select" : "single_choice") as QuestionType,
                        options: lq.options.map((o) => o.text),
                        optionMediaUrls: lq.options.map((o: any) => o.mediaUrl || null),
                        mediaUrl: (lq as any).mediaUrl || null,
                        correctAnswerIndex: lq.correctAnswerIndices?.[0],
                        correctAnswerIndices: lq.correctAnswerIndices,
                        rationale: lq.rationale || "",
                      }))
                    : (() => {
                        const slice: typeof CLINICAL_QUESTION_BANK = [];
                        for (let i = 0; i < testQuestionCount; i++) {
                          slice.push(CLINICAL_QUESTION_BANK[i % CLINICAL_QUESTION_BANK.length]);
                        }
                        return slice;
                      })();
                  const activeQ = qSlice[activeQuestionIndex] || qSlice[0];
                  const isMultiSelect = activeQ.questionType === "multi_select";
                  const selectedVal = currentTestAnswers[activeQuestionIndex];
                  const selectedIndices: number[] = Array.isArray(selectedVal)
                    ? selectedVal
                    : typeof selectedVal === "number"
                    ? [selectedVal]
                    : [];

                  return (
                    <div className="space-y-4">
                      {/* Domain Badge, Question Type, Flagging & Progress */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1 border-b border-border/50">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
                            {activeQ.domain}
                          </span>
                          {isMultiSelect ? (
                            <span className="inline-flex items-center gap-1 font-mono px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold text-[11px] border border-sky-500/20">
                              <ListChecks className="h-3 w-3" /> Select All That Apply (SATA)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-500/20">
                              <CircleDot className="h-3 w-3" /> Single Choice
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNotePad(!showNotePad)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                            title="Open clinical note scratchpad"
                            aria-label="Toggle clinical note scratchpad"
                          >
                            <FileEdit className="h-3.5 w-3.5 text-secondary" />
                            <span className="hidden sm:inline">Note</span>
                          </button>
                          <QuestionFlagButton questionId={`cq-${activeQuestionIndex}`} />
                          <span className="text-muted-foreground font-mono font-medium pl-1">
                            {activeQuestionIndex + 1} / {qSlice.length}
                          </span>
                        </div>
                      </div>

                      {/* Scratchpad note area if open */}
                      {showNotePad && (
                        <div className="rounded-xl border border-secondary/30 bg-muted/40 p-3 space-y-2 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <FileEdit className="h-3.5 w-3.5 text-secondary" /> Clinical Scratchpad
                            </span>
                            <span className="text-[11px] text-muted-foreground">Notes for Question #{activeQuestionIndex + 1}</span>
                          </div>
                          <textarea
                            value={questionNotes[activeQuestionIndex] || ""}
                            onChange={(e) => setQuestionNotes({ ...questionNotes, [activeQuestionIndex]: e.target.value })}
                            placeholder="Jot down symptoms, ABC prioritization rules, or calculation scratch notes..."
                            rows={2}
                            className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                          />
                        </div>
                      )}

                      {/* Question Stem (Calm typography, generous line-height 1.6-1.75, full workspace width) */}
                      <div className="w-full py-1 space-y-3">
                        <p className="text-sm sm:text-base md:text-[17px] font-sans font-medium text-foreground leading-relaxed sm:leading-7 tracking-normal">
                          {activeQ.stem}
                        </p>
                        {(activeQ as any).mediaUrl && (
                          <div className="rounded-xl border border-border bg-muted/20 p-3 max-w-2xl overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={(activeQ as any).mediaUrl}
                              alt="Clinical scenario exhibit"
                              className="max-h-72 w-auto rounded-lg object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Options */}
                      <div className="space-y-2.5 pt-1" role={isMultiSelect ? "group" : "radiogroup"} aria-label="Question options">
                        {activeQ.options.map((opt, optIdx) => {
                          const isSelected = selectedIndices.includes(optIdx);
                          const optMediaUrl = (activeQ as any).optionMediaUrls?.[optIdx];

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              role={isMultiSelect ? "checkbox" : "radio"}
                              aria-checked={isSelected}
                              onClick={() => {
                                let nextSelected: number[] = [];
                                if (isMultiSelect) {
                                  setCurrentTestAnswers((prev) => {
                                    const cur = prev[activeQuestionIndex];
                                    const curArr = Array.isArray(cur)
                                      ? cur
                                      : typeof cur === "number"
                                      ? [cur]
                                      : [];
                                    const nextArr = curArr.includes(optIdx)
                                      ? curArr.filter((i) => i !== optIdx)
                                      : [...curArr, optIdx].sort((a, b) => a - b);
                                    nextSelected = nextArr;
                                    return {
                                      ...prev,
                                      [activeQuestionIndex]: nextArr,
                                    };
                                  });
                                } else {
                                  nextSelected = [optIdx];
                                  setCurrentTestAnswers((prev) => ({
                                    ...prev,
                                    [activeQuestionIndex]: optIdx,
                                  }));
                                }

                                if (activeAttemptId && !activeAttemptId.startsWith("att_") && liveQuestions.length > 0) {
                                  const qId = activeQ.id;
                                  if (qId) {
                                    fetch(`/api/attempts/${encodeURIComponent(activeAttemptId)}/responses`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        questionId: qId,
                                        selectedOptionIndices: nextSelected,
                                        timeSpentSeconds: 15,
                                      }),
                                    }).catch(() => {});
                                  }
                                }
                              }}
                              className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                                isSelected
                                  ? "border-teal-500 bg-teal-500/10 text-foreground ring-1 ring-teal-500"
                                  : "border-border hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span
                                className={`h-5 w-5 ${
                                  isMultiSelect ? "rounded-md" : "rounded-full"
                                } border border-current flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5 ${
                                  isSelected ? "bg-teal-600 text-white border-teal-600 font-bold" : ""
                                }`}
                              >
                                {isSelected && isMultiSelect ? "✓" : String.fromCharCode(65 + optIdx)}
                              </span>
                              <div className="flex-1 space-y-2">
                                <span className="leading-relaxed block">{opt}</span>
                                {optMediaUrl && (
                                  <div className="rounded-lg border border-border/70 bg-background/60 p-2 max-w-md overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={optMediaUrl}
                                      alt={`Option ${String.fromCharCode(65 + optIdx)} exhibit`}
                                      className="max-h-48 w-auto rounded object-contain"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Question Navigation Controls */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={activeQuestionIndex === 0}
                          onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                          className="rounded-xl text-xs"
                        >
                          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                          <span>Previous</span>
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={isSubmittingTest}
                            onClick={handleCompleteTest}
                            className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
                          >
                            Finish & Submit
                          </Button>
                          {activeQuestionIndex < qSlice.length - 1 ? (
                            <Button
                              type="button"
                              onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                              className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold"
                            >
                              <span>Next Question</span>
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={isSubmittingTest}
                              onClick={handleCompleteTest}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                            >
                              <span>Submit & Complete Test</span>
                              <CheckCircle2 className="ml-1.5 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WORKSPACE 2: Review Test Workspace */}
      {reviewModalAttempt && (
        <div
          data-testid="modal-review-test"
          className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-y-auto"
        >
          {/* Workspace Sticky Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-card/95 backdrop-blur-md border-b border-border shadow-xs shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif font-bold text-base sm:text-lg text-foreground">
                  Review: {reviewModalAttempt.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getTierStyles(reviewModalAttempt.performanceTier).badgeBg
                  } ${getTierStyles(reviewModalAttempt.performanceTier).badgeBorder}`}
                >
                  {reviewModalAttempt.performanceTier} ({reviewModalAttempt.scorePercent}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed on {reviewModalAttempt.date} • {reviewModalAttempt.correctCount} of{" "}
                {reviewModalAttempt.totalQuestions} questions correct
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReviewModalAttempt(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-6">

            {/* Questions List */}
            <div className="space-y-6">
              {reviewModalAttempt.questions.map((q) => {
                const isMulti = q.questionType === "multi_select";

                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-border p-4 space-y-3 bg-muted/20"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground font-mono">
                          Question #{q.questionNumber}
                        </span>
                        {isMulti && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold">
                            Select All That Apply (SATA)
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          q.isUnanswered
                            ? "text-amber-600 dark:text-amber-400"
                            : q.isCorrect
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {q.isUnanswered ? (
                          <>
                            <Info className="h-3.5 w-3.5" />
                            <span>Unanswered / Skipped</span>
                          </>
                        ) : q.isCorrect ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Incorrect</span>
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {q.stem}
                    </p>
                    {(q as any).mediaUrl && (
                      <div className="rounded-lg border border-border bg-background/60 p-2.5 max-w-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(q as any).mediaUrl}
                          alt="Clinical exhibit"
                          className="max-h-56 w-auto rounded object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isUserChoice = isMulti
                          ? (q.userAnswerIndices ?? []).includes(optIdx)
                          : q.userAnswerIndex === optIdx;
                        const isCorrectChoice = isMulti
                          ? (q.correctAnswerIndices ?? []).includes(optIdx)
                          : q.correctAnswerIndex === optIdx;
                        const optMedia = (q as any).optionMediaUrls?.[optIdx];

                        let optClass = "border-border bg-background text-muted-foreground";
                        if (isCorrectChoice && isUserChoice) {
                          optClass = "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-semibold";
                        } else if (isCorrectChoice && !isUserChoice) {
                          optClass = "border-emerald-500/60 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
                        } else if (isUserChoice && !isCorrectChoice) {
                          optClass = "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200 line-through";
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${optClass}`}
                          >
                            <div className="flex items-start gap-2.5 flex-1">
                              <span
                                className={`h-4 w-4 ${
                                  isMulti ? "rounded-xs" : "rounded-full"
                                } border border-current flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5`}
                              >
                                {isUserChoice && isMulti ? "✓" : String.fromCharCode(65 + optIdx)}
                              </span>
                              <div className="space-y-1 flex-1">
                                <span className="block">{opt}</span>
                                {optMedia && (
                                  <div className="rounded border border-border/70 bg-background/50 p-1.5 max-w-xs overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={optMedia}
                                      alt={`Option ${String.fromCharCode(65 + optIdx)} exhibit`}
                                      className="max-h-36 w-auto rounded object-contain"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            {isCorrectChoice && isUserChoice && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Correct Key • Selected
                              </span>
                            )}
                            {isCorrectChoice && !isUserChoice && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Correct Key
                              </span>
                            )}
                            {isUserChoice && !isCorrectChoice && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                Your Selection
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Clinical Rationale Box with collapsible details & safety takeaways */}
                    <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-teal-700 dark:text-teal-300 shrink-0" />
                          <h4 className="font-serif font-bold text-sm text-teal-900 dark:text-teal-200">
                            Clinical Rationale & Explanation Breakdown
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRationales((prev) => ({
                              ...prev,
                              [q.id]: !prev[q.id],
                            }))
                          }
                          className="text-xs font-semibold text-teal-800 dark:text-teal-300 hover:underline flex items-center gap-1"
                          aria-label={expandedRationales[q.id] ? "Collapse clinical takeaway" : "Expand clinical takeaway"}
                        >
                          <span>{expandedRationales[q.id] ? "Collapse Takeaway" : "Detailed Takeaway"}</span>
                          {expandedRationales[q.id] ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                        {q.rationale}
                      </p>

                      {expandedRationales[q.id] && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                          <p className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            NCLEX Clinical Judgment & Client Safety Takeaway
                          </p>
                          <p className="leading-relaxed">
                            Always prioritize acute physiologic instability (airway, breathing, circulation, and sudden neurological deterioration) over chronic stable symptoms. Review distractor rationales to confirm why non-urgent assessments must wait until priority interventions are secured.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                type="button"
                onClick={() => setReviewModalAttempt(null)}
                className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold"
              >
                Close Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE 3: View Report Workspace */}
      {reportModalAttempt && (
        <div
          data-testid="modal-view-report"
          className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-y-auto"
        >
          {/* Workspace Sticky Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-card/95 backdrop-blur-md border-b border-border shadow-xs shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif font-bold text-base sm:text-lg text-foreground">
                  Performance Report: {reportModalAttempt.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getTierStyles(reportModalAttempt.performanceTier).badgeBg
                  } ${getTierStyles(reportModalAttempt.performanceTier).badgeBorder}`}
                >
                  {reportModalAttempt.performanceTier} ({reportModalAttempt.scorePercent}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed on {reportModalAttempt.date} • Duration ~{reportModalAttempt.durationMinutes} mins
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReportModalAttempt(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-6">

            {/* Score & Tier Banner */}
            <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Overall Score
                </p>
                <p className="text-3xl font-serif font-bold text-foreground mt-1">
                  {reportModalAttempt.scorePercent}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {reportModalAttempt.correctCount} of {reportModalAttempt.totalQuestions} questions correct
                </p>
              </div>

              <div className="text-right space-y-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    getTierStyles(reportModalAttempt.performanceTier).badgeBg
                  } ${getTierStyles(reportModalAttempt.performanceTier).badgeBorder}`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: getTierStyles(reportModalAttempt.performanceTier).accentHex,
                    }}
                  />
                  <span>{reportModalAttempt.performanceTier} Readiness</span>
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {reportModalAttempt.scorePercent >= 65
                    ? "Meets PrepFord 65% practice benchmark"
                    : "Below 65% practice benchmark; targeted domain review recommended"}
                </p>
              </div>
            </div>

            {/* Domain-by-Domain Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Client Needs Domain Mastery
              </h4>
              <div className="space-y-3">
                {reportModalAttempt.domains.map((dom, dIdx) => (
                  <div key={dIdx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{dom.domain}</span>
                      <span className="font-mono font-bold text-muted-foreground">
                        {dom.scorePercent}% ({dom.correctCount}/{dom.totalQuestions})
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${dom.scorePercent}%`,
                          backgroundColor:
                            dom.scorePercent >= 75
                              ? "#10b981"
                              : dom.scorePercent >= 65
                              ? "#0d9488"
                              : dom.scorePercent >= 55
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeted Recommendations */}
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-4 space-y-2">
              <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Targeted Next Study Steps</span>
              </h4>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                Focus on reviewing <strong>Physiological Adaptation</strong> and{" "}
                <strong>Pharmacological Therapies</strong> in the Study Guide to strengthen rationales on priority medications and fluid balance.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const attemptToReview = reportModalAttempt;
                  setReportModalAttempt(null);
                  setReviewModalAttempt(attemptToReview);
                }}
                className="rounded-xl text-xs font-semibold"
              >
                Review Questions
              </Button>
              <Button
                type="button"
                onClick={() => setReportModalAttempt(null)}
                className="bg-primary text-primary-foreground rounded-xl text-xs font-semibold"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* In-Exam Reauthentication Modal */}
      {inExamReauthOpen && activeAttemptId && (
        <InExamReauthModal
          isOpen={inExamReauthOpen}
          attemptId={activeAttemptId}
          userEmail={user?.email || ""}
          reasonCode={inExamReauthReason}
          onReauthenticated={handleExamReauthenticated}
          onAbandon={() => {
            setInExamReauthOpen(false);
            setTestInProgress(false);
            setCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
