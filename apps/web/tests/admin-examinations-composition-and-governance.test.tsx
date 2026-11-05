import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExaminationCompositionTab } from "@/components/admin/examination-composition-tab";
import { ExaminationPoliciesTab } from "@/components/admin/examination-policies-tab";
import { ExaminationReadinessTab } from "@/components/admin/examination-readiness-tab";
import { ExaminationPreviewDialog } from "@/components/admin/examination-preview-dialog";
import type { BackendExamRevisionDto } from "@/lib/api-services";

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

describe("Phase 4 Examination Composition, Governance & Lifecycle Quality Gates", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  const mockComposition = {
    revisionId: "rev_comp_123",
    targetQuestionCount: 10,
    selectionStrategy: "DynamicBalanced",
    allowedQuestionTypes: ["single-choice", "multiple-response"],
    clientNeedQuotas: [
      {
        clientNeedId: "MOC",
        clientNeedName: "Management of Care",
        targetCount: 5,
        targetPercentage: 50,
        availableCount: 20,
      },
      {
        clientNeedId: "SIC",
        clientNeedName: "Safety and Infection Control",
        targetCount: 5,
        targetPercentage: 50,
        availableCount: 15,
      },
    ],
    concurrencyToken: 1,
  };

  const mockPoolPreview = {
    revisionId: "rev_comp_123",
    pathway: "rn",
    selectionStrategy: "DynamicBalanced",
    totalRequiredQuestions: 10,
    totalAvailableApprovedQuestions: 35,
    isOverallPoolSufficient: true,
    items: [
      {
        clientNeedId: "MOC",
        clientNeedName: "Management of Care",
        requiredCount: 5,
        availableApprovedQuestions: 20,
        isSufficient: true,
      },
      {
        clientNeedId: "SIC",
        clientNeedName: "Safety and Infection Control",
        requiredCount: 5,
        availableApprovedQuestions: 15,
        isSufficient: true,
      },
    ],
  };

  const mockRevision: BackendExamRevisionDto = {
    id: "rev_comp_123",
    examinationId: "fam_rn_1",
    examinationCode: "RN-EX-000001",
    revisionNumber: 1,
    lifecycleState: "Draft",
    concurrencyToken: 2,
    title: "NCLEX Comprehensive Examination",
    description: "Authoritative clinical licensure assessment",
    pathway: "rn",
    examType: 0,
    timeLimitMinutes: 120,
    passingScorePercent: 75.0,
    isPublished: false,
    questionCount: 10,
    targetQuestionCount: 10,
    selectionStrategy: "Preset",
    isAvailable: true,
    availableFrom: "2026-11-01T08:00:00Z",
    availableTo: "2026-12-31T23:59:59Z",
    maxAttemptsAllowed: 3,
    retakeCooldownHours: 24,
    allowInterruptedResume: true,
    reviewPolicy: "AfterExamSubmission",
    showRationales: true,
    showScoreImmediately: true,
    createdAt: "2026-11-01T00:00:00Z",
    createdBy: "admin_01",
  };

  const mockReadinessBlocked = {
    revisionId: "rev_comp_123",
    examinationCode: "RN-EX-000001",
    title: "NCLEX Comprehensive Examination",
    lifecycleState: "Approved",
    overallStatus: "BLOCKED",
    canPublish: false,
    checks: [
      {
        code: "POOL_INSUFFICIENT",
        area: "QuestionPool",
        severity: "BLOCK",
        message: "Question bank pool has insufficient items for Client Need 'PHA'.",
      },
      {
        code: "TITLE_COMPLETE",
        area: "Metadata",
        severity: "PASS",
        message: "Examination title is valid.",
      },
    ],
    evaluatedAtUtc: "2026-11-05T12:00:00Z",
  };

  const mockAdminPreview = {
    revisionId: "rev_comp_123",
    examinationCode: "RN-EX-000001",
    title: "NCLEX Comprehensive Examination",
    pathway: "rn",
    selectionStrategy: "DynamicBalanced",
    targetQuestionCount: 2,
    timeLimitMinutes: 120,
    passingScorePercent: 75.0,
    reviewPolicy: "AfterExamSubmission",
    questions: [
      {
        id: "q_preview_01",
        displayOrder: 1,
        stem: "A client presents with acute respiratory distress. Which nursing intervention is priority?",
        questionTypeKey: "single-choice",
        clientNeedId: "MOC",
        clientNeedName: "Management of Care",
        overallRationale: "Administering oxygen is the immediate priority to restore tissue perfusion.",
        options: [
          {
            id: "opt_1",
            optionKey: "A",
            content: "Administer high-flow supplemental oxygen",
            isCorrect: true,
            rationale: "Correct. Relieves hypoxia.",
            displayOrder: 0,
          },
          {
            id: "opt_2",
            optionKey: "B",
            content: "Obtain an elective electrocardiogram",
            isCorrect: false,
            rationale: "Secondary assessment.",
            displayOrder: 1,
          },
        ],
      },
      {
        id: "q_preview_02",
        displayOrder: 2,
        stem: "When caring for a postoperative client, which infection control action is mandatory?",
        questionTypeKey: "single-choice",
        clientNeedId: "SIC",
        clientNeedName: "Safety and Infection Control",
        overallRationale: "Hand hygiene is the single most effective intervention.",
        options: [
          {
            id: "opt_3",
            optionKey: "A",
            content: "Perform hand hygiene before contact",
            isCorrect: true,
            rationale: "Correct. Standard precautions.",
            displayOrder: 0,
          },
        ],
      },
    ],
  };

  it("renders ExaminationCompositionTab with blueprint quotas and question pool preview", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/composition")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, composition: mockComposition }),
        });
      }
      if (url.includes("/pool-preview")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, preview: mockPoolPreview }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderWithClient(
      <ExaminationCompositionTab
        revisionId="rev_comp_123"
        isDraft={true}
        concurrencyToken={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Curriculum Blueprint & Question Composition")).toBeDefined();
      expect(screen.getByRole("combobox")).toBeDefined();
    });

    const selectEl = screen.getByRole("combobox") as HTMLSelectElement;
    await waitFor(() => {
      expect(selectEl.value).toBe("DynamicBalanced");
    });

    // Verify master client needs list is rendered
    expect(screen.getByText("Management of Care")).toBeDefined();
    expect(screen.getByText("Safety and Infection Control")).toBeDefined();
    expect(screen.getByText("Physiological Adaptation")).toBeDefined();

    // Verify Save Composition button is present for Draft
    expect(screen.getByRole("button", { name: /save composition/i })).toBeDefined();
  });

  it("renders ExaminationPoliciesTab with availability windows, retake limits, and review policies", async () => {
    renderWithClient(
      <ExaminationPoliciesTab
        revision={mockRevision}
        isDraft={true}
      />
    );

    expect(screen.getByText("Assessment Availability & Delivery Governance")).toBeDefined();
    expect(screen.getByText("Examination Availability Windows")).toBeDefined();
    expect(screen.getByText("Attempt Limits & Retake Policies")).toBeDefined();
    expect(screen.getByText("Result Disclosure & Clinical Review Policies")).toBeDefined();

    // Check prefilled inputs
    expect(screen.getByDisplayValue("3")).toBeDefined(); // Max attempts
    expect(screen.getByDisplayValue("24")).toBeDefined(); // Retake cooldown hours
    expect(screen.getByDisplayValue("After Exam Submission (Standard)")).toBeDefined(); // Review policy
  });

  it("renders ExaminationReadinessTab with multi-stage checks and publication gate status", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/readiness")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, readiness: mockReadinessBlocked }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderWithClient(
      <ExaminationReadinessTab
        revisionId="rev_comp_123"
        lifecycleState="Approved"
        canPublish={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Publication Readiness & Quality Validation")).toBeDefined();
      expect(screen.getByText("Publication Gate: BLOCKED")).toBeDefined();
    });

    expect(screen.getByText(/Question bank pool has insufficient items/i)).toBeDefined();

    // Verify Publish button is disabled when BLOCKED
    const pubBtn = screen.getByRole("button", { name: /publish examination/i });
    expect(pubBtn.hasAttribute("disabled")).toBe(true);
  });

  it("renders ExaminationPreviewDialog simulating candidate view with educator verification rationales", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/preview")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, preview: mockAdminPreview }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    renderWithClient(
      <ExaminationPreviewDialog
        open={true}
        onOpenChange={vi.fn()}
        revisionId="rev_comp_123"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("NCLEX Comprehensive Examination")).toBeDefined();
    });

    // Verify zero learner attempt telemetry badge
    expect(screen.getByText(/Authoritative Preview Mode: Zero learner attempts/i)).toBeDefined();

    // Verify question 1 stem
    expect(screen.getByText(/A client presents with acute respiratory distress/i)).toBeDefined();

    // Verify correct key badge for admin
    expect(screen.getByText(/Correct Key \(Admin Preview\)/i)).toBeDefined();

    // Verify clinical rationale preview
    expect(screen.getByText(/Administering oxygen is the immediate priority/i)).toBeDefined();

    // Click Next Item
    const nextBtn = screen.getByRole("button", { name: /next item/i });
    fireEvent.click(nextBtn);

    // Verify question 2 stem
    await waitFor(() => {
      expect(screen.getByText(/When caring for a postoperative client/i)).toBeDefined();
    });
  });
});
