import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CANONICAL_QUESTION_TYPES,
  getDefaultStructuredContent,
  validateQuestionPayload,
} from "@/lib/question-types";
import { QuestionTypeRenderer } from "@/components/questions/question-type-renderer";
import { QuestionTypeEditor } from "@/components/questions/question-type-editor";
import { AdminQuestionsClient } from "@/app/admin/questions/page-client";
import { notify } from "@/lib/notifications";

let mockAuthState: any = {
  user: { id: "admin_1", email: "admin@prepford.com", role: "superadmin" },
  isLoading: false,
  isAuthenticated: true,
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/lib/notifications", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("All 18 Canonical Question Types — Registry, Renderer, Editor & Full-Page CRUD", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch as any;

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url.includes("/api/admin/client-needs")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            clientNeeds: [
              { id: "cn-pha", code: "PHA", name: "Pharmacological Therapies" },
            ],
          }),
        };
      }

      if (url.includes("/api/admin/curriculum/tree")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            tree: [
              {
                id: "topic-cardio",
                type: "topic",
                name: "Heart Failure & Hemodynamics",
                children: [],
              },
            ],
          }),
        };
      }

      if (url.endsWith("/api/admin/questions/q-1") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            question: {
              id: "q-1",
              code: "RN-Q-001",
              pathway: "rn",
              topicId: "topic-cardio",
              clientNeedId: "cn-pha",
              clientNeedCode: "PHA",
              questionTypeKey: "matrix",
              questionTypeName: "Matrix / Grid Response",
              stem: "For each assessment finding, click to specify whether the finding is consistent with cardiac tamponade or hypovolemic shock.",
              instructions: "Select all that apply per row.",
              clinicalScenario: "A 64-year-old client post-pericardiocentesis develops acute hypotension.",
              exhibitsJson: JSON.stringify([
                {
                  id: "ex-1",
                  title: "Nurses' Notes",
                  category: "NursesNotes",
                  content: "1400: BP 82/48 mmHg, JVD noted, muffled heart sounds.",
                },
              ]),
              structuredContentJson: JSON.stringify(getDefaultStructuredContent("matrix")),
              overallRationale: "Beck's triad (hypotension, JVD, muffled heart sounds) indicates cardiac tamponade.",
              difficulty: 3,
              status: 0,
              version: 1,
              optionsCount: 0,
              versionsCount: 0,
              referencedByExamCount: 2,
              referencedByAttemptCount: 5,
              canDelete: false,
              referencedExams: [
                {
                  revisionId: "rev-101",
                  examinationId: "exam-101",
                  examinationCode: "RN-EX-101",
                  title: "NCLEX-RN Readiness Assessment #1",
                  lifecycleState: "Published",
                },
              ],
              options: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        };
      }

      if (url.includes("/api/admin/questions") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            result: {
              items: [
                {
                  id: "q-1",
                  code: "RN-Q-001",
                  pathway: "rn",
                  topicId: "topic-cardio",
                  topicTitle: "Heart Failure & Hemodynamics",
                  clientNeedId: "cn-pha",
                  clientNeedCode: "PHA",
                  clientNeedName: "Pharmacological Therapies",
                  questionTypeKey: "matrix",
                  questionTypeName: "Matrix / Grid Response",
                  stem: "For each assessment finding, click to specify whether the finding is consistent with cardiac tamponade or hypovolemic shock.",
                  difficulty: 3,
                  status: 0,
                  version: 1,
                  optionsCount: 0,
                  referencedByExamCount: 2,
                  referencedByAttemptCount: 5,
                  canDelete: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              totalCount: 1,
              page: 1,
              pageSize: 15,
              totalPages: 1,
            },
          }),
        };
      }

      if (method === "POST" || method === "PUT") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ question: { id: "q-saved" } }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
    });
  });

  it("verifies all 18 canonical question types match the backend QuestionTypeRegistry", () => {
    expect(CANONICAL_QUESTION_TYPES).toHaveLength(18);
    const keys = CANONICAL_QUESTION_TYPES.map((t) => t.key);
    expect(keys).toEqual([
      "single-choice",
      "multiple-choice",
      "sata",
      "checkbox",
      "image-based",
      "multiple-image",
      "drag-drop",
      "ordering",
      "case-study",
      "essay",
      "matching",
      "fill-blank",
      "matrix",
      "numeric",
      "true-false",
      "tabular",
      "short-answer",
      "dynamic-lab",
    ]);
  });

  it("renders QuestionTypeRenderer and QuestionTypeEditor across all 18 canonical question types", () => {
    const sampleOptions = [
      { optionKey: "A", content: "Administer IV calcium gluconate", isCorrect: true, rationale: "Stabilizes myocardium", distractorRationale: "", mediaUrl: "https://example.com/ecg-a.png" },
      { optionKey: "B", content: "Administer oral potassium bolus", isCorrect: false, rationale: "", distractorRationale: "Worsens hyperkalemia", mediaUrl: "https://example.com/ecg-b.png" },
    ];
    const sampleExhibits = JSON.stringify([
      { id: "ex-1", title: "Lab Results", category: "Labs", content: "K+ 6.4 mEq/L (Critical)" },
    ]);

    for (const def of CANONICAL_QUESTION_TYPES) {
      const structuredJson = def.isOptionBased
        ? ""
        : JSON.stringify(getDefaultStructuredContent(def.key));

      const validation = validateQuestionPayload({
        questionTypeKey: def.key,
        stem: `Clinical stem for ${def.label}`,
        options: sampleOptions,
        structuredContentJson: structuredJson,
        exhibitsJson: sampleExhibits,
      });
      expect(validation.valid, `Validation for ${def.key}`).toBe(true);

      const { unmount: unmountRenderer } = render(
        <QuestionTypeRenderer
          questionTypeKey={def.key}
          stem={`Clinical stem for ${def.label}`}
          clinicalScenario="A client is admitted to the emergency department."
          exhibitsJson={sampleExhibits}
          structuredContentJson={structuredJson}
          overallRationale="Clinical rationale text."
          options={sampleOptions}
          mode="admin-preview"
        />
      );
      expect(screen.getByTestId(`question-renderer-${def.key}`)).toBeInTheDocument();
      unmountRenderer();

      const { unmount: unmountEditor } = render(
        <QuestionTypeEditor
          questionTypeKey={def.key}
          options={sampleOptions}
          onOptionsChange={() => {}}
          structuredContentJson={structuredJson}
          onStructuredContentJsonChange={() => {}}
          exhibitsJson={sampleExhibits}
          onExhibitsJsonChange={() => {}}
        />
      );
      expect(screen.getByTestId(`question-type-editor-${def.key}`)).toBeInTheDocument();
      unmountEditor();
    }
  });

  it("preserves exhibitsJson and structuredContentJson when editing an existing question in AdminQuestionsClient", async () => {
    renderWithQueryClient(<AdminQuestionsClient />);

    expect(
      await screen.findByText(/For each assessment finding, click to specify/i)
    ).toBeInTheDocument();

    // Click Edit Question button
    const editBtn = screen.getByTitle("Edit Question");
    fireEvent.click(editBtn);

    expect(await screen.findByTestId("question-editor-fullpage")).toBeInTheDocument();

    // Wait for GET /api/admin/questions/q-1 to populate formStem and exhibitsJson
    await waitFor(() => {
      expect(screen.getByTestId("question-stem-input")).toHaveValue(
        "For each assessment finding, click to specify whether the finding is consistent with cardiac tamponade or hypovolemic shock."
      );
    });

    // Save without altering exhibitsJson or structuredContentJson
    fireEvent.click(screen.getByTestId("save-question-btn"));

    await waitFor(() => {
      const putCall = mockFetch.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/api/admin/questions/q-1") &&
          init?.method === "PUT"
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1].body);
      expect(body.questionTypeKey).toBe("matrix");
      expect(body.exhibitsJson).toContain("Nurses' Notes");
      expect(body.structuredContentJson).toContain("Cardiac Tamponade");
    });
    expect(notify.success).toHaveBeenCalled();
  });

  it("displays question dependency metadata and handles 409 Conflict deletion protection with Archive fallback", async () => {
    renderWithQueryClient(<AdminQuestionsClient />);

    expect(await screen.findByText("RN-Q-001")).toBeInTheDocument();

    // View Question Details and verify Dependency panel
    fireEvent.click(screen.getByTitle("View Question Details"));
    expect(await screen.findByTestId("question-details-fullpage")).toBeInTheDocument();
    expect(await screen.findByTestId("question-dependency-panel")).toBeInTheDocument();
    expect(screen.getByText("RN-EX-101")).toBeInTheDocument();

    // Click Delete / Archive from Details header
    fireEvent.click(screen.getByText("Delete / Archive"));
    expect(await screen.findByTestId("question-delete-fullpage")).toBeInTheDocument();
    expect(
      await screen.findByText(/Hard Deletion Blocked by Data-Integrity Policy/i)
    ).toBeInTheDocument();

    // Click Archive / Deactivate Instead fallback
    fireEvent.click(screen.getByText("Archive / Deactivate Instead"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/questions/q-1/status",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
