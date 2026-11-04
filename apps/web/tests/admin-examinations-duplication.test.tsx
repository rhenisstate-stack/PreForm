import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminExaminationFamilyClient } from "@/app/admin/examinations/[id]/page-client";

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  refresh: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
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

describe("P3.4 Examination Duplication & Revision Lineage Client UI", () => {
  let queryClient: QueryClient;

  const mockFamilyPublishedOnly = {
    id: "fam_rn_100",
    code: "RN-EX-000100",
    title: "Cardiovascular Nursing Specialization",
    pathway: "rn",
    createdAt: "2026-11-01T10:00:00Z",
    createdBy: "mgr_123",
    currentRevisionId: "rev_pub_1",
    currentRevision: {
      id: "rev_pub_1",
      revisionNumber: 1,
      lifecycleState: "Published",
      questionCount: 50,
      title: "Cardiovascular Nursing Specialization - Rev 1",
    },
    revisions: [
      {
        id: "rev_pub_1",
        revisionNumber: 1,
        lifecycleState: "Published",
        questionCount: 50,
        title: "Cardiovascular Nursing Specialization - Rev 1",
        description: "Foundational cardio examination.",
        timeLimitMinutes: 90,
        passingScorePercent: 75,
        createdAt: "2026-11-01T10:00:00Z",
        publishedAt: "2026-11-02T10:00:00Z",
      },
    ],
  };

  const mockFamilyWithActiveDraft = {
    ...mockFamilyPublishedOnly,
    revisions: [
      ...mockFamilyPublishedOnly.revisions,
      {
        id: "rev_draft_2",
        revisionNumber: 2,
        lifecycleState: "Draft",
        questionCount: 52,
        title: "Cardiovascular Nursing Specialization - Rev 2 Draft",
        description: "Updated cardio revision.",
        timeLimitMinutes: 90,
        passingScorePercent: 75,
        createdAt: "2026-11-03T10:00:00Z",
      },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockNotifySuccess.mockReset();
    mockNotifyError.mockReset();
  });

  it("renders family view with action buttons and allows creating new revision when no active draft exists", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/examinations/fam_rn_100")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, examination: mockFamilyPublishedOnly }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationFamilyClient id="fam_rn_100" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000100")).toBeInTheDocument();
      expect(screen.getByText("Cardiovascular Nursing Specialization")).toBeInTheDocument();
    });

    const newRevBtn = screen.getByRole("button", { name: /Create New Revision/i });
    expect(newRevBtn).toBeEnabled();

    const dupBtn = screen.getByRole("button", { name: /Duplicate as New Examination/i });
    expect(dupBtn).toBeEnabled();
  });

  it("disables Create New Revision when an active draft already exists but keeps Duplicate enabled", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/examinations/fam_rn_100")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, examination: mockFamilyWithActiveDraft }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationFamilyClient id="fam_rn_100" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000100")).toBeInTheDocument();
      expect(screen.getByText("An active draft already exists for this family.")).toBeInTheDocument();
    });

    const newRevBtn = screen.getByRole("button", { name: /Create New Revision/i });
    expect(newRevBtn).toBeDisabled();

    // Duplicating family is still permitted even when source has draft
    const dupBtn = screen.getByRole("button", { name: /Duplicate as New Examination/i });
    expect(dupBtn).toBeEnabled();
  });

  it("opens Create New Revision modal, displays source revision selection, and submits payload", async () => {
    let revisionCreatedPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/admin/examinations/fam_rn_100/revisions") && init?.method === "POST") {
        revisionCreatedPayload = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              revision: { id: "rev_draft_2", revisionNumber: 2 },
            }),
        });
      }
      if (url.includes("/api/admin/examinations/fam_rn_100")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, examination: mockFamilyPublishedOnly }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationFamilyClient id="fam_rn_100" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000100")).toBeInTheDocument();
    });

    // Click Create New Revision
    const newRevBtn = screen.getByRole("button", { name: /Create New Revision/i });
    fireEvent.click(newRevBtn);

    // Dialog opens
    expect(screen.getByText("Create New Draft Revision")).toBeInTheDocument();
    expect(screen.getByText(/Family Identity Preserved/i)).toBeInTheDocument();

    // Submit revision
    const submitBtn = screen.getByRole("button", { name: /Create Draft/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(revisionCreatedPayload).not.toBeNull();
      expect(revisionCreatedPayload.sourceRevisionId).toBe("rev_pub_1");
      expect(revisionCreatedPayload.copyQuestions).toBe(true);
      expect(mockNotifySuccess).toHaveBeenCalledWith("New draft revision created.");
      expect(mockPush).toHaveBeenCalledWith("/admin/examinations/fam_rn_100/revisions/rev_draft_2");
    });
  });

  it("opens Duplicate as New Examination modal, displays independent family explanation, and submits duplication", async () => {
    let duplicationPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/admin/examinations/fam_rn_100/duplicate") && init?.method === "POST") {
        duplicationPayload = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              examinationId: "fam_rn_999",
              examinationCode: "RN-EX-000101",
              revisionId: "rev_new_1",
              revisionNumber: 1,
            }),
        });
      }
      if (url.includes("/api/admin/examinations/fam_rn_100")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, examination: mockFamilyPublishedOnly }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationFamilyClient id="fam_rn_100" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000100")).toBeInTheDocument();
    });

    // Click Duplicate
    const dupBtn = screen.getByRole("button", { name: /Duplicate as New Examination/i });
    fireEvent.click(dupBtn);

    // Modal opens
    expect(screen.getByText("Duplicate as New Examination Family")).toBeInTheDocument();
    expect(screen.getByText("Independent Identity & Clean Lineage")).toBeInTheDocument();
    expect(screen.getByText(/0 attempts/i)).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/New Examination Family Title \*/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Cardiovascular Nursing Specialization (Copy)");

    // Submit duplication
    const submitDupBtn = screen.getByRole("button", { name: /Duplicate Examination/i });
    fireEvent.click(submitDupBtn);

    await waitFor(() => {
      expect(duplicationPayload).not.toBeNull();
      expect(duplicationPayload.title).toBe("Cardiovascular Nursing Specialization (Copy)");
      expect(duplicationPayload.sourceRevisionId).toBe("rev_pub_1");
      expect(mockNotifySuccess).toHaveBeenCalledWith("Examination duplicated as RN-EX-000101.");
      expect(mockPush).toHaveBeenCalledWith("/admin/examinations/fam_rn_999");
    });
  });

  it("handles duplicate API error and notifies user", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/admin/examinations/fam_rn_100/duplicate") && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              error: "Source revision is not eligible for duplication.",
            }),
        });
      }
      if (url.includes("/api/admin/examinations/fam_rn_100")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, examination: mockFamilyPublishedOnly }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationFamilyClient id="fam_rn_100" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("RN-EX-000100")).toBeInTheDocument();
    });

    const dupBtn = screen.getByRole("button", { name: /Duplicate as New Examination/i });
    fireEvent.click(dupBtn);

    const submitDupBtn = screen.getByRole("button", { name: /Duplicate Examination/i });
    fireEvent.click(submitDupBtn);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith("Source revision is not eligible for duplication.");
    });
  });
});
