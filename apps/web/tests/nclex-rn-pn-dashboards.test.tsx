import * as React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: mockRefresh,
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/nclex-rn",
  useSearchParams: () => new URLSearchParams(),
}));

let mockAuthState = {
  user: null as null | {
    id: string;
    email: string;
    name: string;
    displayName: string;
    role: string;
    pathway: "rn" | "pn" | "both";
    activePlan?: string;
    targetExamDate?: string;
  },
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
};

let mockCartState = {
  items: [] as Array<{ id: string; product: { id: string; name: string } }>,
  itemCount: 0,
  subtotal: 0,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => mockCartState,
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { NCLEXRNPageClient } from "@/app/nclex-rn/page-client";
import { NCLEXPNPageClient } from "@/app/nclex-pn/page-client";
import { DashboardClient } from "@/app/dashboard/page-client";
import NCLEXRNDashboardPage from "@/app/dashboard/rn/page";
import NCLEXPNDashboardPage from "@/app/dashboard/pn/page";

describe("Phase 9 & 10: NCLEX-RN and NCLEX-PN Landing Page CTAs & Distinct Dashboards", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    };
    mockCartState = {
      items: [],
      itemCount: 0,
      subtotal: 0,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
    };
  });

  // =========================================================================
  // PHASE 9 TESTS: PUBLIC LANDING PAGE CTAs & AUTHENTICATION-AWARE NAVIGATION
  // =========================================================================
  describe("9.2 & 9.4 NCLEX-RN Public Landing Page CTA", () => {
    it("renders the prominent RN Learner Dashboard CTA in hero with supporting text", () => {
      render(<NCLEXRNPageClient />);

      const hero = screen.getByTestId("nclex-rn-hero");
      const ctaBtn = within(hero).getByTestId("rn-hero-dashboard-cta");
      expect(ctaBtn).toBeInTheDocument();
      expect(ctaBtn).toHaveTextContent(/Go to RN Learner Dashboard/i);

      expect(
        within(hero).getByText(
          /Continue your NCLEX-RN preparation, track your progress, and access your learning tools\./i
        )
      ).toBeInTheDocument();

      // Preserves secondary marketing actions
      expect(within(hero).getByRole("link", { name: /Explore Study Plans/i })).toBeInTheDocument();
      expect(within(hero).getByRole("link", { name: /Explore Study Guide/i })).toBeInTheDocument();
      expect(within(hero).getByRole("link", { name: /Try Free Sample Question/i })).toBeInTheDocument();
    });

    it("redirects unauthenticated visitor to /sign-in preserving RN destination", async () => {
      render(<NCLEXRNPageClient />);

      const ctaBtn = screen.getByTestId("rn-hero-dashboard-cta");
      fireEvent.click(ctaBtn);

      expect(mockPush).toHaveBeenCalledWith("/sign-in?from=%2Fdashboard%2Frn");
    });

    it("navigates authenticated learner directly to /dashboard/rn", async () => {
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        user: {
          id: "rn-learner-1",
          email: "alex.rn@prepford.com",
          name: "Alex Nurse",
          displayName: "Alex Nurse, BSN",
          role: "candidate",
          pathway: "rn",
        },
      };

      render(<NCLEXRNPageClient />);

      const ctaBtn = screen.getByTestId("rn-hero-dashboard-cta");
      fireEvent.click(ctaBtn);

      expect(mockPush).toHaveBeenCalledWith("/dashboard/rn");
    });
  });

  describe("9.3 & 9.4 NCLEX-PN Public Landing Page CTA", () => {
    it("renders the prominent PN Learner Dashboard CTA in hero with supporting text", () => {
      render(<NCLEXPNPageClient />);

      const hero = screen.getByTestId("nclex-pn-hero");
      const ctaBtn = within(hero).getByTestId("pn-hero-dashboard-cta");
      expect(ctaBtn).toBeInTheDocument();
      expect(ctaBtn).toHaveTextContent(/Go to PN Learner Dashboard/i);

      expect(
        within(hero).getByText(
          /Continue your NCLEX-PN preparation, monitor your progress, and build your practical nursing confidence\./i
        )
      ).toBeInTheDocument();

      // Preserves secondary marketing actions
      expect(within(hero).getByRole("link", { name: /Explore Study Plans/i })).toBeInTheDocument();
      expect(within(hero).getByRole("link", { name: /Explore Study Guide/i })).toBeInTheDocument();
      expect(within(hero).getByRole("link", { name: /Try Free Sample Question/i })).toBeInTheDocument();
    });

    it("redirects unauthenticated visitor to /sign-in preserving PN destination", async () => {
      render(<NCLEXPNPageClient />);

      const ctaBtn = screen.getByTestId("pn-hero-dashboard-cta");
      fireEvent.click(ctaBtn);

      expect(mockPush).toHaveBeenCalledWith("/sign-in?from=%2Fdashboard%2Fpn");
    });

    it("navigates authenticated learner directly to /dashboard/pn", async () => {
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        user: {
          id: "pn-learner-1",
          email: "jordan.pn@prepford.com",
          name: "Jordan Practical",
          displayName: "Jordan Practical, LPN",
          role: "candidate",
          pathway: "pn",
        },
      };

      render(<NCLEXPNPageClient />);

      const ctaBtn = screen.getByTestId("pn-hero-dashboard-cta");
      fireEvent.click(ctaBtn);

      expect(mockPush).toHaveBeenCalledWith("/dashboard/pn");
    });
  });

  // =========================================================================
  // PHASE 10 TESTS: DISTINCT NCLEX-RN AND NCLEX-PN LEARNER DASHBOARDS
  // =========================================================================
  describe("10.2 & 10.4 Dedicated NCLEX-RN Learner Dashboard (/dashboard/rn)", () => {
    beforeEach(() => {
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        user: {
          id: "candidate-rn",
          email: "alex.rn@prepford.com",
          name: "Alex Morgan",
          displayName: "Alex Morgan, BSN",
          role: "candidate",
          pathway: "rn",
          activePlan: "NCLEX-RN Complete Preparation",
        },
      };
    });

    it("renders the dedicated NCLEX-RN dashboard identity, clinical judgment hero, and NCJMM framework", () => {
      render(<NCLEXRNDashboardPage />);

      expect(screen.getByTestId("nclex-rn-dashboard-view")).toBeInTheDocument();
      expect(screen.getByTestId("rn-dashboard-identity-heading")).toHaveTextContent(
        "NCLEX-RN LEARNER DASHBOARD"
      );
      expect(screen.getByTestId("rn-dashboard-badge")).toHaveTextContent("NCLEX-RN Candidate Workspace");

      // Verify NGN NCJMM Layer 3 Decision Framework is present
      const ncjmm = screen.getByTestId("rn-ncjmm-framework");
      expect(ncjmm).toBeInTheDocument();
      expect(within(ncjmm).getByText("Recognize Cues")).toBeInTheDocument();
      expect(within(ncjmm).getByText("Prioritize Hypotheses")).toBeInTheDocument();
      expect(within(ncjmm).getByText("Take Action")).toBeInTheDocument();

      // Verify acute care telemetry pill
      expect(screen.getByText(/LEAD II ECG: 72 BPM/i)).toBeInTheDocument();

      // Verify high-acuity RN clinical priority guidelines
      const pearls = screen.getByTestId("rn-clinical-pearls");
      expect(pearls).toBeInTheDocument();
      expect(within(pearls).getByText(/RN Delegation Governance/i)).toBeInTheDocument();
      expect(within(pearls).getByText(/High-Alert IV Infusions/i)).toBeInTheDocument();

      // Verify breadcrumb shows RN context
      const breadcrumbs = screen.getByTestId("dashboard-breadcrumbs");
      expect(within(breadcrumbs).getByText("NCLEX-RN")).toBeInTheDocument();
      expect(within(breadcrumbs).getByText("RN Learner Dashboard")).toBeInTheDocument();
    });

    it("provides quick action buttons to Create RN Practice Test and Take RN Readiness (RAT)", () => {
      render(<NCLEXRNDashboardPage />);

      const createTestBtn = screen.getByTestId("rn-hero-create-test-btn");
      expect(createTestBtn).toHaveTextContent(/Create RN Practice Test/i);

      const ratBtn = screen.getByTestId("rn-hero-rat-btn");
      expect(ratBtn).toHaveTextContent(/Take RN Readiness \(RAT\)/i);

      // Clicking Create RN Practice Test opens the shared assessment generator modal
      fireEvent.click(createTestBtn);
      expect(screen.getByTestId("modal-create-test")).toBeInTheDocument();
    });

    it("provides deliberate pathway switcher to switch to NCLEX-PN dashboard", () => {
      render(<NCLEXRNDashboardPage />);

      const switchBtn = screen.getByTestId("rn-deliberate-switch-to-pn");
      expect(switchBtn).toHaveTextContent(/Switch to NCLEX-PN Dashboard/i);

      fireEvent.click(switchBtn);
      expect(mockPush).toHaveBeenCalledWith("/dashboard/pn");
    });
  });

  describe("10.3 & 10.4 Dedicated NCLEX-PN Learner Dashboard (/dashboard/pn)", () => {
    beforeEach(() => {
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        user: {
          id: "candidate-pn",
          email: "jordan.pn@prepford.com",
          name: "Jordan Lee",
          displayName: "Jordan Lee, LPN",
          role: "candidate",
          pathway: "pn",
          activePlan: "NCLEX-PN Practical Mastery",
        },
      };
    });

    it("renders the dedicated NCLEX-PN dashboard identity, bedside procedures hero, and procedural workflow", () => {
      render(<NCLEXPNDashboardPage />);

      expect(screen.getByTestId("nclex-pn-dashboard-view")).toBeInTheDocument();
      expect(screen.getByTestId("pn-dashboard-identity-heading")).toHaveTextContent(
        "NCLEX-PN LEARNER DASHBOARD"
      );
      expect(screen.getByTestId("pn-dashboard-badge")).toHaveTextContent("NCLEX-PN Candidate Workspace");

      // Verify Practical Nursing Procedural Workflow is present
      const workflow = screen.getByTestId("pn-procedural-workflow");
      expect(workflow).toBeInTheDocument();
      expect(within(workflow).getByText("Focused Data Collection")).toBeInTheDocument();
      expect(within(workflow).getByText("Critical Cue Escalation")).toBeInTheDocument();
      expect(within(workflow).getByText("Safe Interventions")).toBeInTheDocument();

      // Verify bedside vitals telemetry pill
      expect(screen.getByText(/BEDSIDE VITALS: RR 16 \/ MIN/i)).toBeInTheDocument();

      // Verify bedside safety pearls
      const pearls = screen.getByTestId("pn-bedside-pearls");
      expect(pearls).toBeInTheDocument();
      expect(within(pearls).getByText(/6 Rights of Medication/i)).toBeInTheDocument();
      expect(within(pearls).getByText(/Aseptic Wound & Catheter Care/i)).toBeInTheDocument();

      // Verify breadcrumb shows PN context
      const breadcrumbs = screen.getByTestId("dashboard-breadcrumbs");
      expect(within(breadcrumbs).getByText("NCLEX-PN")).toBeInTheDocument();
      expect(within(breadcrumbs).getByText("PN Learner Dashboard")).toBeInTheDocument();
    });

    it("provides quick action buttons to Create PN Practice Test and Take PN Readiness (RAT)", () => {
      render(<NCLEXPNDashboardPage />);

      const createTestBtn = screen.getByTestId("pn-hero-create-test-btn");
      expect(createTestBtn).toHaveTextContent(/Create PN Practice Test/i);

      const ratBtn = screen.getByTestId("pn-hero-rat-btn");
      expect(ratBtn).toHaveTextContent(/Take PN Readiness \(RAT\)/i);

      // Clicking Take PN Readiness opens the shared assessment generator modal
      fireEvent.click(ratBtn);
      expect(screen.getByTestId("modal-create-test")).toBeInTheDocument();
    });

    it("provides deliberate pathway switcher to switch to NCLEX-RN dashboard", () => {
      render(<NCLEXPNDashboardPage />);

      const switchBtn = screen.getByTestId("pn-deliberate-switch-to-rn");
      expect(switchBtn).toHaveTextContent(/Switch to NCLEX-RN Dashboard/i);

      fireEvent.click(switchBtn);
      expect(mockPush).toHaveBeenCalledWith("/dashboard/rn");
    });
  });

  // =========================================================================
  // FUNCTIONALITY PARITY & ENTITLEMENT ENFORCEMENT
  // =========================================================================
  describe("10.5 & 10.8 Functionality Parity & Entitlement Enforcement", () => {
    it("enforces entitlement notice when an RN-only candidate tries to access /dashboard/pn", () => {
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        user: {
          id: "candidate-rn-only",
          email: "alex@prepford.com",
          name: "Alex Morgan",
          displayName: "Alex Morgan, BSN",
          role: "candidate",
          pathway: "rn",
        },
      };

      render(<DashboardClient lockedPathway="pn" />);

      const blockedNotice = screen.getByTestId("dashboard-entitlement-blocked");
      expect(blockedNotice).toBeInTheDocument();
      expect(
        within(blockedNotice).getByRole("heading", { name: /NCLEX-PN Entitlement Required/i })
      ).toBeInTheDocument();
      expect(
        within(blockedNotice).getByRole("link", { name: /Return to NCLEX-RN Dashboard/i })
      ).toHaveAttribute("href", "/dashboard/rn");
    });

    it("enforces entitlement notice when a PN-only candidate tries to access /dashboard/rn", () => {
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        user: {
          id: "candidate-pn-only",
          email: "jordan@prepford.com",
          name: "Jordan Lee",
          displayName: "Jordan Lee, LPN",
          role: "candidate",
          pathway: "pn",
        },
      };

      render(<DashboardClient lockedPathway="rn" />);

      const blockedNotice = screen.getByTestId("dashboard-entitlement-blocked");
      expect(blockedNotice).toBeInTheDocument();
      expect(
        within(blockedNotice).getByRole("heading", { name: /NCLEX-RN Entitlement Required/i })
      ).toBeInTheDocument();
      expect(
        within(blockedNotice).getByRole("link", { name: /Return to NCLEX-PN Dashboard/i })
      ).toHaveAttribute("href", "/dashboard/pn");
    });

    it("allows dual-access candidates (pathway: 'both') to access both /dashboard/rn and /dashboard/pn", () => {
      mockAuthState = {
        ...mockAuthState,
        isAuthenticated: true,
        user: {
          id: "candidate-dual",
          email: "dual@prepford.com",
          name: "Taylor Dual",
          displayName: "Taylor Dual, RN",
          role: "candidate",
          pathway: "both",
        },
      };

      const { unmount } = render(<DashboardClient lockedPathway="rn" />);
      expect(screen.getByTestId("nclex-rn-dashboard-view")).toBeInTheDocument();
      unmount();

      render(<DashboardClient lockedPathway="pn" />);
      expect(screen.getByTestId("nclex-pn-dashboard-view")).toBeInTheDocument();
    });

    it("preserves unauthenticated sign-in link destination when visiting /dashboard/rn and /dashboard/pn", () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      };

      const { unmount } = render(<DashboardClient lockedPathway="rn" />);
      const rnSignInLink = screen.getByRole("link", { name: /Sign In to Workspace/i });
      expect(rnSignInLink).toHaveAttribute("href", "/sign-in?from=/dashboard/rn");
      unmount();

      render(<DashboardClient lockedPathway="pn" />);
      const pnSignInLink = screen.getByRole("link", { name: /Sign In to Workspace/i });
      expect(pnSignInLink).toHaveAttribute("href", "/sign-in?from=/dashboard/pn");
    });
  });
});
