import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminExaminationsClient } from "@/app/admin/examinations/page-client";
import type { BackendExaminationLibraryResponseDto } from "@/lib/api-services";

let mockUser: { id: string; role: string; displayName?: string; email?: string } | null = {
  id: "adm_123",
  role: "admin",
  displayName: "System Administrator",
  email: "admin@prepford.com",
};
let mockIsLoading = false;
let mockIsAuthenticated = true;

const mockRouterReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

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
    replace: mockRouterReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe("P3.3 Examination Library Query & Discovery", () => {
  let queryClient: QueryClient;

  const mockLibraryResponse: BackendExaminationLibraryResponseDto = {
    success: true,
    items: [
      {
        id: "fam_rn_001",
        code: "RN-EX-000001",
        title: "NCLEX-RN Comprehensive Licensure Examination",
        pathway: "rn",
        createdAt: "2026-01-15T10:00:00Z",
        createdBy: "admin_123",
        currentRevisionId: "rev_1",
        revisionCount: 2,
        publishedRevision: {
          id: "rev_1",
          examinationId: "fam_rn_001",
          revisionNumber: 1,
          lifecycleState: "Published",
          title: "RN Rev 1",
          description: "Published revision description",
          pathway: "rn",
          examType: 0,
          timeLimitMinutes: 120,
          passingScorePercent: 75.0,
          isPublished: true,
          questionCount: 85,
          createdAt: "2026-01-15T10:00:00Z",
          updatedAt: "2026-01-15T10:00:00Z",
          publishedAt: "2026-01-16T12:00:00Z",
        },
        latestRevision: {
          id: "rev_2",
          examinationId: "fam_rn_001",
          revisionNumber: 2,
          lifecycleState: "Draft",
          title: "RN Rev 2",
          description: "Working draft",
          pathway: "rn",
          examType: 0,
          timeLimitMinutes: 120,
          passingScorePercent: 75.0,
          isPublished: false,
          questionCount: 90,
          createdAt: "2026-02-01T10:00:00Z",
          updatedAt: "2026-02-01T10:00:00Z",
        },
      },
      {
        id: "fam_pn_001",
        code: "PN-EX-000001",
        title: "NCLEX-PN Practical Readiness Examination",
        pathway: "pn",
        createdAt: "2026-01-20T10:00:00Z",
        createdBy: "admin_123",
        revisionCount: 1,
        publishedRevision: null,
        latestRevision: {
          id: "rev_pn_1",
          examinationId: "fam_pn_001",
          revisionNumber: 1,
          lifecycleState: "InReview",
          title: "PN Rev 1 In Review",
          description: "Pending approval",
          pathway: "pn",
          examType: 0,
          timeLimitMinutes: 90,
          passingScorePercent: 70.0,
          isPublished: false,
          questionCount: 75,
          createdAt: "2026-01-20T10:00:00Z",
          updatedAt: "2026-01-20T10:00:00Z",
        },
      },
    ],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1,
    },
    examinations: [],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
    mockSearchParams = new URLSearchParams();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/examinations")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLibraryResponse),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      });
    });
  });

  it("renders examination library catalogue with pagination metrics and distinct revision summaries", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationsClient />
      </QueryClientProvider>
    );

    // Header and Discovery Badge
    expect(screen.getByRole("heading", { name: "Examinations", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("P3.3 Library")).toBeInTheDocument();

    // Wait for items to populate
    await waitFor(() => {
      expect(screen.getByText("RN-EX-000001")).toBeInTheDocument();
      expect(screen.getByText("PN-EX-000001")).toBeInTheDocument();
    });

    // Check pagination metrics text
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);

    // Check distinction: Published Revision vs Latest Revision
    expect(screen.getAllByText("Rev 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("(85 Qs)")).toBeInTheDocument();
    expect(screen.getByText("None Published")).toBeInTheDocument(); // For PN exam
    expect(screen.getByText("Rev 2")).toBeInTheDocument(); // Latest Draft revision for RN
    expect(screen.getAllByText("Draft").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("In Review")).toBeInTheDocument();
  });

  it("triggers query when pathway filter buttons are clicked", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationsClient />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000001")).toBeInTheDocument();
    });

    // Click NCLEX-RN filter button
    const rnFilterBtn = screen.getByRole("button", { name: "NCLEX-RN" });
    fireEvent.click(rnFilterBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("pathway=rn"));
    });
  });

  it("triggers query when revision lifecycle filter button is clicked", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationsClient />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000001")).toBeInTheDocument();
    });

    // Click Draft filter pill
    const draftFilterBtn = screen.getByRole("button", { name: "Draft" });
    fireEvent.click(draftFilterBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("revisionStatus=Draft"));
    });
  });

  it("renders access restricted screen when user lacks canViewExaminations capability", async () => {
    mockUser = { id: "cand_999", role: "candidate" };

    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationsClient />
      </QueryClientProvider>
    );

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText(/You do not have administrative permissions/)).toBeInTheDocument();
  });
});
