import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardClient, RECENT_ACTIVITY_STORAGE_KEY } from "@/app/dashboard/page-client";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";

let mockAuthState = {
  user: null as null | {
    id: string;
    email: string;
    name: string;
    displayName: string;
    role: string;
    pathway: "rn" | "pn";
    activePlan?: string;
    targetExamDate?: string;
  },
  isAuthenticated: false,
  isLoading: false,
};

let mockCartState = {
  items: [] as Array<{ id: string; product: { id: string; name: string } }>,
  itemCount: 0,
  subtotal: 0,
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => mockCartState,
}));

describe("PrepFord Learner Dashboard (/dashboard)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
    mockCartState = {
      items: [],
      itemCount: 0,
      subtotal: 0,
    };
  });

  it("renders a clear unauthenticated state with a sign-in link returning to /dashboard", () => {
    render(<DashboardClient />);

    const unauthContainer = screen.getByTestId("dashboard-unauthenticated");
    expect(unauthContainer).toBeInTheDocument();
    expect(
      within(unauthContainer).getByRole("heading", { name: /Sign In Required/i })
    ).toBeInTheDocument();

    const signInLink = within(unauthContainer).getByRole("link", {
      name: /Sign In to Workspace/i,
    });
    expect(signInLink).toHaveAttribute("href", "/sign-in?from=/dashboard");
  });

  it("renders welcome header, active pathway, real user details, and fallback 'Explore study materials' CTA when no recent activity exists", () => {
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex Morgan",
        displayName: "Alex Morgan, BSN",
        role: "candidate",
        pathway: "rn",
        activePlan: "NCLEX-RN Complete Preparation",
        targetExamDate: "2026-11-30",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    const welcomeHeader = screen.getByTestId("dashboard-welcome-header");
    expect(
      within(welcomeHeader).getByRole("heading", {
        name: /Welcome back, Alex Morgan, BSN\./i,
      })
    ).toBeInTheDocument();
    expect(within(welcomeHeader).getByText(/NCLEX-RN Focus/i)).toBeInTheDocument();
    expect(within(welcomeHeader).getByText(/NCLEX-RN Complete Preparation/i)).toBeInTheDocument();

    const exploreCta = screen.getByTestId("dashboard-primary-cta-explore");
    expect(exploreCta).toHaveAttribute("href", "/study-guide");
    expect(screen.queryByTestId("dashboard-primary-cta-continue")).not.toBeInTheDocument();
  });

  it("renders 'Continue studying' primary CTA when a real recent study activity exists in localStorage", () => {
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex Morgan",
        displayName: "Alex Morgan",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    localStorage.setItem(
      RECENT_ACTIVITY_STORAGE_KEY,
      JSON.stringify({
        title: "Pharmacological & Parenteral Therapies",
        categoryTitle: "Physiological Integrity",
        href: "/study-guide/pharmacology",
        pathway: "rn",
        visitedAt: new Date().toISOString(),
      })
    );

    render(<DashboardClient />);

    const continueCta = screen.getByTestId("dashboard-primary-cta-continue");
    expect(continueCta).toBeInTheDocument();
    expect(continueCta).toHaveAttribute("href", "/study-guide/pharmacology");
    expect(
      within(continueCta).getByText(
        /Continue studying: Pharmacological & Parenteral Therapies/i
      )
    ).toBeInTheDocument();
  });

  it("renders 4 clear study launchpad actions for RN, PN, Study Guides, and Practice", () => {
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    const launchpad = screen.getByTestId("dashboard-primary-actions");
    expect(within(launchpad).getByRole("heading", { name: "NCLEX-RN Preparation" })).toBeInTheDocument();
    expect(within(launchpad).getByRole("heading", { name: "NCLEX-PN Preparation" })).toBeInTheDocument();
    expect(within(launchpad).getByRole("heading", { name: "Nursing Study Guides" })).toBeInTheDocument();
    expect(within(launchpad).getByRole("heading", { name: "Practice & Course Finder" })).toBeInTheDocument();

    expect(within(launchpad).getByRole("link", { name: /Open NCLEX-RN Hub/i })).toHaveAttribute("href", "/nclex-rn");
    expect(within(launchpad).getByRole("link", { name: /Open NCLEX-PN Hub/i })).toHaveAttribute("href", "/nclex-pn");
    expect(within(launchpad).getByRole("link", { name: /Browse Study Guides/i })).toHaveAttribute("href", "/study-guide");
    expect(within(launchpad).getByRole("link", { name: /Open Practice & Courses/i })).toHaveAttribute("href", "/courses");
  });

  it("does not display fabricated scores or pass predictions, and provides transparent telemetry status", () => {
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    // Zero fake telemetry
    expect(screen.queryByText(/1,098 \/ 1,840/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/High Pass Signal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/6 Days/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Review 48 Missed Concepts/i)).not.toBeInTheDocument();

    const disclosure = screen.getByTestId("dashboard-telemetry-disclosure");
    expect(disclosure).toBeInTheDocument();
    expect(
      within(disclosure).getByText(/PrepFord does not display fabricated personal scores or exam pass predictions/i)
    ).toBeInTheDocument();
  });

  it("renders all 7 real Study Guide domains and quick navigation links", () => {
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    const domainsSection = screen.getByTestId("dashboard-study-domains");
    for (const cat of STUDY_GUIDE_CATEGORIES) {
      const card = within(domainsSection).getByTestId(`dashboard-domain-${cat.slug}`);
      expect(card).toBeInTheDocument();
      expect(within(card).getByRole("heading", { name: cat.title })).toBeInTheDocument();
      expect(within(card).getByRole("link", { name: /Study Domain/i })).toHaveAttribute(
        "href",
        `/study-guide/${cat.slug}`
      );
    }

    const quickNav = screen.getByTestId("dashboard-quick-nav");
    expect(within(quickNav).getByRole("link", { name: /Account & Profile/i })).toHaveAttribute("href", "/profile");
    expect(within(quickNav).getByRole("link", { name: /All Study Plans/i })).toHaveAttribute("href", "/subscriptions");
    expect(within(quickNav).getByRole("link", { name: /Cart \(0\)/i })).toHaveAttribute("href", "/cart");
    expect(within(quickNav).getByRole("link", { name: /Learner FAQ/i })).toHaveAttribute("href", "/faq");
    expect(within(quickNav).getByRole("link", { name: /Contact Support/i })).toHaveAttribute("href", "/contact");
  });

  it("supports switching pathways between NCLEX-RN and NCLEX-PN", async () => {
    const user = userEvent.setup();
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    const rnBtn = screen.getByTestId("dashboard-pathway-rn");
    const pnBtn = screen.getByTestId("dashboard-pathway-pn");

    expect(rnBtn).toHaveAttribute("aria-pressed", "true");
    expect(pnBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(pnBtn);
    expect(pnBtn).toHaveAttribute("aria-pressed", "true");
    expect(rnBtn).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/NCLEX-PN Focus/i)).toBeInTheDocument();
  });

  it("renders persistent dark teal sidebar with grouped navigation and collapse control", async () => {
    const user = userEvent.setup();
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    const sidebar = screen.getByTestId("learner-sidebar");
    expect(sidebar).toBeInTheDocument();

    // Verify navigation groups
    expect(within(sidebar).getByText(/^Learn$/i)).toBeInTheDocument();
    expect(within(sidebar).getByText(/^Test Bank & Assessments$/i)).toBeInTheDocument();
    expect(within(sidebar).getByText(/^Reports$/i)).toBeInTheDocument();
    expect(within(sidebar).getByText(/^Account$/i)).toBeInTheDocument();

    // Verify active report view highlight
    expect(within(sidebar).getByText("Previous Tests")).toBeInTheDocument();
    expect(within(sidebar).getByText("Active")).toBeInTheDocument();

    // Verify prominent + Create Test Now button
    const createBtn = screen.getByTestId("sidebar-create-test-btn");
    expect(createBtn).toBeInTheDocument();

    // Verify collapse toggle button
    const collapseToggle = screen.getByTestId("sidebar-collapse-toggle");
    expect(collapseToggle).toBeInTheDocument();
    await user.click(collapseToggle);
    expect(collapseToggle).toHaveAttribute("aria-label", "Expand sidebar");
  });

  it("renders compact top header with breadcrumbs, cart counter, and learner profile chip", () => {
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };
    mockCartState = {
      items: [{ id: "item-1", product: { id: "p-1", name: "RN Pro" } }],
      itemCount: 1,
      subtotal: 79,
    };

    render(<DashboardClient />);

    const header = screen.getByTestId("dashboard-header");
    expect(header).toBeInTheDocument();

    const breadcrumbs = screen.getByTestId("dashboard-breadcrumbs");
    expect(within(breadcrumbs).getByText("Previous Tests")).toBeInTheDocument();

    const cartLink = screen.getByTestId("dashboard-cart-link");
    expect(cartLink).toHaveAttribute("href", "/cart");
    expect(within(cartLink).getByText("1")).toBeInTheDocument();

    const accountMenu = screen.getByTestId("learner-account-menu");
    expect(accountMenu).toHaveAttribute("href", "/profile");
  });

  it("handles honest zero-state and toggles the illustrative sample benchmark preview", async () => {
    const user = userEvent.setup();
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    // Honest zero-state when learner has no test attempts yet
    expect(screen.getByText(/No Assessment Attempts Recorded Yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Your First Practice Test/i })).toBeInTheDocument();

    // Toggle illustrative sample preview
    const toggle = screen.getByTestId("toggle-sample-preview");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");

    // Clear disclosure banner must appear
    expect(
      screen.getByText(/SAMPLE BENCHMARK PREVIEW • Illustrative Reference Data/i)
    ).toBeInTheDocument();

    // Chart and historical table must now render with sample benchmark data
    expect(screen.getByTestId("assessment-performance-chart")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-history-table")).toBeInTheDocument();

    // Verify right-side performance tier key
    expect(screen.getByTestId("performance-key-vh")).toBeInTheDocument();
    expect(screen.getByTestId("performance-key-h")).toBeInTheDocument();
    expect(screen.getByTestId("performance-key-b")).toBeInTheDocument();
    expect(screen.getByTestId("performance-key-l")).toBeInTheDocument();

    // Verify reference attempts in table (Tutored CAT 7 down to Tutored CAT 1)
    const historyTable = screen.getByTestId("assessment-history-table");
    expect(within(historyTable).getByText("Tutored CAT 7")).toBeInTheDocument();
    expect(within(historyTable).getByText("Tutored CAT 6")).toBeInTheDocument();
    expect(within(historyTable).getByText("Tutored CAT 1")).toBeInTheDocument();
  });

  it("opens Review Test and View Report modals for assessment attempts", async () => {
    const user = userEvent.setup();
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    // Enable sample preview to populate attempts
    await user.click(screen.getByTestId("toggle-sample-preview"));

    // Click Review Test for Tutored CAT 7
    const reviewBtn = screen.getByTestId("btn-review-test-tcat-07");
    await user.click(reviewBtn);

    const reviewModal = screen.getByTestId("modal-review-test");
    expect(reviewModal).toBeInTheDocument();
    expect(within(reviewModal).getByText(/Review: Tutored CAT 7/i)).toBeInTheDocument();
    expect(within(reviewModal).getAllByText(/Clinical Rationale & Explanation/i).length).toBeGreaterThan(0);

    // Close review modal
    await user.click(within(reviewModal).getByRole("button", { name: /Close Review/i }));
    expect(screen.queryByTestId("modal-review-test")).not.toBeInTheDocument();

    // Click View Report for Tutored CAT 7
    const reportBtn = screen.getByTestId("btn-view-report-tcat-07");
    await user.click(reportBtn);

    const reportModal = screen.getByTestId("modal-view-report");
    expect(reportModal).toBeInTheDocument();
    expect(within(reportModal).getByText(/Performance Report: Tutored CAT 7/i)).toBeInTheDocument();
    expect(within(reportModal).getByText(/Client Needs Domain Mastery/i)).toBeInTheDocument();
    expect(within(reportModal).getByText(/Targeted Next Study Steps/i)).toBeInTheDocument();

    // Close report modal
    await user.click(within(reportModal).getByRole("button", { name: /Done/i }));
    expect(screen.queryByTestId("modal-view-report")).not.toBeInTheDocument();
  });

  it("launches the Create Test modal and records a real completed attempt", async () => {
    const user = userEvent.setup();
    mockAuthState = {
      user: {
        id: "candidate-123",
        email: "alex.rn@prepford.com",
        name: "Alex",
        displayName: "Alex",
        role: "candidate",
        pathway: "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    // Launch Create Test modal
    const startTestBtn = screen.getByRole("button", { name: /Start Your First Practice Test/i });
    await user.click(startTestBtn);

    const createModal = screen.getByTestId("modal-create-test");
    expect(createModal).toBeInTheDocument();
    expect(within(createModal).getByText(/Create New Assessment Test/i)).toBeInTheDocument();

    // Start test session
    const startSessionBtn = within(createModal).getByRole("button", { name: /Start Test Session/i });
    await user.click(startSessionBtn);

    // Verify question 1 is presented
    expect(within(createModal).getByText(/Question 1 of 5/i)).toBeInTheDocument();

    // Submit test using the Finish & Submit button
    const submitBtn = within(createModal).getByRole("button", { name: /Finish & Submit/i });
    await user.click(submitBtn);

    // Review modal for the newly generated test should open
    expect(screen.getByTestId("modal-review-test")).toBeInTheDocument();
    expect(screen.getByText(/Review: Tutored CAT 1/i)).toBeInTheDocument();
  });
});
