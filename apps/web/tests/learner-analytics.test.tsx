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

describe("Phase 5: Learner Performance Analytics & Client Needs Mastery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    window.localStorage.clear();
  });

  it("DashboardClient renders Client Needs mastery breakdown and targeted recommendations", async () => {
    const mockClientNeeds = [
      { categoryCode: "MOC", categoryName: "Management of Care", totalAssessedQuestions: 15, correctCount: 12, accuracyPercent: 80.0, isLowSample: false, performanceTier: "Very High" },
      { categoryCode: "SIC", categoryName: "Safety and Infection Control", totalAssessedQuestions: 8, correctCount: 6, accuracyPercent: 75.0, isLowSample: false, performanceTier: "Very High" },
      { categoryCode: "HPM", categoryName: "Health Promotion and Maintenance", totalAssessedQuestions: 10, correctCount: 7, accuracyPercent: 70.0, isLowSample: false, performanceTier: "High" },
      { categoryCode: "PSI", categoryName: "Psychosocial Integrity", totalAssessedQuestions: 6, correctCount: 4, accuracyPercent: 66.7, isLowSample: false, performanceTier: "High" },
      { categoryCode: "BCC", categoryName: "Basic Care and Comfort", totalAssessedQuestions: 4, correctCount: 2, accuracyPercent: 50.0, isLowSample: true, performanceTier: "Low" },
      { categoryCode: "PHA", categoryName: "Pharmacological and Parenteral Therapies", totalAssessedQuestions: 12, correctCount: 6, accuracyPercent: 50.0, isLowSample: false, performanceTier: "Low" },
      { categoryCode: "RRP", categoryName: "Reduction of Risk Potential", totalAssessedQuestions: 5, correctCount: 3, accuracyPercent: 60.0, isLowSample: false, performanceTier: "Borderline" },
      { categoryCode: "PPT", categoryName: "Physiological Adaptation", totalAssessedQuestions: 0, correctCount: 0, accuracyPercent: 0, isLowSample: false, performanceTier: "Unassessed" },
    ];

    const mockRecommendations = [
      {
        id: "rec-pha",
        title: "Targeted Remediation: Pharmacological Therapies",
        description: "Your accuracy in Pharmacological Therapies is 50.0%. Targeted practice in medication administration and IV calculations is recommended.",
        category: "Remediation",
        priority: "High",
        targetClientNeedCode: "PHA",
        actionHref: "/dashboard?clientNeed=PHA",
      },
      {
        id: "rec-ppt",
        title: "Establish Baseline: Physiological Adaptation",
        description: "You have not yet completed questions in Physiological Adaptation. Complete questions in this domain to ensure balanced test-plan readiness.",
        category: "Practice",
        priority: "Medium",
        targetClientNeedCode: "PPT",
        actionHref: "/dashboard?clientNeed=PPT",
      },
    ];

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/learner/analytics/client-needs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: mockClientNeeds }),
        });
      }
      if (url.includes("/api/learner/analytics/recommendations")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: mockRecommendations }),
        });
      }
      if (url.includes("/api/assessments/available")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, assessments: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    render(<DashboardClient />);

    // Verify Client Needs section renders
    await waitFor(() => {
      expect(screen.getByTestId("client-needs-mastery-section")).toBeInTheDocument();
      expect(screen.getByText("NCSBN Client Needs Category Mastery")).toBeInTheDocument();
    });

    // Check canonical categories
    expect(screen.getByText("MOC")).toBeInTheDocument();
    expect(screen.getByText("Management of Care")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();

    expect(screen.getByText("PHA")).toBeInTheDocument();
    expect(screen.getByText("Pharmacological and Parenteral Therapies")).toBeInTheDocument();

    expect(screen.getByText("BCC")).toBeInTheDocument();
    expect(screen.getByText("< 5 items")).toBeInTheDocument(); // Low sample badge

    expect(screen.getByText("PPT")).toBeInTheDocument();
    expect(screen.getByText("Unassessed")).toBeInTheDocument();

    // Verify Study Recommendations section renders
    await waitFor(() => {
      expect(screen.getByTestId("study-recommendations-section")).toBeInTheDocument();
      expect(screen.getByText("Targeted Remediation: Pharmacological Therapies")).toBeInTheDocument();
      expect(screen.getByText("Establish Baseline: Physiological Adaptation")).toBeInTheDocument();
      expect(screen.getByText("High Priority")).toBeInTheDocument();
    });
  });
});
