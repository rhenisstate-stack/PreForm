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
      questionsAttempted: 85,
      correctResponses: 68,
      incorrectResponses: 17,
      accuracyPercent: 80.0,
      classification: "Strong",
      confidenceLevel: "High",
      trendDirection: "Up",
      sampleSizeStatus: "Adequate",
      averageTimeSpentSeconds: 48,
    },
    {
      categoryCode: "PHA",
      categoryName: "Pharmacological and Parenteral Therapies",
      questionsAttempted: 40,
      correctResponses: 22,
      incorrectResponses: 18,
      accuracyPercent: 55.0,
      classification: "NeedsAttention",
      confidenceLevel: "High",
      trendDirection: "Down",
      sampleSizeStatus: "Adequate",
      averageTimeSpentSeconds: 62,
    },
    {
      categoryCode: "SIC",
      categoryName: "Safety and Infection Control",
      questionsAttempted: 4,
      correctResponses: 2,
      incorrectResponses: 2,
      accuracyPercent: 50.0,
      classification: "InsufficientData",
      confidenceLevel: "Low",
      trendDirection: "Neutral",
      sampleSizeStatus: "Low",
      averageTimeSpentSeconds: 50,
    },
  ];

  const mockQuestionIntelligence: QuestionIntelligenceSummary = {
    totalGradedQuestions: 450,
    overallAccuracyPercent: 75.1,
    questionTypes: [
      {
        questionTypeKey: "sata",
        questionTypeName: "Select All That Apply (SATA)",
        category: "Clinical Prioritization",
        questionsAttempted: 60,
        correctResponses: 36,
        accuracyPercent: 60.0,
        averageTimeSpentSeconds: 72,
        sampleSizeStatus: "Adequate",
        performanceLevel: "Moderate",
      },
      {
        questionTypeKey: "single-choice",
        questionTypeName: "Standard Multiple Choice",
        category: "Traditional",
        questionsAttempted: 200,
        correctResponses: 168,
        accuracyPercent: 84.0,
        averageTimeSpentSeconds: 42,
        sampleSizeStatus: "Adequate",
        performanceLevel: "Strong",
      },
    ],
    difficultyBreakdown: [
      {
        difficulty: "Easy",
        questionsAttempted: 100,
        correctResponses: 92,
        accuracyPercent: 92.0,
        averageTimeSpentSeconds: 35,
      },
      {
        difficulty: "Hard",
        questionsAttempted: 80,
        correctResponses: 44,
        accuracyPercent: 55.0,
        averageTimeSpentSeconds: 68,
      },
    ],
    clinicalJudgmentSteps: [
      {
        stepKey: "RecognizeCues",
        stepName: "Recognize Cues",
        stepNumber: 1,
        questionsAttempted: 50,
        correctResponses: 42,
        accuracyPercent: 84.0,
        status: "Proficient",
      },
      {
        stepKey: "PrioritizeHypotheses",
        stepName: "Prioritize Hypotheses",
        stepNumber: 3,
        questionsAttempted: 45,
        correctResponses: 27,
        accuracyPercent: 60.0,
        status: "Developing",
      },
    ],
    recurringErrors: [
      {
        errorType: "CategoryDeficiency",
        title: "Pharmacological and Parenteral Therapies",
        description: "Accuracy is 55.0% across 40 questions.",
        incorrectCount: 18,
        accuracyPercent: 55.0,
        targetCode: "PHA",
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
      actionLabel: "Start Intervention Drill",
      createdAt: new Date().toISOString(),
    },
  ];

  const mockInterventions: LearnerIntervention[] = [
    {
      id: "inv_001",
      recommendationId: "rec_001",
      title: "Remediation Drill: Master High-Alert Pharmacology Titrations",
      category: "TargetedPractice",
      targetCategoryCode: "PHA",
      targetCategoryName: "Pharmacological and Parenteral Therapies",
      baselineAccuracyPercent: 55.0,
      baselineQuestionsAnswered: 40,
      postInterventionAccuracyPercent: 72.5,
      postInterventionQuestionsAnswered: 30,
      accuracyDeltaPercent: 17.5,
      status: "Evaluated",
      startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      lastEvaluatedAt: new Date().toISOString(),
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

    expect(screen.getByText(/NCLEX-RN Performance Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText("75.1%")).toBeInTheDocument();
    expect(screen.getByText(/12 Assessments/i)).toBeInTheDocument();
    expect(screen.getByText(/450 Questions/i)).toBeInTheDocument();
    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Open Full Intelligence/i });
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

    expect(screen.getByText("NCSBN Client Needs Mastery")).toBeInTheDocument();
    expect(screen.getByText("Management of Care")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();

    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();
    expect(screen.getByText("55.0%")).toBeInTheDocument();
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();

    expect(screen.getByText("Safety and Infection Control")).toBeInTheDocument();
    expect(screen.getByText("Insufficient Data")).toBeInTheDocument();

    // Click targeted practice button
    const drillButtons = screen.getAllByRole("button", { name: /Practice Drill/i });
    fireEvent.click(drillButtons[0]);
    expect(handlePractice).toHaveBeenCalledWith("MOC");
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

    expect(screen.getByText("Select All That Apply (SATA)")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("Standard Multiple Choice")).toBeInTheDocument();
    expect(screen.getByText("84.0%")).toBeInTheDocument();

    // Difficulty
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("92.0%")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();

    // NCJMM
    expect(screen.getByText("Recognize Cues")).toBeInTheDocument();
    expect(screen.getByText("Prioritize Hypotheses")).toBeInTheDocument();

    // Recurring error alert
    expect(screen.getByText(/Recurring Deficiencies & Patterns/i)).toBeInTheDocument();
    expect(screen.getByText("18 Incorrect Responses")).toBeInTheDocument();
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
    expect(screen.getByText("HIGH PRIORITY")).toBeInTheDocument();

    const startBtn = screen.getByRole("button", { name: /Start Intervention Drill/i });
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledWith(mockRecommendations[0]);

    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
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
    expect(screen.getByText("Evaluated")).toBeInTheDocument();
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
    expect(screen.getByText("62.0%")).toBeInTheDocument();
    expect(screen.getByText("78.0%")).toBeInTheDocument();
    expect(screen.getByText("+16.0%")).toBeInTheDocument();
    expect(screen.getByText("-12 min")).toBeInTheDocument();
    expect(screen.getByText(/Score increased by \+16% in 12 fewer minutes/i)).toBeInTheDocument();
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
  });
});
