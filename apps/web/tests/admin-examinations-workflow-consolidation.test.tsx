import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminExaminationsClient } from "@/app/admin/examinations/page-client";
import { AdminExaminationFamilyClient } from "@/app/admin/examinations/[id]/page-client";
import { AdminRevisionStudioClient } from "@/app/admin/examinations/[id]/revisions/[revisionId]/page-client";
import { QuestionPickerDialog } from "@/components/admin/question-picker-dialog";

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  refresh: vi.fn(),
  replace: vi.fn(),
};

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

let mockUser: { id: string; role: string; displayName?: string; email?: string } | null = {
  id: "mgr_123",
  role: "exam_manager",
  displayName: "Exam Manager",
  email: "mgr@prepford.com",
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    registerUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

const mockNotifySuccess = vi.fn();
const mockNotifyError = vi.fn();

vi.mock("@/lib/notifications", () => ({
  notify: {
    success: (...args: any[]) => mockNotifySuccess(...args),
    error: (...args: any[]) => mockNotifyError(...args),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("P3.5 Examination Library Frontend Integration & Workflow Consolidation", () => {
  let queryClient: QueryClient;

  const mockLibraryData = {
    items: [
      {
        id: "fam_rn_001",
        code: "RN-EX-000001",
        title: "NCLEX-RN Comprehensive Practice Examination",
        pathway: "rn",
        createdAt: "2026-01-15T10:00:00Z",
        createdBy: "admin_123",
        revisionCount: 2,
        publishedRevision: null,
        latestRevision: {
          id: "rev_rn_2",
          examinationId: "fam_rn_001",
          revisionNumber: 2,
          lifecycleState: "Draft",
          title: "RN Rev 2 Active Draft",
          description: "Authoring in progress",
          pathway: "rn",
          examType: 0,
          timeLimitMinutes: 120,
          passingScorePercent: 75.0,
          isPublished: false,
          questionCount: 42,
          createdAt: "2026-01-16T10:00:00Z",
          updatedAt: "2026-01-16T10:00:00Z",
        },
      },
    ],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    examinations: [],
  };

  const mockFamilyZeroRevisions = {
    id: "fam_empty_001",
    code: "RN-EX-000999",
    title: "Empty Lineage Family",
    pathway: "rn",
    createdAt: "2026-11-01T10:00:00Z",
    createdBy: "mgr_123",
    currentRevisionId: null,
    currentRevision: null,
    revisions: [],
  };

  const mockFamilyWithRevisions = {
    id: "fam_rn_001",
    code: "RN-EX-000001",
    title: "NCLEX-RN Comprehensive Practice Examination",
    pathway: "rn",
    createdAt: "2026-01-15T10:00:00Z",
    createdBy: "mgr_123",
    currentRevisionId: "rev_rn_1",
    currentRevision: {
      id: "rev_rn_1",
      revisionNumber: 1,
      lifecycleState: "Published",
      questionCount: 50,
      title: "RN Rev 1",
    },
    revisions: [
      {
        id: "rev_rn_2",
        revisionNumber: 2,
        lifecycleState: "Draft",
        questionCount: 42,
        title: "RN Rev 2 Active Draft",
        description: "Authoring in progress",
        timeLimitMinutes: 120,
        passingScorePercent: 75.0,
        createdAt: "2026-01-16T10:00:00Z",
      },
      {
        id: "rev_rn_1",
        revisionNumber: 1,
        lifecycleState: "Published",
        questionCount: 50,
        title: "RN Rev 1",
        description: "Initial published release",
        timeLimitMinutes: 120,
        passingScorePercent: 75.0,
        createdAt: "2026-01-15T10:00:00Z",
      },
    ],
  };

  const mockRevisionDraft = {
    id: "rev_rn_2",
    examinationId: "fam_rn_001",
    revisionNumber: 2,
    lifecycleState: "Draft",
    title: "RN Rev 2 Active Draft",
    description: "Authoring in progress",
    pathway: "rn",
    examType: 0,
    timeLimitMinutes: 120,
    passingScorePercent: 75.0,
    concurrencyToken: 5,
    isPublished: false,
    questionCount: 1,
    createdAt: "2026-01-16T10:00:00Z",
    updatedAt: "2026-01-16T10:00:00Z",
  };

  const mockRevisionQuestions = [
    {
      id: "eqm_1",
      questionId: "q_101",
      sequenceOrder: 1,
      points: 1,
      questionText: "What is the primary action of beta blockers?",
      format: "multiple_choice",
      cognitiveLevel: "Application",
      isClinicalCase: false,
    },
  ];

  const mockValidationResult = {
    revisionId: "rev_rn_2",
    isValid: true,
    lifecycleState: "Draft",
    questionCount: 1,
    errors: [],
    warnings: [],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
    mockSearchParams = new URLSearchParams();

    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/admin/examinations/revisions/rev_rn_2/questions")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: mockRevisionQuestions }),
        });
      }
      if (urlStr.includes("/api/admin/examinations/revisions/rev_rn_2/validate")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ validation: mockValidationResult }),
        });
      }
      if (urlStr.includes("/api/admin/examinations/revisions/rev_rn_2")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ revision: mockRevisionDraft }),
        });
      }
      if (urlStr.includes("/api/admin/examinations/fam_empty_001")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ examination: mockFamilyZeroRevisions }),
        });
      }
      if (urlStr.includes("/api/admin/examinations/fam_rn_001")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ examination: mockFamilyWithRevisions }),
        });
      }
      if (urlStr.includes("/api/admin/examinations/eligible-questions")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              questions: [
                {
                  id: "eq_elig_1",
                  questionId: "q_elig_1",
                  questionText: "A client presents with acute chest pain...",
                  format: "multiple_choice",
                  pathway: "rn",
                },
                {
                  id: "eq_elig_2",
                  questionId: "q_elig_2",
                  questionText: "Select all nursing interventions for COPD...",
                  format: "multiple_response",
                  pathway: "rn",
                },
              ],
            }),
        });
      }
      if (urlStr.includes("/api/admin/examinations")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLibraryData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it("Stage P3.5-A: renders examination library with quick 'Author Draft' action for draft revisions", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationsClient />
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: "Examinations", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Examination Library")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000001")).toBeInTheDocument();
      expect(screen.getByText("RN Rev 2 Active Draft")).toBeInTheDocument();
    });

    // Check for Author Draft quick action button
    const authorDraftBtn = screen.getByRole("button", { name: /Author Draft/i });
    expect(authorDraftBtn).toBeInTheDocument();
  });

  it("Stage P3.5-B: renders empty lineage state when an examination family has zero revisions", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationFamilyClient id="fam_empty_001" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000999")).toBeInTheDocument();
      expect(screen.getByText("Empty Lineage Family")).toBeInTheDocument();
    });

    expect(screen.getByText("No revisions found for this family")).toBeInTheDocument();
    expect(
      screen.getByText("Use \"Create New Revision\" to initialize the foundational revision.")
    ).toBeInTheDocument();
  });

  it("Stage P3.5-C: renders Revision Switcher dropdown in Revision Studio and tracks unsaved changes", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminRevisionStudioClient familyId="fam_rn_001" revisionId="rev_rn_2" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Revision 2/i)).toBeInTheDocument();
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    // Check Revision Switcher dropdown exists
    const switcherSelect = screen.getByDisplayValue("Revision 2 (Draft)");
    expect(switcherSelect).toBeInTheDocument();

    // Verify Title input is populated with "RN Rev 2 Active Draft"
    const titleInput = screen.getByLabelText(/Revision Title/i);
    expect(titleInput).toHaveValue("RN Rev 2 Active Draft");

    // Initially no "Unsaved changes" indicator
    expect(screen.queryByText(/Unsaved changes/i)).not.toBeInTheDocument();

    // Mutate the title to trigger dirty state
    fireEvent.change(titleInput, { target: { value: "RN Rev 2 Modified Title" } });

    // Expect dirty tracking badge to appear
    await waitFor(() => {
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });
  });

  it("Stage P3.5-D: QuestionPickerDialog provides debounced search and question format filtering", async () => {
    const handleAdd = vi.fn();
    const handleClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <QuestionPickerDialog
          open={true}
          onOpenChange={handleClose}
          revisionId="rev_rn_2"
          revisionPathway="rn"
          existingQuestionIds={new Set(["q_101"])}
          concurrencyToken={5}
          onQuestionAdded={handleAdd}
        />
      </QueryClientProvider>
    );

    // Verify title and search input
    expect(screen.getByText("Add Questions to Revision")).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/Search questions by text/i);
    expect(searchInput).toBeInTheDocument();

    // Wait for eligible questions to load
    await waitFor(() => {
      expect(screen.getByText(/A client presents with acute chest pain/i)).toBeInTheDocument();
      expect(screen.getByText(/Select all nursing interventions for COPD/i)).toBeInTheDocument();
    });

    // Format chips are rendered
    const multiChoiceChip = screen.getByRole("button", { name: "multiple choice" });
    expect(multiChoiceChip).toBeInTheDocument();

    // Filter by multiple choice format
    fireEvent.click(multiChoiceChip);

    // Only multiple choice should be visible
    expect(screen.getByText(/A client presents with acute chest pain/i)).toBeInTheDocument();
    expect(screen.queryByText(/Select all nursing interventions for COPD/i)).not.toBeInTheDocument();

    // Match counter check
    expect(screen.getByText(/Showing 1 item\(s\)/i)).toBeInTheDocument();
  });
});
