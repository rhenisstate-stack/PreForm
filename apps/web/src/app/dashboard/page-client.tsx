"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  TrendingUp,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { QuestionFlagButton } from "@/components/assessments/question-flag-button";
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
} from "@/lib/assessment-store";

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

export function DashboardClient() {
  const auth = useAuth();
  const cart = useCart();

  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [selectedPathway, setSelectedPathway] = React.useState<"rn" | "pn" | null>(null);
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

  React.useEffect(() => {
    if (userId && userEmail) {
      const syntheticSession = {
        userId,
        email: userEmail,
        name: userName || userDisplayName || "Candidate",
        displayName: userDisplayName || userName || "Candidate",
        role: userRole || "candidate",
        pathway: (userPathway === "pn" ? "pn" : "rn") as "rn" | "pn" | "both",
        csrfToken: "",
        sessionId: "",
        expiresAt: "",
      };
      fetchAuthoritativeAttempts(syntheticSession)
        .then(() => setAttemptRefreshKey((k) => k + 1))
        .catch(() => {});
    }
  }, [userId, userEmail, userName, userDisplayName, userRole, userPathway]);

  // Create test interactive form state
  const [createTestType, setCreateTestType] = React.useState<"tutored_cat" | "rat">("tutored_cat");
  const [testQuestionCount, setTestQuestionCount] = React.useState<number>(5);
  const [testInProgress, setTestInProgress] = React.useState<boolean>(false);
  const [currentTestAnswers, setCurrentTestAnswers] = React.useState<Record<number, number | number[]>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = React.useState<number>(0);
  const [isSubmittingTest, setIsSubmittingTest] = React.useState<boolean>(false);

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

  const activePathway: "rn" | "pn" = selectedPathway ?? (user?.pathway === "pn" ? "pn" : "rn");
  const pathwayLabel = activePathway === "pn" ? "NCLEX-PN" : "NCLEX-RN";
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

  // Handle submitting a completed test in the test simulator with debounce and double-submit protection
  const handleCompleteTest = () => {
    if (isSubmittingTest) return;
    setIsSubmittingTest(true);
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
      });

      const candidateSession = user?.id ? {
        userId: user.id,
        email: user.email,
        name: user.name || user.displayName || "Candidate",
        displayName: user.displayName || user.name || "Candidate",
        role: user.role || "candidate",
        pathway: (user.pathway === "pn" ? "pn" : "rn") as "rn" | "pn" | "both",
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

  if (isLoading) {
    return <BrandedLoading message="Loading learner study workspace..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
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
          href="/sign-in?from=/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <span>Sign In to Workspace</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const learnerName = user.displayName || user.name || "Candidate";

  // Chart coordinate calculations (width 760, height 260)
  const chartAttempts = filteredAttempts.slice().reverse(); // Chronological left-to-right
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0C232C] dark:bg-[#07161C] text-slate-100 border-r border-[#153441] transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? "w-20" : "w-64"
        } ${
          mobileDrawerOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#153441]">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label={`${BRAND.fullName} home`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo.assetPath}
              alt={BRAND.logo.alt}
              className="h-10 w-10 rounded-xl object-contain shrink-0 bg-white/10 p-1"
              width={40}
              height={40}
            />
            {!sidebarCollapsed && (
              <span
                data-testid="brand-wordmark-stacked"
                className="flex flex-col font-serif tracking-tight font-bold leading-none text-left -space-y-0.5 justify-center"
              >
                <span className="text-base sm:text-lg leading-none text-teal-300">Prep</span>
                <span className="text-base sm:text-lg leading-none text-white">Ford</span>
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            data-testid="sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {/* Action: Create Test Now */}
          <div className="px-1">
            <button
              type="button"
              data-testid="sidebar-create-test-btn"
              onClick={() => {
                setCreateModalOpen(true);
                setTestInProgress(false);
              }}
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-98 text-slate-950 font-semibold text-sm transition-all shadow-md py-2.5 px-3 ${
                sidebarCollapsed ? "px-2" : ""
              }`}
              title="Create Test Now"
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
              {!sidebarCollapsed && <span>+ Create Test Now</span>}
            </button>
          </div>

          {/* Group 1: LEARN */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-teal-300/60 font-mono">
                Learn
              </div>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-teal-300 bg-white/10 transition-colors"
              title="Dashboard"
            >
              <Compass className="h-4 w-4 shrink-0 text-teal-400" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              href="/nclex-rn"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="NCLEX-RN"
            >
              <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>NCLEX-RN</span>}
            </Link>
            <Link
              href="/nclex-pn"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="NCLEX-PN"
            >
              <Stethoscope className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>NCLEX-PN</span>}
            </Link>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Study Guides"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Study Guides</span>}
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Practice Activities"
            >
              <FileQuestion className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Practice Activities</span>}
            </Link>
          </div>

          {/* Group 2: TEST BANK & ASSESSMENTS */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-teal-300/60 font-mono">
                Test Bank & Assessments
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("tutored_cat")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "tutored_cat"
                  ? "text-teal-300 bg-white/10"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
              title="Tutored CATs"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0 text-teal-400" />
              {!sidebarCollapsed && <span>Tutored CATs</span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rat")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "rat"
                  ? "text-teal-300 bg-white/10"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
              title="Readiness Assessment Tests (RAT)"
            >
              <HeartPulse className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Readiness Tests (RAT)</span>}
            </button>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Test-Taking Strategies"
            >
              <Layers className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Test-Taking Strategies</span>}
            </Link>
          </div>

          {/* Group 3: REPORTS */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-teal-300/60 font-mono">
                Reports
              </div>
            )}
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-teal-300 bg-teal-500/15 border border-teal-500/30"
              title="Previous Tests"
            >
              <History className="h-4 w-4 shrink-0 text-teal-400" />
              {!sidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Previous Tests</span>
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 font-mono px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              )}
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Statistics"
            >
              <BarChart2 className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </Link>
          </div>

          {/* Group 4: ACCOUNT */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-teal-300/60 font-mono">
                Account
              </div>
            )}
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Profile"
            >
              <UserCheck className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Profile & Settings</span>}
            </Link>
            <Link
              href="/cart"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Cart"
            >
              <ShoppingCart className="h-4 w-4 shrink-0 text-slate-400" />
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Learning Notes"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Learning Notes</span>}
            </Link>
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-[#153441] bg-[#0A1D25]">
          <div className="flex items-center gap-3">
            <LearnerAvatar
              picture={user?.picture}
              name={learnerName}
              sizeClassName="h-9 w-9"
              fallbackClassName="bg-teal-600/30 text-teal-300 border-teal-500/40"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{learnerName}</p>
                <p className="text-[11px] text-teal-400/80 truncate font-mono uppercase">
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
              <span className="text-foreground font-medium">Previous Tests</span>
            </nav>
          </div>

          {/* Right: Pathway Switcher, Theme Switcher, Cart & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pathway focus toggles */}
            <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                data-testid="dashboard-pathway-rn"
                aria-pressed={activePathway === "rn"}
                onClick={() => setSelectedPathway("rn")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activePathway === "rn"
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NCLEX-RN
              </button>
              <button
                type="button"
                data-testid="dashboard-pathway-pn"
                aria-pressed={activePathway === "pn"}
                onClick={() => setSelectedPathway("pn")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activePathway === "pn"
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NCLEX-PN
              </button>
            </div>

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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* =====================================================================
              SECTION 1: WELCOME & STUDY FOCUS BANNER
             ===================================================================== */}
          <section
            data-testid="dashboard-welcome-header"
            aria-labelledby="dashboard-welcome-heading"
            className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-teal-500/5 p-6 sm:p-8 shadow-xs"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Authenticated Learner Workspace</span>
                  </span>
                  <Badge variant="outline" className="font-mono text-xs uppercase">
                    {pathwayLabel} Focus
                  </Badge>
                  {user?.pathway === "both" && (
                    <Badge className="bg-secondary/15 text-secondary border border-secondary/30 font-semibold text-xs">
                      NCLEX-RN &amp; PN Dual Access
                    </Badge>
                  )}
                  {user.activePlan && (
                    <Badge className="bg-primary/10 text-primary dark:bg-teal-400/15 dark:text-teal-300 font-medium text-xs">
                      {user.activePlan}
                    </Badge>
                  )}
                </div>

                <h1
                  id="dashboard-welcome-heading"
                  className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-foreground"
                >
                  Welcome back, {learnerName}.
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Pick up where you left off in your {pathwayLabel} preparation, review high-yield clinical study guides, or take a tutored Computer Adaptive Test.
                </p>

                {/* Primary CTA: Continue studying when real resumable activity exists, else Explore study materials */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {recentActivity ? (
                    <Button
                      asChild
                      size="lg"
                      data-testid="dashboard-primary-cta-continue"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-xs"
                    >
                      <Link href={recentActivity.href}>
                        <span>Continue studying: {recentActivity.title}</span>
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      data-testid="dashboard-primary-cta-explore"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-xs"
                    >
                      <Link
                        href="/study-guide"
                        onClick={() =>
                          recordActivity({
                            title: "7-Domain Nursing Study Guide",
                            categoryTitle: "Clinical Study Notes",
                            href: "/study-guide",
                            pathway: activePathway,
                          })
                        }
                      >
                        <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span>Explore study materials</span>
                      </Link>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreateModalOpen(true);
                      setTestInProgress(false);
                    }}
                    className="font-semibold rounded-xl border-border hover:bg-muted"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>+ Create Test Now</span>
                  </Button>
                </div>
              </div>

              {/* Target exam date summary if set */}
              {user.targetExamDate && (
                <div className="rounded-xl border border-border/80 bg-background/80 p-4 min-w-[200px]">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Target Exam Date
                  </p>
                  <p className="text-lg font-serif font-bold text-foreground mt-1">
                    {new Date(user.targetExamDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-medium">
                    Scheduled NCLEX Date
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* =====================================================================
              SECTION 2: ASSESSMENT WORKSPACE & PERFORMANCE VISUALIZATION
             ===================================================================== */}
          <section className="space-y-6" aria-labelledby="assessment-section-heading">
            {/* Sub-Navigation Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="tab-tutored-cats"
                  onClick={() => setActiveTab("tutored_cat")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === "tutored_cat"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Tutored CATs
                </button>
                <button
                  type="button"
                  data-testid="tab-rat"
                  onClick={() => setActiveTab("rat")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === "rat"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Readiness Assessment Tests (RAT)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === "all"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  All Recent Tests
                </button>
              </div>

              {/* Sample benchmark preview toggle when user has 0 attempts */}
              {storedAttempts.length === 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Preview sample cohort:</span>
                  <button
                    type="button"
                    data-testid="toggle-sample-preview"
                    onClick={() => setShowSamplePreview(!showSamplePreview)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showSamplePreview ? "bg-teal-600" : "bg-muted-foreground/30"
                    }`}
                    role="switch"
                    aria-checked={showSamplePreview}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showSamplePreview ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Illustrative sample banner if sample benchmark preview is active */}
            {storedAttempts.length === 0 && showSamplePreview && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
                <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-mono uppercase tracking-wider">
                      SAMPLE BENCHMARK PREVIEW • Illustrative Reference Data
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    This view displays the 7-attempt reference cohort benchmark from the Naxlex reference dataset. Your personal test attempts will replace this visualization automatically as soon as you complete your first practice test.
                  </p>
                </div>
              </div>
            )}

            {/* Assessment Performance Chart Card */}
            {filteredAttempts.length > 0 ? (
              <div
                data-testid="assessment-performance-chart"
                className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2
                      id="assessment-section-heading"
                      className="text-base sm:text-lg font-serif font-bold text-foreground flex items-center gap-2"
                    >
                      <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <span>Assessment Performance Trend</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sequential CAT performance versus the PrepFord 65% benchmark
                    </p>
                  </div>

                  {/* Chart Legend & Tiers Key (Matching Reference Screenshot) */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <div
                      data-testid="performance-key-vh"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-mono font-bold">VH</span>
                      <span className="text-[11px] text-muted-foreground">&ge; 75%</span>
                    </div>
                    <div
                      data-testid="performance-key-h"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-medium"
                    >
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                      <span className="font-mono font-bold">H</span>
                      <span className="text-[11px] text-muted-foreground">65–74%</span>
                    </div>
                    <div
                      data-testid="performance-key-b"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium"
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-mono font-bold">B</span>
                      <span className="text-[11px] text-muted-foreground">55–64%</span>
                    </div>
                    <div
                      data-testid="performance-key-l"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-medium"
                    >
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span className="font-mono font-bold">L</span>
                      <span className="text-[11px] text-muted-foreground">&lt; 55%</span>
                    </div>
                  </div>
                </div>

                {/* SVG Performance Line Chart */}
                <div className="relative w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto min-w-[580px] select-none"
                    aria-label="Assessment performance chart"
                  >
                    {/* Background grid lines */}
                    {[0, 20, 40, 60, 80, 100].map((score) => {
                      const y = getYCoord(score);
                      return (
                        <g key={score}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity={score === 0 ? "0.2" : "0.08"}
                            strokeWidth={score === 0 ? "1.5" : "1"}
                          />
                          <text
                            x={paddingX - 10}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="10"
                            fill="currentColor"
                            opacity="0.5"
                            fontFamily="monospace"
                          >
                            {score}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Benchmark line at 65% (PrepFord Practice Benchmark Reference Line) */}
                    <line
                      x1={paddingX}
                      y1={benchmarkY}
                      x2={chartWidth - paddingX}
                      y2={benchmarkY}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={chartWidth - paddingX - 4}
                      y={benchmarkY - 6}
                      textAnchor="end"
                      fill="#f59e0b"
                      fontSize="10"
                      fontWeight="600"
                    >
                      Practice Benchmark (65%)
                    </text>

                    {/* Trend Line Path */}
                    {chartPathD && (
                      <path
                        d={chartPathD}
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points and Tier Badges */}
                    {chartPoints.map((pt, idx) => {
                      const isHovered = hoveredAttemptIndex === idx;
                      const tierStyle = getTierStyles(pt.attempt.performanceTier);

                      return (
                        <g
                          key={pt.attempt.id}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredAttemptIndex(idx)}
                          onMouseLeave={() => setHoveredAttemptIndex(null)}
                          onClick={() => setReviewModalAttempt(pt.attempt)}
                        >
                          {/* Point Outer Ring */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 8 : 6}
                            fill="#ffffff"
                            stroke="#0d9488"
                            strokeWidth="3"
                            className="transition-all"
                          />

                          {/* Tier Badge Above Point */}
                          <g transform={`translate(${pt.x - 14}, ${pt.y - 28})`}>
                            <rect
                              width="28"
                              height="18"
                              rx="5"
                              fill={tierStyle.accentHex}
                              fillOpacity={isHovered ? "1" : "0.85"}
                              stroke="#ffffff"
                              strokeWidth="1"
                            />
                            <text
                              x="14"
                              y="12"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {pt.shortCode}
                            </text>
                          </g>

                          {/* X-Axis Label */}
                          <text
                            x={pt.x}
                            y={chartHeight - 8}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight={isHovered ? "bold" : "normal"}
                            fill="currentColor"
                            opacity={isHovered ? "1" : "0.75"}
                          >
                            {pt.attempt.name.replace("Tutored CAT", "T_CAT")}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip on Hover */}
                  {hoveredAttemptIndex !== null && chartPoints[hoveredAttemptIndex] && (
                    <div
                      className="absolute z-10 pointer-events-none rounded-lg bg-slate-900 text-white text-xs p-2.5 shadow-xl border border-slate-700 min-w-[140px]"
                      style={{
                        left: `${(chartPoints[hoveredAttemptIndex].x / chartWidth) * 100}%`,
                        top: `${(chartPoints[hoveredAttemptIndex].y / chartHeight) * 100}%`,
                        transform: "translate(-50%, -125%)",
                      }}
                    >
                      <p className="font-bold text-teal-300">
                        {chartPoints[hoveredAttemptIndex].attempt.name}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {chartPoints[hoveredAttemptIndex].attempt.date}
                      </p>
                      <div className="mt-1 flex items-center justify-between border-t border-slate-800 pt-1 text-[11px]">
                        <span>Score:</span>
                        <span className="font-mono font-bold text-white">
                          {chartPoints[hoveredAttemptIndex].attempt.scorePercent}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Rating:</span>
                        <span className="font-semibold text-teal-400">
                          {chartPoints[hoveredAttemptIndex].attempt.performanceTier}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Honest Empty State When No Attempts Exist */
              <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50 space-y-4">
                <div className="mx-auto max-w-[200px] w-full aspect-square relative overflow-hidden rounded-2xl bg-card border border-border/80 shadow-xs p-1">
                  <Image
                    src="/images/illustrations/prepford-empty-recent-activity.png"
                    alt="Ready to begin NCLEX practice"
                    fill
                    sizes="200px"
                    loading="lazy"
                    className="object-contain p-2"
                  />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    No Assessment Attempts Recorded Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Begin a tutored CAT session to evaluate your clinical readiness across all 8 NCLEX Client Needs categories. Your trend curve will populate here automatically.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(true);
                      setTestInProgress(false);
                    }}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Start Your First Practice Test</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSamplePreview(true)}
                    className="rounded-xl border-border hover:bg-muted"
                  >
                    <span>Preview Reference Benchmark</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Historical Assessment Table */}
            {filteredAttempts.length > 0 && (
              <div
                data-testid="assessment-history-table"
                className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs"
              >
                <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                  <h3 className="text-base font-serif font-bold text-foreground">
                    Assessment History & Detailed Reports
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {filteredAttempts.length} Total {filteredAttempts.length === 1 ? "Test" : "Tests"}
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Performance</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Total Questions</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAttempts.map((attempt, idx) => {
                        const tierStyle = getTierStyles(attempt.performanceTier);
                        return (
                          <tr
                            key={attempt.id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-foreground">
                              <div className="flex flex-col gap-1.5">
                                <span className="font-semibold">{attempt.name}</span>
                                {/* Inline Progress Bar */}
                                <div className="flex items-center gap-2 max-w-[160px]">
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${attempt.scorePercent}%`,
                                        backgroundColor: tierStyle.accentHex,
                                      }}
                                    />
                                  </div>
                                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                                    {attempt.scorePercent}%
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tierStyle.badgeBg} ${tierStyle.badgeBorder}`}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: tierStyle.accentHex }}
                                />
                                {attempt.performanceTier}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs font-mono">
                              {attempt.date}
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs">
                              {attempt.totalQuestions} questions
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  data-testid={`btn-review-test-${attempt.id}`}
                                  onClick={() => setReviewModalAttempt(attempt)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-colors"
                                >
                                  Review Test
                                </button>
                                <button
                                  type="button"
                                  data-testid={`btn-view-report-${attempt.id}`}
                                  onClick={() => setReportModalAttempt(attempt)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  View Report
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Card View */}
                <div className="md:hidden divide-y divide-border">
                  {filteredAttempts.map((attempt, idx) => {
                    const tierStyle = getTierStyles(attempt.performanceTier);
                    return (
                      <div key={attempt.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">
                            #{idx + 1} {attempt.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${tierStyle.badgeBg} ${tierStyle.badgeBorder}`}
                          >
                            {attempt.performanceTier}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{attempt.date}</span>
                          <span>{attempt.totalQuestions} Questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${attempt.scorePercent}%`,
                                backgroundColor: tierStyle.accentHex,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {attempt.scorePercent}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setReviewModalAttempt(attempt)}
                            className="py-2 text-center rounded-lg text-xs font-semibold border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                          >
                            Review Test
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportModalAttempt(attempt)}
                            className="py-2 text-center rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            View Report
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* =====================================================================
              SECTION 3: PRIMARY STUDY ACTIONS (Launchpad)
             ===================================================================== */}
          <section
            data-testid="dashboard-primary-actions"
            aria-labelledby="dashboard-primary-actions-heading"
            className="space-y-4"
          >
            <div>
              <h2
                id="dashboard-primary-actions-heading"
                className="text-lg sm:text-xl font-serif font-bold text-foreground"
              >
                Study Action Hub
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Jump directly into exam review hubs, nursing notes, or clinical course materials
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: NCLEX-RN */}
              <div className="rounded-xl border border-border/80 bg-card p-5 hover:border-teal-500/50 hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-foreground">
                    NCLEX-RN Preparation
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Full Next-Gen case studies, clinical prioritization, and adaptive question pools.
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/nclex-rn"
                    className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    <span>Open NCLEX-RN Hub</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 2: NCLEX-PN */}
              <div className="rounded-xl border border-border/80 bg-card p-5 hover:border-teal-500/50 hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-foreground">
                    NCLEX-PN Preparation
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Practical nursing scenarios, delegation boundaries, and medication administration.
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/nclex-pn"
                    className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    <span>Open NCLEX-PN Hub</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 3: Nursing Study Guides */}
              <div className="rounded-xl border border-border/80 bg-card p-5 hover:border-teal-500/50 hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-foreground">
                    Nursing Study Guides
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All 7 core domains: Pharmacology, Med-Surg, Fundamentals, Pediatrics, and more.
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/study-guide"
                    className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    <span>Browse Study Guides</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 4: Practice & Courses */}
              <div className="rounded-xl border border-border/80 bg-card p-5 hover:border-teal-500/50 hover:shadow-sm transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Compass className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-foreground">
                    Practice & Course Finder
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Filter question sets by client needs, taking mode, and test difficulty level.
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/courses"
                    className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    <span>Open Practice & Courses</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================================
              SECTION 4: TRANSPARENT TELEMETRY DISCLOSURE
             ===================================================================== */}
          <section
            data-testid="dashboard-telemetry-disclosure"
            className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-3"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                PrepFord Assessment Transparency Guarantee
              </p>
              <p className="leading-relaxed">
                PrepFord does not display fabricated personal scores or exam pass predictions. Every performance metric on this dashboard reflects either verified attempts completed by your account or clearly labeled illustrative cohort benchmarks.
              </p>
            </div>
          </section>

          {/* =====================================================================
              SECTION 5: 7-DOMAIN NURSING STUDY GUIDE DIRECTORY
             ===================================================================== */}
          <section
            data-testid="dashboard-study-domains"
            aria-labelledby="dashboard-study-domains-heading"
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2
                  id="dashboard-study-domains-heading"
                  className="text-lg sm:text-xl font-serif font-bold text-foreground"
                >
                  Clinical Curriculum Study Domains
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  High-yield clinical topic summaries aligned with the NCSBN Test Plan
                </p>
              </div>
              <Link
                href="/study-guide"
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Browse All Domains</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {STUDY_GUIDE_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  data-testid={`dashboard-domain-${cat.slug}`}
                  className="rounded-xl border border-border/80 bg-card p-4 hover:border-teal-500/40 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                        {cat.badge}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {cat.subjects.length} Subjects
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-sm text-foreground leading-snug">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/60 mt-3 flex items-center justify-between">
                    <Link
                      href={`/study-guide/${cat.slug}`}
                      className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Study Domain</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =====================================================================
              SECTION 6: QUICK NAVIGATION & SUPPORT
             ===================================================================== */}
          <section
            data-testid="dashboard-quick-nav"
            className="rounded-xl border border-border/80 bg-card p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
              Quick Candidate Resources
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Link
                href="/profile"
                className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 font-medium transition-colors"
              >
                Account & Profile
              </Link>
              <Link
                href="/subscriptions"
                className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 font-medium transition-colors"
              >
                All Study Plans
              </Link>
              <Link
                href="/cart"
                className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 font-medium transition-colors"
              >
                Cart ({cartItemCount})
              </Link>
              <Link
                href="/faq"
                className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 font-medium transition-colors"
              >
                Learner FAQ
              </Link>
              <Link
                href="/contact"
                className="px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 font-medium transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </section>
        </main>
      </div>

      {/* =====================================================================
          3. INTERACTIVE MODALS
         ===================================================================== */}
      {/* MODAL 1: Create Test Now / Interactive Simulator */}
      {createModalOpen && (
        <div
          data-testid="modal-create-test"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-card border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-foreground">
                    {testInProgress ? "NCLEX Practice Test in Progress" : "Create New Assessment Test"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {testInProgress
                      ? `Question ${activeQuestionIndex + 1} of ${testQuestionCount}`
                      : "Configure test parameters and begin your adaptive session"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {testInProgress && (
                  <button
                    type="button"
                    onClick={() => setIsTimerVisible(!isTimerVisible)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-colors border border-border/60"
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
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {!testInProgress ? (
              /* Configuration Step */
              <div className="space-y-5">
                {/* Test Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Assessment Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateTestType("tutored_cat")}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        createTestType === "tutored_cat"
                          ? "border-teal-500 bg-teal-500/10 text-foreground shadow-2xs"
                          : "border-border hover:border-border/80 text-muted-foreground"
                      }`}
                    >
                      <p className="font-bold text-sm text-foreground">Tutored CAT</p>
                      <p className="text-xs mt-1 leading-snug">
                        Computer Adaptive Test with immediate clinical rationales and explanations.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateTestType("rat")}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        createTestType === "rat"
                          ? "border-teal-500 bg-teal-500/10 text-foreground shadow-2xs"
                          : "border-border hover:border-border/80 text-muted-foreground"
                      }`}
                    >
                      <p className="font-bold text-sm text-foreground">Readiness Test (RAT)</p>
                      <p className="text-xs mt-1 leading-snug">
                        Standardized exam format testing multi-domain clinical readiness.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Question Count Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Question Count
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 5, 20, 40, 65, 85].map((cnt) => (
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
                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Info className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                  <p>
                    Completing this session will immediately save an authentic result to your learner account history, updating your performance trend and domain reports.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
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
                    onClick={() => {
                      setTestInProgress(true);
                      setCurrentTestAnswers({});
                      setActiveQuestionIndex(0);
                    }}
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
                  const qSlice: typeof CLINICAL_QUESTION_BANK = [];
                  for (let i = 0; i < testQuestionCount; i++) {
                    qSlice.push(CLINICAL_QUESTION_BANK[i % CLINICAL_QUESTION_BANK.length]);
                  }
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

                      {/* Question Stem (Calm typography, generous line-height 1.6-1.75, max-w-3xl) */}
                      <div className="max-w-3xl py-1">
                        <p className="text-sm sm:text-base md:text-[17px] font-sans font-medium text-foreground leading-relaxed sm:leading-7 tracking-normal">
                          {activeQ.stem}
                        </p>
                      </div>

                      {/* Options */}
                      <div className="space-y-2.5 pt-1" role={isMultiSelect ? "group" : "radiogroup"} aria-label="Question options">
                        {activeQ.options.map((opt, optIdx) => {
                          const isSelected = selectedIndices.includes(optIdx);

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              role={isMultiSelect ? "checkbox" : "radio"}
                              aria-checked={isSelected}
                              onClick={() => {
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
                                    return {
                                      ...prev,
                                      [activeQuestionIndex]: nextArr,
                                    };
                                  });
                                } else {
                                  setCurrentTestAnswers((prev) => ({
                                    ...prev,
                                    [activeQuestionIndex]: optIdx,
                                  }));
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
                              <span className="flex-1 leading-relaxed">{opt}</span>
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

      {/* MODAL 2: Review Test Modal */}
      {reviewModalAttempt && (
        <div
          data-testid="modal-review-test"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-card border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-foreground">
                    Review: {reviewModalAttempt.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      getTierStyles(reviewModalAttempt.performanceTier).badgeBg
                    }`}
                  >
                    {reviewModalAttempt.performanceTier} ({reviewModalAttempt.scorePercent}%)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completed on {reviewModalAttempt.date} • {reviewModalAttempt.correctCount} of{" "}
                  {reviewModalAttempt.totalQuestions} questions correct
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalAttempt(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isUserChoice = isMulti
                          ? (q.userAnswerIndices ?? []).includes(optIdx)
                          : q.userAnswerIndex === optIdx;
                        const isCorrectChoice = isMulti
                          ? (q.correctAnswerIndices ?? []).includes(optIdx)
                          : q.correctAnswerIndex === optIdx;

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
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-4 w-4 ${
                                  isMulti ? "rounded-xs" : "rounded-full"
                                } border border-current flex items-center justify-center text-[10px] font-mono shrink-0`}
                              >
                                {isUserChoice && isMulti ? "✓" : String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
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

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                onClick={() => setReviewModalAttempt(null)}
                className="rounded-xl"
              >
                Close Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Report Modal */}
      {reportModalAttempt && (
        <div
          data-testid="modal-view-report"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  Performance Report: {reportModalAttempt.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completed on {reportModalAttempt.date} • Duration ~{reportModalAttempt.durationMinutes} mins
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportModalAttempt(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
    </div>
  );
}
