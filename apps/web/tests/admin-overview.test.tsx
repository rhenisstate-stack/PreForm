import * as React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminOverviewClient } from "@/app/admin/page-client";

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

let mockUser: { role: string; displayName?: string; email?: string } | null = {
  role: "superadmin",
  displayName: "System Administrator",
  email: "admin@prepford.com",
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const mockOverviewData = {
  success: true,
  data: {
    kpis: {
      totalUsers: 1420,
      activeUsers: 890,
      newRegistrations: 140,
      totalRnLearners: 980,
      totalPnLearners: 440,
      totalExaminations: 24,
      examinationAttempts: 3200,
      completedExaminations: 2950,
      totalQuestions: 4500,
      publishedStudyResources: 48,
      activeSubscriptions: 820,
      netSubscriptionRevenue: 48500.0,
      grossCollectedRevenue: 51200.0,
      totalRefunds: 2700.0,
      pendingOperationalTasks: 18,
    },
    deltas: {
      userGrowthPercent: 14.5,
      attemptsGrowthPercent: 22.1,
      revenueGrowthPercent: 18.2,
      periodLabel: "vs prior 30 days",
    },
    calculatedAt: "2026-11-08T12:00:00Z",
  },
};

describe("AdminOverviewClient Master Dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/analytics/overview")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOverviewData),
        });
      }
      if (url.includes("/api/admin/analytics/users")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                registrationTrends: [{ date: "2026-11-01", label: "Nov 01", newUsers: 15, rnLearners: 10, pnLearners: 5, cumulativeTotal: 100 }],
                pathwayDistribution: { rnCount: 980, pnCount: 440, bothCount: 0, rnPercent: 69, pnPercent: 31 },
                engagementMetrics: { dailyActiveUsers: 120, weeklyActiveUsers: 540, monthlyActiveUsers: 890, engagementRatePercent: 62.7 },
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  it("renders executive KPI summary cards with PostgreSQL authoritative data", async () => {
    render(<AdminOverviewClient />);

    expect(screen.getByTestId("admin-overview-page")).toBeInTheDocument();
    const metricsGrid = screen.getByTestId("admin-overview-metrics");
    expect(metricsGrid).toBeInTheDocument();

    await waitFor(() => {
      const utils = within(metricsGrid);
      expect(utils.getByText("1,420")).toBeInTheDocument();
      expect(utils.getByText("4,500")).toBeInTheDocument();
      expect(utils.getByText("980")).toBeInTheDocument();
      expect(utils.getByText("440")).toBeInTheDocument();
      expect(utils.getByText("$48,500.00")).toBeInTheDocument();
    });
  });

  it("renders operational tabs and allows switching views", async () => {
    render(<AdminOverviewClient />);

    expect(screen.getByRole("button", { name: /Consolidated Ecosystem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exam Operations/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Content & Curriculum/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review Queues/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Instructor Cohorts/i })).toBeInTheDocument();

    // Switch to Exam Operations
    fireEvent.click(screen.getByRole("button", { name: /Exam Operations/i }));
    await waitFor(() => {
      expect(screen.getByTestId("exam-manager-view")).toBeInTheDocument();
    });

    // Switch to Content Operations
    fireEvent.click(screen.getByRole("button", { name: /Content & Curriculum/i }));
    await waitFor(() => {
      expect(screen.getByTestId("content-manager-view")).toBeInTheDocument();
    });

    // Switch to Review Queues
    fireEvent.click(screen.getByRole("button", { name: /Review Queues/i }));
    await waitFor(() => {
      expect(screen.getByTestId("reviewer-view")).toBeInTheDocument();
    });

    // Switch to Instructor Cohorts
    fireEvent.click(screen.getByRole("button", { name: /Instructor Cohorts/i }));
    await waitFor(() => {
      expect(screen.getByTestId("instructor-view")).toBeInTheDocument();
    });
  });

  it("renders date range filter and pathway toggle", async () => {
    render(<AdminOverviewClient />);

    expect(screen.getByText("30 Days")).toBeInTheDocument();
    expect(screen.getByText("All Pathways")).toBeInTheDocument();
  });
});
