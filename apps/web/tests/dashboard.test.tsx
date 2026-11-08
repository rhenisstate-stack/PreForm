import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardClient, RECENT_ACTIVITY_STORAGE_KEY } from "@/app/dashboard/page-client";

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

describe("PrepFord Learner Dashboard (/dashboard) — Single-Pathway Resolution", () => {
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

  it("resolves authenticated RN candidate to dedicated NCLEX-RN dashboard view", () => {
    mockAuthState = {
      user: {
        id: "candidate-rn-123",
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

    // Renders the dedicated RN view
    expect(screen.getByTestId("nclex-rn-dashboard-view")).toBeInTheDocument();
    expect(screen.queryByTestId("nclex-pn-dashboard-view")).not.toBeInTheDocument();

    // Renders RN-specific hero action buttons
    expect(screen.getByTestId("rn-hero-create-test-btn")).toBeInTheDocument();
    expect(screen.getByTestId("rn-hero-rat-btn")).toBeInTheDocument();

    // Renders static pathway badge, not a switcher
    expect(screen.getByTestId("dashboard-pathway-badge")).toHaveTextContent(/NCLEX-RN/i);
    expect(screen.queryByTestId("dashboard-pathway-rn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-pathway-pn")).not.toBeInTheDocument();
  });

  it("resolves authenticated PN candidate to dedicated NCLEX-PN dashboard view", () => {
    mockAuthState = {
      user: {
        id: "candidate-pn-456",
        email: "jordan.pn@prepford.com",
        name: "Jordan Lee",
        displayName: "Jordan Lee, LPN",
        role: "candidate",
        pathway: "pn",
        activePlan: "NCLEX-PN Complete Preparation",
        targetExamDate: "2026-11-30",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    // Renders the dedicated PN view
    expect(screen.getByTestId("nclex-pn-dashboard-view")).toBeInTheDocument();
    expect(screen.queryByTestId("nclex-rn-dashboard-view")).not.toBeInTheDocument();

    // Renders PN-specific hero action buttons
    expect(screen.getByTestId("pn-hero-create-test-btn")).toBeInTheDocument();
    expect(screen.getByTestId("pn-hero-rat-btn")).toBeInTheDocument();

    // Renders static pathway badge, not a switcher
    expect(screen.getByTestId("dashboard-pathway-badge")).toHaveTextContent(/NCLEX-PN/i);
    expect(screen.queryByTestId("dashboard-pathway-rn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-pathway-pn")).not.toBeInTheDocument();
  });

  it("renders safe enrollment resolution card when candidate pathway is unassigned", () => {
    mockAuthState = {
      user: {
        id: "candidate-unassigned",
        email: "unassigned@prepford.com",
        name: "Pending Student",
        displayName: "Pending Student",
        role: "candidate",
        pathway: "" as unknown as "rn",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<DashboardClient />);

    expect(screen.getByTestId("dashboard-unassigned-resolution")).toBeInTheDocument();
    expect(screen.getByText(/Pathway Enrollment Required/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Select Study Plan/i })).toHaveAttribute(
      "href",
      "/subscriptions"
    );
  });

  it("renders persistent dark teal sidebar with enrolled navigation link and collapse control", async () => {
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

    // Sidebar navigation groups
    expect(within(sidebar).getByText(/^Learn$/i)).toBeInTheDocument();
    expect(within(sidebar).getByText(/^Test Bank & Assessments$/i)).toBeInTheDocument();
    expect(within(sidebar).getByText(/^Reports$/i)).toBeInTheDocument();
    expect(within(sidebar).getByText(/^Account$/i)).toBeInTheDocument();

    // Enrolled pathway sidebar link only points to /dashboard/rn for RN student
    expect(within(sidebar).getByTitle("NCLEX-RN")).toBeInTheDocument();
    expect(within(sidebar).queryByTitle("NCLEX-PN")).not.toBeInTheDocument();

    // Sidebar Security & Devices link
    const securityNavLink = within(sidebar).getByTestId("sidebar-nav-security");
    expect(securityNavLink).toHaveAttribute("href", "/dashboard/settings/security");

    // Prominent sidebar + Create Test Now button
    expect(screen.getByTestId("sidebar-create-test-btn")).toBeInTheDocument();

    // Collapse toggle button
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

  it("renders dedicated RN NCJMM framework and Client Needs breakdown", () => {
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

    expect(screen.getByTestId("rn-ncjmm-framework")).toBeInTheDocument();
    expect(screen.getByTestId("rn-client-needs-breakdown")).toBeInTheDocument();
    expect(screen.getByTestId("rn-study-recommendations")).toBeInTheDocument();
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

    // Launch Create Test modal from RN hero button
    const createTestBtn = screen.getByTestId("rn-hero-create-test-btn");
    await user.click(createTestBtn);

    const createModal = screen.getByTestId("modal-create-test");
    expect(createModal).toBeInTheDocument();
    expect(within(createModal).getByText(/Create New NCLEX-RN Assessment Test/i)).toBeInTheDocument();

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
  });

  it("launches RAT workflow directly from Take RN Readiness button", async () => {
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

    const takeRatBtn = screen.getByTestId("rn-hero-rat-btn");
    await user.click(takeRatBtn);

    const workspace = screen.getByTestId("modal-create-test");
    expect(workspace).toBeInTheDocument();
    expect(workspace.className).toContain("fixed inset-0");

    // Verifies RAT-specific heading and structure
    expect(within(workspace).getByText(/Take Readiness Assessment \(RAT\)/i)).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: /Start Test Session/i })).toBeInTheDocument();

    // RAT mode does NOT render CAT mode options
    expect(within(workspace).queryByText(/Tutored Computer Adaptive Test \(CAT\)/i)).not.toBeInTheDocument();
  });
});
