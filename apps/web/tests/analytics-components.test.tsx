import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import {
  AnalyticsKpiCard,
  AnalyticsChartCard,
  ChartLoadingState,
  ChartEmptyState,
  ChartErrorState,
  ChartDateRangeFilter,
  PathwayToggleFilter,
  TrendChart,
  BarComparisonChart,
  DonutDistributionChart,
  HorizontalRankingChart,
  ActivityTimeline,
  BrandedChartTooltip,
} from "@/components/analytics";

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

describe("Analytics UI Primitives & Design System Components", () => {
  describe("AnalyticsKpiCard", () => {
    it("renders title, value, and subtitle correctly", () => {
      render(
        <AnalyticsKpiCard
          title="Active Learners"
          value={1250}
          subtitle="Enrolled in last 30 days"
        />
      );

      expect(screen.getByText("Active Learners")).toBeInTheDocument();
      expect(screen.getByText("1,250")).toBeInTheDocument();
      expect(screen.getByText("Enrolled in last 30 days")).toBeInTheDocument();
    });

    it("renders trend delta badge when changePercent is provided", () => {
      render(
        <AnalyticsKpiCard
          title="Net Revenue"
          value="$45,200"
          changePercent={12.5}
          changeLabel="vs last month"
        />
      );

      expect(screen.getByText("12.5%")).toBeInTheDocument();
      expect(screen.getByText("vs last month")).toBeInTheDocument();
    });

    it("does not render fake trend badge when changePercent is null", () => {
      render(
        <AnalyticsKpiCard
          title="Total Questions"
          value={3400}
          changePercent={null}
          subtitle="Baseline question bank"
        />
      );

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
      expect(screen.getByText("Baseline question bank")).toBeInTheDocument();
    });

    it("renders skeleton loading state when loading is true", () => {
      render(<AnalyticsKpiCard title="Loading Test" value={0} loading={true} />);
      expect(screen.getByTestId("analytics-kpi-card-loading")).toBeInTheDocument();
    });
  });

  describe("AnalyticsChartCard & Chart States", () => {
    it("renders chart card with title, description, and children", () => {
      render(
        <AnalyticsChartCard title="Performance Trajectory" description="Test description">
          <div data-testid="chart-content">Chart Payload</div>
        </AnalyticsChartCard>
      );

      expect(screen.getByText("Performance Trajectory")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
      expect(screen.getByTestId("chart-content")).toBeInTheDocument();
    });

    it("renders loading state when loading is true", () => {
      render(
        <AnalyticsChartCard title="Loading Chart" loading={true}>
          <div>Hidden</div>
        </AnalyticsChartCard>
      );

      expect(screen.getByTestId("chart-loading-state")).toBeInTheDocument();
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    });

    it("renders error state with retry button when error is provided", () => {
      const retryMock = vi.fn();
      render(
        <AnalyticsChartCard title="Error Chart" error="Failed to fetch data" onRetry={retryMock}>
          <div>Hidden</div>
        </AnalyticsChartCard>
      );

      expect(screen.getByTestId("chart-error-state")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch data")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);
      expect(retryMock).toHaveBeenCalledOnce();
    });

    it("renders empty state when empty is true", () => {
      render(
        <AnalyticsChartCard
          title="Empty Chart"
          empty={true}
          emptyTitle="Custom Empty Title"
          emptyDescription="Custom Empty Desc"
        >
          <div>Hidden</div>
        </AnalyticsChartCard>
      );

      expect(screen.getByTestId("chart-empty-state")).toBeInTheDocument();
      expect(screen.getByText("Custom Empty Title")).toBeInTheDocument();
      expect(screen.getByText("Custom Empty Desc")).toBeInTheDocument();
    });
  });

  describe("Chart Filters", () => {
    it("handles date range selection", () => {
      const onSelect = vi.fn();
      render(<ChartDateRangeFilter value="30d" onChange={onSelect} />);

      expect(screen.getByText("30 Days")).toBeInTheDocument();
      const btn7d = screen.getByText("7 Days");
      fireEvent.click(btn7d);
      expect(onSelect).toHaveBeenCalledWith("7d");
    });

    it("handles pathway toggle selection", () => {
      const onToggle = vi.fn();
      render(<PathwayToggleFilter value="all" onChange={onToggle} />);

      const rnBtn = screen.getByText("NCLEX-RN");
      fireEvent.click(rnBtn);
      expect(onToggle).toHaveBeenCalledWith("rn");
    });
  });

  describe("HorizontalRankingChart", () => {
    it("renders ranking items and status badges", () => {
      const items = [
        { label: "Pharmacological & Parenteral Therapies", value: 82, status: "mastered" as const },
        { label: "Management of Care", value: 68, status: "developing" as const },
        { label: "Reduction of Risk Potential", value: 54, status: "needs_improvement" as const },
      ];

      render(<HorizontalRankingChart items={items} benchmark={75} />);

      expect(screen.getByText("Pharmacological & Parenteral Therapies")).toBeInTheDocument();
      expect(screen.getByText("Mastered")).toBeInTheDocument();
      expect(screen.getByText("Developing")).toBeInTheDocument();
      expect(screen.getByText("Focus Area")).toBeInTheDocument();
      expect(screen.getByText("82%")).toBeInTheDocument();
    });

    it("renders empty state if items array is empty", () => {
      render(<HorizontalRankingChart items={[]} emptyMessage="No client needs assessed" />);
      expect(screen.getByText("No client needs assessed")).toBeInTheDocument();
    });
  });

  describe("ActivityTimeline", () => {
    it("renders audit events with category badges and sanitized actor", () => {
      const events = [
        {
          id: 1,
          actor: "Admin (Florence)",
          action: "Published Exam",
          category: "Assessment" as const,
          description: "RN Comprehensive Mock 2026 published to candidate cohort.",
          timestamp: new Date().toISOString(),
        },
      ];

      render(<ActivityTimeline events={events} />);

      expect(screen.getByText("Published Exam")).toBeInTheDocument();
      expect(screen.getByText("Admin (Florence)")).toBeInTheDocument();
      expect(screen.getByText("Assessment")).toBeInTheDocument();
      expect(screen.getByText(/RN Comprehensive Mock 2026/)).toBeInTheDocument();
    });
  });

  describe("Recharts Visualizations Container Renders", () => {
    it("renders TrendChart with data", () => {
      const data = [
        { date: "2026-03-01", score: 65 },
        { date: "2026-03-02", score: 78 },
      ];
      render(
        <TrendChart
          data={data}
          xKey="date"
          series={[{ key: "score", name: "Score", color: "#0D9488" }]}
        />
      );

      expect(screen.getByTestId("trend-chart-container")).toBeInTheDocument();
    });

    it("renders BarComparisonChart with data", () => {
      const data = [
        { name: "Week 1", rn: 40, pn: 25 },
        { name: "Week 2", rn: 55, pn: 30 },
      ];
      render(
        <BarComparisonChart
          data={data}
          xKey="name"
          series={[
            { key: "rn", name: "NCLEX-RN", color: "#142B4A" },
            { key: "pn", name: "NCLEX-PN", color: "#8B5CF6" },
          ]}
        />
      );

      expect(screen.getByTestId("bar-comparison-chart-container")).toBeInTheDocument();
    });

    it("renders DonutDistributionChart with data", () => {
      const data = [
        { name: "Active", value: 120, color: "#10B981" },
        { name: "Suspended", value: 10, color: "#EF4444" },
      ];
      render(<DonutDistributionChart data={data} centerLabel="Total Users" centerValue="130" />);

      expect(screen.getByTestId("donut-chart-container")).toBeInTheDocument();
      expect(screen.getByText("130")).toBeInTheDocument();
      expect(screen.getByText("Total Users")).toBeInTheDocument();
    });
  });
});
