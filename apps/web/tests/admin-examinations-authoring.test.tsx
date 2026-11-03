import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getAdminCapabilities,
  normalizeRole,
} from "@/lib/admin/authz";
import { getAuthorizedNavGroups } from "@/lib/admin/navigation";
import { AdminExaminationsClient } from "@/app/admin/examinations/page-client";

let mockUser: { id: string; role: string; displayName?: string; email?: string } | null = {
  id: "mgr_123",
  role: "exam_manager",
  displayName: "Exam Manager",
  email: "mgr@prepford.com",
};
let mockIsLoading = false;
let mockIsAuthenticated = true;

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    login: vi.fn(),
    registerUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("P3.2 Examination Authoring & Administration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  it("verifies RBAC capabilities for examination management", () => {
    const examMgrCaps = getAdminCapabilities("exam_manager");
    expect(examMgrCaps.canViewExaminations).toBe(true);
    expect(examMgrCaps.canManageExaminations).toBe(true);
    expect(examMgrCaps.canPublishExaminations).toBe(true);
    expect(examMgrCaps.canApproveExaminations).toBe(false); // Only admin/superadmin approve

    const reviewerCaps = getAdminCapabilities("reviewer");
    expect(reviewerCaps.canViewExaminations).toBe(true);
    expect(reviewerCaps.canReviewExaminations).toBe(true);
    expect(reviewerCaps.canManageExaminations).toBe(false);

    const adminCaps = getAdminCapabilities("admin");
    expect(adminCaps.canViewExaminations).toBe(true);
    expect(adminCaps.canManageExaminations).toBe(true);
    expect(adminCaps.canApproveExaminations).toBe(true);
    expect(adminCaps.canPublishExaminations).toBe(true);

    const candidateCaps = getAdminCapabilities("candidate");
    expect(candidateCaps.canViewExaminations).toBe(false);
    expect(candidateCaps.canManageExaminations).toBe(false);

    const instructorCaps = getAdminCapabilities("instructor");
    expect(instructorCaps.canViewExaminations).toBe(false);
  });

  it("verifies Examinations navigation item appears under examination group for authorized roles", () => {
    const caps = getAdminCapabilities("exam_manager");
    const groups = getAuthorizedNavGroups(caps);
    const examGroup = groups.find((g) => g.id === "examination");
    expect(examGroup).toBeDefined();

    const examItem = examGroup?.items.find((item) => item.id === "examinations");
    expect(examItem).toBeDefined();
    expect(examItem?.href).toBe("/admin/examinations");
  });

  it("renders examination catalogue with search and pathway controls", async () => {
    const mockExams = [
      {
        id: "fam_1",
        code: "RN-EX-000001",
        title: "NCLEX-RN Comprehensive Licensure Simulator",
        pathway: "rn",
        createdAt: "2026-11-03T10:00:00Z",
        createdBy: "mgr_123",
        currentRevisionId: "rev_1",
        currentRevision: {
          id: "rev_1",
          revisionNumber: 1,
          lifecycleState: "Published",
          questionCount: 75,
        },
        revisions: [{ id: "rev_1", revisionNumber: 1, lifecycleState: "Published" }],
      },
      {
        id: "fam_2",
        code: "PN-EX-000001",
        title: "NCLEX-PN Practical Nurse Clinical Readiness",
        pathway: "pn",
        createdAt: "2026-11-03T11:00:00Z",
        createdBy: "mgr_123",
        currentRevisionId: "rev_2",
        currentRevision: {
          id: "rev_2",
          revisionNumber: 1,
          lifecycleState: "Draft",
          questionCount: 15,
        },
        revisions: [{ id: "rev_2", revisionNumber: 1, lifecycleState: "Draft" }],
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/examinations")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, examinations: mockExams }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationsClient />
      </QueryClientProvider>
    );

    // Header rendered
    expect(screen.getByRole("heading", { name: "Examinations", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("New Examination Family")).toBeInTheDocument();

    // Table rows rendered
    await waitFor(() => {
      expect(screen.getByText("RN-EX-000001")).toBeInTheDocument();
      expect(screen.getByText("NCLEX-RN Comprehensive Licensure Simulator")).toBeInTheDocument();
      expect(screen.getByText("PN-EX-000001")).toBeInTheDocument();
      expect(screen.getByText("NCLEX-PN Practical Nurse Clinical Readiness")).toBeInTheDocument();
    });
  });
});
