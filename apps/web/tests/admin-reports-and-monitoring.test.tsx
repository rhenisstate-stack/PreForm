import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth
const mockAdminUser = {
  id: "usr_admin_01",
  email: "admin@prepford.com",
  displayName: "Platform Administrator",
  role: "admin",
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockAdminUser,
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

import { AdminOverviewClient } from "@/app/admin/page-client";
import { AdminReportsClient } from "@/app/admin/reports/page-client";
import { AdminMonitoringClient } from "@/app/admin/monitoring/page-client";

describe("Phase 5: Admin Overview, Reports Studio & System Health Observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("AdminOverviewClient renders PostgreSQL-authoritative platform metrics", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          totalLearners: 1250,
          activeLearners: 840,
          totalQuestions: 4200,
          publishedQuestions: 3800,
          reviewQueueCount: 400,
          publishedExamsCount: 18,
          totalCompletedAttempts: 5600,
          averageCohortScorePercent: 74.2,
          activeEngagementRate: 67.2,
        },
      }),
    });

    render(<AdminOverviewClient />);

    await waitFor(() => {
      expect(screen.getByText("1,250")).toBeInTheDocument(); // Candidate Cohort
      expect(screen.getByText("4,200")).toBeInTheDocument(); // Questions
      expect(screen.getByText("400")).toBeInTheDocument(); // Review queue
      expect(screen.getByText("18")).toBeInTheDocument(); // Published exams
    });

    expect(screen.getByText(/840 active \(67.2% rate\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3800 published across formats/i)).toBeInTheDocument();
    expect(screen.getByText(/5600 completed \(74.2% avg\)/i)).toBeInTheDocument();

    // Quick links to Reports Studio and Monitoring
    expect(screen.getByText(/Reports & Analytics Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Platform System Health/i)).toBeInTheDocument();
  });

  it("AdminReportsClient renders assessment report, decile buckets, and exports CSV", async () => {
    const mockReport = {
      success: true,
      data: {
        totalAttempts: 120,
        completedAttempts: 100,
        abandonedAttempts: 20,
        completionRate: 83.3,
        abandonmentRate: 16.7,
        averageScorePercent: 72.5,
        passRate: 65.0,
        averageDurationMinutes: 52,
        scoreDistribution: [
          { bucketLabel: "0–49%", count: 10, percentage: 10.0 },
          { bucketLabel: "50–59%", count: 15, percentage: 15.0 },
          { bucketLabel: "60–69%", count: 20, percentage: 20.0 },
          { bucketLabel: "70–74%", count: 15, percentage: 15.0 },
          { bucketLabel: "75–79%", count: 20, percentage: 20.0 },
          { bucketLabel: "80–89%", count: 15, percentage: 15.0 },
          { bucketLabel: "90–100%", count: 5, percentage: 5.0 },
        ],
        examinationBreakdowns: [
          {
            examinationId: "fam_01",
            code: "RN-EX-000001",
            title: "Comprehensive RN CAT",
            pathway: "rn",
            totalAttempts: 120,
            completedAttempts: 100,
            averageScorePercent: 72.5,
            passRate: 65.0,
            averageDurationMinutes: 52,
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReport,
    });

    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<AdminReportsClient />);

    await waitFor(() => {
      expect(screen.getAllByText("120")[0]).toBeInTheDocument();
      expect(screen.getAllByText("100")[0]).toBeInTheDocument();
      expect(screen.getByText("83.3%")).toBeInTheDocument();
      expect(screen.getByText("72.5%")).toBeInTheDocument();
      expect(screen.getByText("65%")).toBeInTheDocument();
    });

    expect(screen.getByText("Score Distribution Across Decile Buckets")).toBeInTheDocument();
    expect(screen.getByText("RN-EX-000001")).toBeInTheDocument();
    expect(screen.getByText("Comprehensive RN CAT")).toBeInTheDocument();

    // Trigger CSV export
    const exportBtn = screen.getByTestId("export-assessments-csv-btn");
    fireEvent.click(exportBtn);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/reports/assessments/export"),
      "_blank"
    );
  });

  it("AdminReportsClient switches to question tab, searches, and inspects distractor modal", async () => {
    // Initial assessment fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { totalAttempts: 0, completedAttempts: 0, abandonedAttempts: 0, completionRate: 0, abandonmentRate: 0, averageScorePercent: 0, passRate: 0, averageDurationMinutes: 0, scoreDistribution: [], examinationBreakdowns: [] } }),
    });

    render(<AdminReportsClient />);

    // Switch to questions tab
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          totalCount: 1,
          page: 1,
          pageSize: 50,
          items: [
            {
              questionId: "q_digoxin_01",
              code: "QN-000101",
              stemPreview: "A client exhibits signs of digoxin toxicity. What is the priority nursing intervention?",
              pathway: "rn",
              questionTypeKey: "single-choice",
              difficulty: "Moderate",
              clientNeedCode: "PHA",
              clientNeedName: "Pharmacological Therapies",
              timesDelivered: 45,
              timesAnswered: 40,
              correctResponseCount: 28,
              correctResponseRate: 70.0,
              averageTimeSpentSeconds: 48,
            },
          ],
        },
      }),
    });

    const questionTab = screen.getByTestId("tab-questions");
    fireEvent.click(questionTab);

    await waitFor(() => {
      expect(screen.getByText("QN-000101")).toBeInTheDocument();
      expect(screen.getByText("Pharmacological Therapies")).toBeInTheDocument();
      expect(screen.getByText("70%")).toBeInTheDocument();
    });

    // Mock question detail fetch with distractors
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          questionId: "q_digoxin_01",
          code: "QN-000101",
          stemPreview: "A client exhibits signs of digoxin toxicity. What is the priority nursing intervention?",
          pathway: "rn",
          questionTypeKey: "single-choice",
          difficulty: "Moderate",
          timesAnswered: 40,
          distractorAnalysis: [
            { optionKey: "A", contentPreview: "Check apical pulse", isCorrect: true, selectionCount: 28, selectionRate: 70.0 },
            { optionKey: "B", contentPreview: "Administer potassium", isCorrect: false, selectionCount: 10, selectionRate: 25.0 },
            { optionKey: "C", contentPreview: "Encourage ambulation", isCorrect: false, selectionCount: 2, selectionRate: 5.0 },
          ],
        },
      }),
    });

    const distractorBtn = screen.getByRole("button", { name: /Distractors/i });
    fireEvent.click(distractorBtn);

    await waitFor(() => {
      expect(screen.getByTestId("distractor-modal")).toBeInTheDocument();
      expect(screen.getByText("Item Distractor Analysis: QN-000101")).toBeInTheDocument();
      expect(screen.getByText(/28 selections \(70%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/10 selections \(25%\)/i)).toBeInTheDocument();
    });
  });

  it("AdminMonitoringClient renders live platform health status and latency probe", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          status: "Healthy",
          databaseLatencyMs: 14,
          databaseStatus: "Healthy",
          totalActiveSessions: 32,
          activeUsers: 28,
          serverUptime: "5d 12h 45m",
          committedMemoryMb: 184.2,
          auditEventsLast24Hours: 1540,
          securityIncidentsLast24Hours: 2,
          checkedAt: new Date().toISOString(),
        },
      }),
    });

    render(<AdminMonitoringClient />);

    await waitFor(() => {
      expect(screen.getByText(/Operational Healthy/i)).toBeInTheDocument();
      expect(screen.getByText("14 ms")).toBeInTheDocument();
      expect(screen.getByText("32")).toBeInTheDocument();
      expect(screen.getByText("5d 12h 45m")).toBeInTheDocument();
      expect(screen.getByText("184.2 MB")).toBeInTheDocument();
      expect(screen.getByText("1540")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Probe Health/i })).toBeInTheDocument();
  });
});
