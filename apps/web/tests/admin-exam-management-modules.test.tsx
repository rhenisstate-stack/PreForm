import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminExaminationsClient from "@/app/admin/examinations/page-client";
import { CourseSubjectManagement } from "@/components/admin/exam-management/course-subject-management";
import { ClientNeedsManagement } from "@/components/admin/exam-management/client-needs-management";
import {
  RatsManagementWorkspace,
  validateReadinessThresholds,
} from "@/components/admin/exam-management/rats-management-workspace";
import { PracticeExamsWorkspace } from "@/components/admin/exam-management/practice-exams-workspace";

let mockAuthState: any = {
  user: { id: "admin_1", email: "admin@prepford.com", role: "admin" },
  isLoading: false,
  isAuthenticated: true,
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
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

describe("Admin Dashboard Exam Management — Three Primary Modules & Classification Systems", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch as any;
    mockAuthState = {
      user: { id: "admin_1", email: "admin@prepford.com", role: "admin" },
      isLoading: false,
      isAuthenticated: true,
    };

    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url.includes("/api/admin/curriculum/courses") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            courses: [
              {
                id: "course_1",
                code: "MED-SURG-RN",
                programmeId: "prog_rn",
                pathway: "rn",
                title: "Adult Medical-Surgical Nursing",
                description: "Comprehensive adult acute and chronic nursing care",
                displayOrder: 1,
                isPublished: true,
                isActive: true,
                subjectDomainCount: 2,
                questionCount: 18,
              },
            ],
          }),
        };
      }

      if (url.includes("/api/admin/curriculum/subject-domains") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            subjectDomains: [
              {
                id: "sub_1",
                code: "CARDIO-01",
                courseId: "course_1",
                courseTitle: "Adult Medical-Surgical Nursing",
                pathway: "rn",
                title: "Cardiovascular & Hemodynamic Disorders",
                description: "Heart failure, arrhythmias, and perfusion",
                displayOrder: 1,
                isActive: true,
                categoryCount: 3,
                questionCount: 10,
              },
            ],
          }),
        };
      }

      if (url.includes("/api/admin/client-needs") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            clientNeeds: [
              {
                id: "cn_pha",
                code: "PHA",
                name: "Pharmacological and Parenteral Therapies",
                description: "Medication administration and dosage safety",
                displayOrder: 1,
                isActive: true,
                pathway: "both",
                questionCount: 24,
              },
            ],
          }),
        };
      }

      if (url.includes("/api/admin/examinations/eligible-questions")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            questions: [
              {
                id: "q_101",
                questionId: "q_101",
                code: "RN-Q-101",
                stem: "Which assessment finding in a client receiving IV heparin requires immediate action?",
                questionTypeKey: "single-choice",
                pathway: "rn",
                difficulty: "Moderate",
                status: "Published",
                optionCount: 4,
                clientNeedCode: "PHA",
              },
            ],
          }),
        };
      }

      if (url.includes("/api/admin/examinations") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            items: [
              {
                id: "exam_1",
                code: "RN-EX-000001",
                title: "NCLEX-RN Sample Examination",
                pathway: "rn",
                createdAt: new Date().toISOString(),
                createdBy: "admin_1",
                revisionCount: 1,
                latestRevision: {
                  id: "rev_1",
                  examinationId: "exam_1",
                  revisionNumber: 1,
                  lifecycleState: "Draft",
                  title: "NCLEX-RN Sample Examination — Rev 1",
                  pathway: "rn",
                  examType: 1,
                  timeLimitMinutes: 120,
                  passingScorePercent: 75,
                  questionCount: 25,
                },
              },
            ],
            pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          }),
        };
      }

      if (method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            examination: { id: "new_exam_1", code: "RN-EX-000099" },
            course: { id: "new_course_1", code: "OB-PEDS", title: "Maternal-Newborn" },
            clientNeed: { id: "new_cn_1", code: "MOC", name: "Management of Care" },
          }),
        };
      }

      if (method === "PUT" || method === "PATCH") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
    });
  });

  it("renders the three primary management modules on /admin/examinations and navigates between them", async () => {
    renderWithQueryClient(<AdminExaminationsClient />);

    expect(
      await screen.findByTestId("primary-module-standalone")
    ).toBeInTheDocument();
    expect(screen.getByTestId("primary-module-rats")).toBeInTheDocument();
    expect(screen.getByTestId("primary-module-practice")).toBeInTheDocument();

    // Navigate to Module 1: Create Custom Test (Stand Alone)
    fireEvent.click(screen.getByTestId("primary-module-standalone"));
    expect(
      await screen.findByTestId("standalone-tests-workspace")
    ).toBeInTheDocument();
    expect(screen.getByTestId("standalone-subtab-tests")).toBeInTheDocument();
    expect(screen.getByTestId("standalone-subtab-courses")).toBeInTheDocument();
    expect(
      screen.getByTestId("standalone-subtab-client-needs")
    ).toBeInTheDocument();

    // Navigate to Module 2: RATS
    fireEvent.click(screen.getByTestId("primary-module-rats"));
    expect(
      await screen.findByTestId("rats-management-workspace")
    ).toBeInTheDocument();

    // Navigate to Module 3: Practice Exams
    fireEvent.click(screen.getByTestId("primary-module-practice"));
    expect(
      await screen.findByTestId("practice-exams-workspace")
    ).toBeInTheDocument();

    // Return to Full Examination Library
    fireEvent.click(screen.getByTestId("return-to-library-btn"));
    expect(await screen.findByText("All Pathways")).toBeInTheDocument();
  });

  it("supports Course/Subject CRUD and dependency-protected Deactivate fallback on 409 Conflict", async () => {
    render(<CourseSubjectManagement canModify={true} />);

    expect(
      await screen.findByText("Adult Medical-Surgical Nursing")
    ).toBeInTheDocument();
    expect(screen.getByText("MED-SURG-RN")).toBeInTheDocument();

    // Switch to Subject Domains tab
    fireEvent.click(screen.getByText(/Subject Domains/i));
    expect(
      await screen.findByText("Cardiovascular & Hemodynamic Disorders")
    ).toBeInTheDocument();

    // Switch back to Courses tab and trigger Delete -> 409 Conflict -> Deactivate Instead
    fireEvent.click(screen.getByText(/Courses \(/i));
    const deleteButtons = await screen.findAllByTitle(
      "Delete or Deactivate Course"
    );
    fireEvent.click(deleteButtons[0]);

    mockFetch.mockImplementationOnce(async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error:
          "Cannot delete course that has subject domains attached. Deactivate the course instead.",
      }),
    }));

    fireEvent.click(screen.getByText("Delete Permanently"));

    expect(
      await screen.findByText(/Cannot delete course that has subject domains/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Deactivate Instead"));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/curriculum/courses/course_1",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("supports Client Needs CRUD and displays linked repository question counts", async () => {
    render(<ClientNeedsManagement canModify={true} />);

    expect(
      await screen.findByText("Pharmacological and Parenteral Therapies")
    ).toBeInTheDocument();
    expect(screen.getByText("24 Qs")).toBeInTheDocument();

    // Open New Client Need dialog
    fireEvent.click(screen.getByText("New Client Need"));
    fireEvent.change(screen.getByLabelText(/Category Code/i), {
      target: { value: "MOC" },
    });
    fireEvent.change(screen.getByLabelText(/Category Name/i), {
      target: { value: "Management of Care" },
    });
    fireEvent.click(screen.getByText("Create Client Need"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/client-needs",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("validates RAT Readiness Classification Thresholds for non-overlapping 0–100% bands", async () => {
    expect(
      validateReadinessThresholds({
        lowMin: 0,
        lowMax: 54,
        borderlineMin: 55,
        borderlineMax: 64,
        highMin: 65,
        highMax: 79,
        veryHighMin: 80,
        veryHighMax: 100,
      })
    ).toBeNull();

    expect(
      validateReadinessThresholds({
        lowMin: 0,
        lowMax: 60,
        borderlineMin: 55, // overlaps with LowMax = 60
        borderlineMax: 70,
        highMin: 71,
        highMax: 85,
        veryHighMin: 86,
        veryHighMax: 100,
      })
    ).toMatch(/non-overlapping/i);

    render(<RatsManagementWorkspace canModify={true} />);
    await screen.findByText(/RATS Management & Readiness Threshold Governance/i);

    fireEvent.click(screen.getByTestId("create-rat-btn"));
    fireEvent.change(screen.getByLabelText(/RAT Title/i), {
      target: { value: "NCLEX-RN Readiness Assessment #2" },
    });

    // Set overlapping Low Readiness Max = 65 (overlapping Borderline Min = 55)
    fireEvent.change(screen.getByLabelText("Low Readiness Max"), {
      target: { value: "65" },
    });
    fireEvent.click(screen.getByTestId("save-rat-btn"));

    expect(await screen.findByTestId("rat-form-error")).toHaveTextContent(
      /non-overlapping/i
    );
  });

  it("supports NCLEX-RN and NCLEX-PN programme filtering and creation in Practice Exams module", async () => {
    render(<PracticeExamsWorkspace canModify={true} />);

    expect(
      await screen.findByText("Practice Examination Management")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("practice-tab-pn"));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pathway=pn")
      );
    });

    fireEvent.click(screen.getByTestId("create-practice-exam-btn"));
    fireEvent.change(screen.getByLabelText(/Practice Exam Title/i), {
      target: { value: "NCLEX-PN Comprehensive Practice Exam #1" },
    });
    fireEvent.click(screen.getByTestId("save-practice-exam-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/examinations",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
