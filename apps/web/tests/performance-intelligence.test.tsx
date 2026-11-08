import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Components
import { PerformanceKpiGrid } from "@/components/learner/performance/performance-kpi-grid";
import { CompactPerformanceCard } from "@/components/learner/performance/compact-performance-card";
import { ClientNeedsIntelligenceCard } from "@/components/learner/performance/client-needs-intelligence-card";
import { QuestionIntelligenceCard } from "@/components/learner/performance/question-intelligence-card";
import { PersonalizedRecommendationsList } from "@/components/learner/performance/personalized-recommendations-list";
import { InterventionsTracker } from "@/components/learner/performance/interventions-tracker";
import { QuestionReviewTable } from "@/components/learner/performance/question-review-table";
import { AttemptComparisonModal } from "@/components/learner/performance/attempt-comparison-modal";
import { PerformanceReportPreviewModal } from "@/components/learner/performance/performance-report-preview-modal";
import { PerformanceIntelligenceView } from "@/components/learner/performance/performance-intelligence-view";

// Interfaces
import type {
  AttemptComparisonResponse,
  CategoryPerformanceIntelligence,
  LearnerIntervention,
  LearnerPerformanceOverview,
  LearnerPerformanceReport,
  LearnerRecommendation,
  PaginatedQuestionReview,
  QuestionIntelligenceSummary,
} from "@/lib/api-services";

// Recharts ResponsiveContainer Mock for JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual<any>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

