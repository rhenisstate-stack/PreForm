import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useAuth
const mockCandidateUser = {
  id: "cand_learner_01",
  email: "candidate@prepford.com",
  displayName: "Candidate Learner",
  role: "candidate",
  pathway: "rn",
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockCandidateUser,
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock cart context
vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    itemCount: 0,
    items: [],
  }),
}));

import { DashboardClient } from "@/app/dashboard/page-client";
import { ClientNeedsIntelligenceCard } from "@/components/learner/performance/client-needs-intelligence-card";
import type { CategoryPerformanceIntelligence } from "@/lib/api-services";

describe("Phase 5: Learner Performance Analytics & Client Needs Mastery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.localStorage.clear();
  });

  it("ClientNeedsIntelligenceCard renders Client Needs mastery breakdown and classification badges", async () => {
    const mockCategories: CategoryPerformanceIntelligence[] = [
      { categoryCode: "MOC", categoryName: "Management of Care", pathway: "rn", totalQuestions: 15, correctCount: 12, accuracyPercent: 80.0, averageTimeSeconds: 45, peerBenchmarkAccuracyPercent: 72.0, deltaFromPeerPercent: 8.0, classification: "Strong" },
      { categoryCode: "BCC", categoryName: "Basic Care and Comfort", pathway: "rn", totalQuestions: 4, correctCount: 2, accuracyPercent: 50.0, averageTimeSeconds: 48, peerBenchmarkAccuracyPercent: 68.0, deltaFromPeerPercent: -18.0, classification: "InsufficientData" },
      { categoryCode: "PHA", categoryName: "Pharmacological and Parenteral Therapies", pathway: "rn", totalQuestions: 12, correctCount: 6, accuracyPercent: 50.0, averageTimeSeconds: 52, peerBenchmarkAccuracyPercent: 64.0, deltaFromPeerPercent: -14.0, classification: "NeedsAttention" },
    ];

    render(<ClientNeedsIntelligenceCard categories={mockCategories} pathway="rn" />);

    expect(screen.getByTestId("client-needs-intelligence-card")).toBeInTheDocument();
    expect(screen.getByText("NCLEX Client Needs Category Mastery")).toBeInTheDocument();
    expect(screen.getByText("MOC")).toBeInTheDocument();
    expect(screen.getByText("Management of Care")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("Strong Mastery")).toBeInTheDocument();

    expect(screen.getByText("PHA")).toBeInTheDocument();
    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();
    expect(screen.getByText("Needs Priority Focus")).toBeInTheDocument();

    expect(screen.getByText("BCC")).toBeInTheDocument();
    expect(screen.getByText("Insufficient Data (<5 Qs)")).toBeInTheDocument();
  });

  it("DashboardClient mounts and fetches learner analytics endpoints cleanly", async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/learner/analytics/client-needs")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      }
      if (url.includes("/api/learner/analytics/recommendations")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      }
      if (url.includes("/api/assessments/available")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, assessments: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/assessments/available"));
    });
  });
});