// Mock Auth
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "cand_test_01",
      email: "candidate@test.com",
      displayName: "Florence Nightingale",
      role: "candidate",
      pathway: "rn",
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe("PrepFord NCLEX — Performance Intelligence Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOverview: LearnerPerformanceOverview = {
    userId: "cand_test_01",
    pathway: "rn",
    timeframe: "all",
    totalCompletedAttempts: 12,
    totalStartedAttempts: 14,
    completionRatePercent: 85.7,
    totalAnsweredQuestions: 450,
    correctCount: 338,
    overallAccuracyPercent: 75.1,
    averageScorePercent: 78.4,
    totalStudyDurationMinutes: 520,
    currentReadinessTier: "High",
    accuracyTrendDeltaPercent: 6.2,
    trendDirection: "Up",
    topStrengthCategory: "Management of Care",
    primaryImprovementArea: "Pharmacological and Parenteral Therapies",
    computedAt: new Date().toISOString(),
  };

  const mockCategories: CategoryPerformanceIntelligence[] = [
    {
      categoryCode: "MOC",
      categoryName: "Management of Care",
      pathway: "rn",
      totalQuestions: 85,
      correctCount: 68,
      accuracyPercent: 80.0,
      classification: "Strong",
      averageTimeSeconds: 48,
      peerBenchmarkAccuracyPercent: 70.0,
      deltaFromPeerPercent: 10.0,
      recommendedRemediationAction: null,
    },
    {
      categoryCode: "PHA",
      categoryName: "Pharmacological and Parenteral Therapies",
      pathway: "rn",
      totalQuestions: 40,
      correctCount: 22,
      accuracyPercent: 55.0,
      classification: "NeedsAttention",
      averageTimeSeconds: 62,
      peerBenchmarkAccuracyPercent: 68.0,
      deltaFromPeerPercent: -13.0,
      recommendedRemediationAction: "Review high-risk IV titration protocols and calculation formulas.",
    },
    {
      categoryCode: "SIC",
      categoryName: "Safety and Infection Control",
      pathway: "rn",
      totalQuestions: 4,
      correctCount: 2,
      accuracyPercent: 50.0,
      classification: "InsufficientData",
      averageTimeSeconds: 50,
      peerBenchmarkAccuracyPercent: 72.0,
      deltaFromPeerPercent: -22.0,
      recommendedRemediationAction: null,
    },
  ];

  const mockQuestionIntelligence: QuestionIntelligenceSummary = {
    totalQuestionsAnalyzed: 450,
    questionTypes: [
      {
        questionTypeKey: "sata",
        displayName: "Select All That Apply (SATA)",
        isNgn: true,
        totalQuestions: 60,
        correctCount: 36,
        accuracyPercent: 60.0,
        averageTimeSeconds: 72,
      },
      {
        questionTypeKey: "single-choice",
        displayName: "Standard Multiple Choice",
        isNgn: false,
        totalQuestions: 200,
        correctCount: 168,
        accuracyPercent: 84.0,
        averageTimeSeconds: 42,
      },
    ],
    difficulties: [
      {
        difficulty: "Easy",
        totalQuestions: 100,
        correctCount: 92,
        accuracyPercent: 92.0,
      },
      {
        difficulty: "Hard",
        totalQuestions: 80,
        correctCount: 44,
        accuracyPercent: 55.0,
      },
    ],
    clinicalJudgmentSteps: [
      {
        stepKey: "RecognizeCues",
        stepName: "Recognize Cues",
        orderIndex: 1,
        totalQuestions: 50,
        correctCount: 42,
        accuracyPercent: 84.0,
      },
      {
        stepKey: "PrioritizeHypotheses",
        stepName: "Prioritize Hypotheses",
        orderIndex: 3,
        totalQuestions: 45,
        correctCount: 27,
        accuracyPercent: 60.0,
      },
    ],
    recurringErrors: [
      {
        patternKey: "err_pha_01",
        title: "Pharmacological and Parenteral Therapies",
        description: "Accuracy is 55.0% across 40 questions.",
        impactLevel: "Critical",
        affectedQuestionCount: 18,
        targetCategoryCode: "PHA",
        suggestedIntervention: "Review high-risk medication administration protocols.",
      },
    ],
  };

  const mockRecommendations: LearnerRecommendation[] = [
    {
      id: "rec_001",
      category: "TargetedPractice",
      priority: "High",
      status: "New",
      title: "Master High-Alert Pharmacology Titrations",
      description: "Recent attempts show persistent incorrect responses on IV drug calculation items.",
      evidenceReasoning: "Current accuracy in Pharmacological Therapies is 55.0% across 40 questions.",
      targetClientNeedCode: "PHA",
      targetClientNeedName: "Pharmacological and Parenteral Therapies",
      actionHref: "/dashboard?tab=tutored_cat&category=PHA",
      actionLabel: "Launch Practice Drill",
      createdAt: new Date().toISOString(),
    },
  ];

  const mockInterventions: LearnerIntervention[] = [
    {
      id: "inv_001",
      recommendationId: "rec_001",
      title: "Remediation Drill: Master High-Alert Pharmacology Titrations",
      targetCategoryCode: "PHA",
      targetCategoryName: "Pharmacological and Parenteral Therapies",
      baselineAccuracyPercent: 55.0,
      postInterventionAccuracyPercent: 72.5,
      deltaAccuracyPercent: 17.5,
      status: "Completed",
      startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      completedAt: new Date().toISOString(),
    },
  ];

  const mockReviewData: PaginatedQuestionReview = {
    page: 1,
    pageSize: 10,
    totalCount: 1,
    totalPages: 1,
    items: [
      {
        attemptId: "att_01",
        attemptTitle: "Diagnostic Mock Simulation",
        attemptCompletedAt: new Date().toISOString(),
        questionId: "q_rev_01",
        questionCode: "NCLEX-RN-PHA-01",
        questionStem: "A client with acute heart failure is prescribed IV furosemide...",
        questionTypeKey: "single-choice",
        questionTypeDisplayName: "Single Choice",
        difficulty: "Hard",
        clientNeedCode: "PHA",
        clientNeedName: "Pharmacological and Parenteral Therapies",
        isCorrect: false,
        scoreEarned: 0,
        maxScore: 1,
        timeSpentSeconds: 65,
        isFlagged: false,
        clinicalRationale: "Furosemide is a loop diuretic that requires monitoring of serum potassium.",
        safeSelectedAnswerPreview: "Option A (Inotropic)",
        safeCorrectAnswerPreview: "Option B (Diuretic)",
      },
    ],
  };

  /* -------------------------------------------------------------------------- */
  /* 1. Performance KPI Grid                                                    */
  /* -------------------------------------------------------------------------- */
  it("renders PerformanceKpiGrid with authoritative metrics and readiness tier", () => {
    render(<PerformanceKpiGrid overview={mockOverview} isLoading={false} />);

    expect(screen.getByText("Overall Accuracy")).toBeInTheDocument();
    expect(screen.getByText("75.1%")).toBeInTheDocument();
    expect(screen.getByText("Completion Rate")).toBeInTheDocument();
    expect(screen.getByText("85.7%")).toBeInTheDocument();
    expect(screen.getByText("Mean Exam Score")).toBeInTheDocument();
    expect(screen.getByText("78.4%")).toBeInTheDocument();
    expect(screen.getByText("Readiness Tier")).toBeInTheDocument();
    expect(screen.getByText("High Readiness")).toBeInTheDocument();
    expect(screen.getByText(/338 correct out of 450 questions answered/i)).toBeInTheDocument();
    expect(screen.getByText("Management of Care")).toBeInTheDocument();
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Compact Performance Card (Main Dashboard)                              */
  /* -------------------------------------------------------------------------- */
  it("renders CompactPerformanceCard on learner dashboard with progress and link", () => {
    render(
      <CompactPerformanceCard
        overview={mockOverview}
        pathway="rn"
        destinationHref="/learner/nclex-rn/performance"
      />
    );

    expect(screen.getByText("Performance Intelligence Snapshot")).toBeInTheDocument();
    expect(screen.getByText("NCLEX-RN")).toBeInTheDocument();
    expect(screen.getByText("Current Clinical Preparedness & Longitudinal Growth")).toBeInTheDocument();
    expect(screen.getByText("75.1%")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("450")).toBeInTheDocument();
    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /View Full Intelligence/i });
    expect(link).toHaveAttribute("href", "/learner/nclex-rn/performance");
  });

  /* -------------------------------------------------------------------------- */
  /* 3. NCSBN Client Needs Mastery Card                                        */
  /* -------------------------------------------------------------------------- */
  it("renders ClientNeedsIntelligenceCard with classification badges and drill action", () => {
    const handlePractice = vi.fn();
    render(
      <ClientNeedsIntelligenceCard
        categories={mockCategories}
        pathway="rn"
        onPracticeCategory={handlePractice}
      />
    );

    expect(screen.getByText("NCLEX Client Needs Category Mastery")).toBeInTheDocument();
    expect(screen.getByText("Management of Care")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("Strong Mastery")).toBeInTheDocument();

    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();
    expect(screen.getByText("55.0%")).toBeInTheDocument();
    expect(screen.getByText("Needs Priority Focus")).toBeInTheDocument();

    expect(screen.getByText("Safety and Infection Control")).toBeInTheDocument();
    expect(screen.getByText("Insufficient Data (<5 Qs)")).toBeInTheDocument();

    // Click targeted practice button
    const drillButton = screen.getByRole("button", { name: /Practice Drill/i });
    fireEvent.click(drillButton);
    expect(handlePractice).toHaveBeenCalledWith("PHA");
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Question Intelligence & NCJMM Cognitive Steps                          */
  /* -------------------------------------------------------------------------- */
  it("renders QuestionIntelligenceCard with SATA, difficulty, and NCJMM steps", () => {
    render(
      <QuestionIntelligenceCard
        summary={mockQuestionIntelligence}
        pathway="rn"
        isLoading={false}
      />
    );

    // Question types (default active sub-tab)
    expect(screen.getByText("Select All That Apply (SATA)")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("Standard Multiple Choice")).toBeInTheDocument();
    expect(screen.getByText("84.0%")).toBeInTheDocument();

    // Difficulty subtab
    const diffTab = screen.getByRole("button", { name: /Difficulty/i });
    fireEvent.click(diffTab);
    expect(screen.getByText("Easy Tier")).toBeInTheDocument();
    expect(screen.getByText("92.0%")).toBeInTheDocument();
    expect(screen.getByText("Hard Tier")).toBeInTheDocument();
    expect(screen.getByText("55.0%")).toBeInTheDocument();

    // NCJMM subtab
    const ncjmmTab = screen.getByRole("button", { name: /NCJMM Model/i });
    fireEvent.click(ncjmmTab);
    expect(screen.getByText("Recognize Cues")).toBeInTheDocument();
    expect(screen.getByText("84.0%")).toBeInTheDocument();
    expect(screen.getByText("Prioritize Hypotheses")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();

    // Error traps subtab
    const errorsTab = screen.getByRole("button", { name: /Error Traps/i });
    fireEvent.click(errorsTab);
    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();
    expect(screen.getByText(/Review high-risk medication administration protocols/i)).toBeInTheDocument();
  });

  /* -------------------------------------------------------------------------- */
  /* 5. Personalized Recommendations List & Actions                           */
  /* -------------------------------------------------------------------------- */
  it("renders PersonalizedRecommendationsList and handles intervention start and dismiss", () => {
    const handleStart = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <PersonalizedRecommendationsList
        recommendations={mockRecommendations}
        onStartIntervention={handleStart}
        onUpdateStatus={handleUpdate}
        isLoading={false}
      />
    );

    expect(screen.getByText("Master High-Alert Pharmacology Titrations")).toBeInTheDocument();
    expect(screen.getByText(/Current accuracy in Pharmacological Therapies is 55.0%/i)).toBeInTheDocument();
    expect(screen.getByText("High Priority")).toBeInTheDocument();

    const startBtn = screen.getByRole("button", { name: /Track Intervention/i });
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledWith(mockRecommendations[0]);

    const dismissBtn = screen.getByTitle("Dismiss recommendation");
    fireEvent.click(dismissBtn);
    expect(handleUpdate).toHaveBeenCalledWith("rec_001", "Dismissed");
  });

  /* -------------------------------------------------------------------------- */
  /* 6. Learning Interventions Tracker                                         */
  /* -------------------------------------------------------------------------- */
  it("renders InterventionsTracker with baseline vs follow-up delta", () => {
    render(<InterventionsTracker interventions={mockInterventions} isLoading={false} />);

    expect(screen.getByText("Remediation Drill: Master High-Alert Pharmacology Titrations")).toBeInTheDocument();
    expect(screen.getByText("55.0%")).toBeInTheDocument(); // Baseline
    expect(screen.getByText("72.5%")).toBeInTheDocument(); // Post-intervention
    expect(screen.getByText("+17.5%")).toBeInTheDocument(); // Delta
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  /* -------------------------------------------------------------------------- */
  /* 7. Question Review Table                                                  */
  /* -------------------------------------------------------------------------- */
  it("renders QuestionReviewTable with question stem, rationale, and filters", () => {
    const handleSearch = vi.fn();
    const handleToggle = vi.fn();
    const handlePage = vi.fn();

    render(
      <QuestionReviewTable
        reviewData={mockReviewData}
        page={1}
        pageSize={10}
        search=""
        onlyIncorrect={false}
        onSearchChange={handleSearch}
        onOnlyIncorrectToggle={handleToggle}
        onPageChange={handlePage}
        isLoading={false}
      />
    );

    expect(screen.getByText(/A client with acute heart failure/i)).toBeInTheDocument();
    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();
    expect(screen.getByText("Incorrect")).toBeInTheDocument();

    const filterBtn = screen.getByRole("button", { name: /Filter Missed/i });
    fireEvent.click(filterBtn);
    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  /* -------------------------------------------------------------------------- */
  /* 8. Attempt Comparison Modal                                               */
  /* -------------------------------------------------------------------------- */
  it("renders AttemptComparisonModal with score and duration deltas", () => {
    const mockComparison: AttemptComparisonResponse = {
      attempt1: {
        attemptId: "att_1",
        examTitle: "CAT Diagnostic 1",
        scorePercent: 62.0,
        accuracyPercent: 62.0,
        totalQuestions: 75,
        correctCount: 46,
        durationMinutes: 60,
        completedAt: "2026-10-25 14:00",
      },
      attempt2: {
        attemptId: "att_2",
        examTitle: "CAT Diagnostic 2",
        scorePercent: 78.0,
        accuracyPercent: 78.0,
        totalQuestions: 85,
        correctCount: 66,
        durationMinutes: 48,
        completedAt: "2026-11-05 16:30",
      },
      scoreDeltaPercent: 16.0,
      accuracyDeltaPercent: 16.0,
      timeDeltaMinutes: -12,
      summaryText: "Score increased by +16% in 12 fewer minutes.",
      categoryDeltas: [
        {
          categoryCode: "MOC",
          categoryName: "Management of Care",
          attempt1AccuracyPercent: 60.0,
          attempt2AccuracyPercent: 80.0,
          deltaPercent: 20.0,
        },
      ],
    };

    render(
      <AttemptComparisonModal
        isOpen={true}
        onClose={vi.fn()}
        comparison={mockComparison}
      />
    );

    expect(screen.getByText("Longitudinal Attempt Comparison")).toBeInTheDocument();
    expect(screen.getAllByText("62.0%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("78.0%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\+16\.0%/i)).toBeInTheDocument();
    expect(screen.getByText("60 min")).toBeInTheDocument();
    expect(screen.getByText("48 min")).toBeInTheDocument();
    expect(screen.getByText(/Score increased by \+16% in 12 fewer minutes/i)).toBeInTheDocument();
    expect(screen.getByText("+20.0%")).toBeInTheDocument();
  });

  /* -------------------------------------------------------------------------- */
  /* 9. Performance Report Preview Modal                                       */
  /* -------------------------------------------------------------------------- */
  it("renders PerformanceReportPreviewModal with export actions and methodology", () => {
    const mockReport: LearnerPerformanceReport = {
      reportId: "rep_001",
      generatedAt: new Date().toISOString(),
      userId: "cand_test_01",
      learnerName: "Florence Nightingale",
      learnerEmail: "candidate@test.com",
      pathway: "rn",
      pathwayTitle: "NCLEX-RN Registered Nursing",
      timeframe: "all",
      overview: mockOverview,
      categoryBreakdown: mockCategories,
      questionTypeBreakdown: mockQuestionIntelligence.questionTypes,
      recommendations: mockRecommendations,
      methodologyDisclaimer: "Methodology & Limitations: Readiness tiers reflect diagnostic benchmarks.",
    };

    render(
      <PerformanceReportPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        report={mockReport}
        pathway="rn"
        timeframe="all"
      />
    );

    expect(screen.getByText("Official Learner Performance Intelligence Report")).toBeInTheDocument();
    expect(screen.getByText("Florence Nightingale")).toBeInTheDocument();
    expect(screen.getByText("NCLEX-RN Registered Nursing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByText(/Readiness tiers reflect diagnostic benchmarks/i)).toBeInTheDocument();
  });

  /* -------------------------------------------------------------------------- */
  /* 10. PerformanceIntelligenceView Integration                               */
  /* -------------------------------------------------------------------------- */
  it("renders dedicated RN Performance Intelligence View with pathway identity", async () => {
    // Mock global fetch for API calls
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/learner/analytics/overview")) {
        return Promise.resolve({ json: () => Promise.resolve(mockOverview) });
      }
      if (url.includes("/api/learner/analytics/categories")) {
        return Promise.resolve({ json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/learner/analytics/question-intelligence")) {
        return Promise.resolve({ json: () => Promise.resolve(mockQuestionIntelligence) });
      }
      if (url.includes("/api/learner/analytics/recommendations-v2")) {
        return Promise.resolve({ json: () => Promise.resolve(mockRecommendations) });
      }
      if (url.includes("/api/learner/analytics/interventions")) {
        return Promise.resolve({ json: () => Promise.resolve(mockInterventions) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    globalThis.fetch = mockFetch;

    render(<PerformanceIntelligenceView initialPathway="rn" canSwitchPathway={true} />);

    expect(
      screen.getByRole("heading", { name: /NCLEX-RN Clinical Performance Intelligence/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Switch to NCLEX-PN/i)).toBeInTheDocument();

    // Switch to PN
    fireEvent.click(screen.getByText(/Switch to NCLEX-PN/i));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /NCLEX-PN Clinical Performance Intelligence/i })
      ).toBeInTheDocument();
    });
  });
});
