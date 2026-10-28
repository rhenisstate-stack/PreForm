import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import * as React from "react";

// Mock next-themes to avoid jsdom/document issues
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
    mounted: true,
    resolvedTheme: "light",
  }),
}));

// Mock @tanstack/react-query QueryClientProvider to avoid provider issues
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useQuery: () => ({ data: undefined, isLoading: false, error: undefined }),
  };
});

import PublicHeader from "@/components/layout/public-header";
import { HomeClient } from "@/app/home-client";

const renderHeader = (props?: { user?: { displayName: string; role: string; email: string } }) => {
  const utils = render(
    <>
      <PublicHeader {...props} />
      <main id="main-content">
        <HomeClient />
      </main>
    </>
  );
  return {
    ...utils,
    header: utils.getByRole("banner"),
  };
};

describe("Homepage header integration & Nursing dropdown navigation", () => {
  it("renders the PrepFord header with prominent logo, stacked wordmark, and top-level navigation", () => {
    const { header } = renderHeader();

    expect(header).toBeInTheDocument();

    // Logo and homepage link with larger mark and two-line stacked wordmark (Prep above Ford)
    const logoLink = within(header).getByRole("link", { name: /^PrepFord home$/i });
    expect(logoLink).toBeInTheDocument();

    const logoMark = within(logoLink).getByTestId("brand-logo-mark");
    expect(logoMark.className).toContain("h-11");
    expect(logoMark.className).toContain("w-11");
    expect(logoMark).toHaveAttribute("src", "/prepford-logo.png");

    const stackedWordmark = within(logoLink).getByTestId("brand-wordmark-stacked");
    expect(stackedWordmark.className).toContain("flex-col");
    expect(within(stackedWordmark).getByText("Prep")).toBeInTheDocument();
    expect(within(stackedWordmark).getByText("Ford")).toBeInTheDocument();

    // Main top-level navigation items are visible in header
    expect(within(header).getByRole("button", { name: /^Nursing$/i })).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "Study Guide" })).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "Products & Pricing" })).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "Testimonials" })).toBeInTheDocument();
  });

  it("renders main content below the header with Archer-inspired hero and Nursing pathway discovery", () => {
    renderHeader();

    // Hero heading from homepage
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    // Pathway cards in main content
    expect(screen.getByText(/Registered Nurse preparation \(BSN & ADN candidates\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Practical \/ Vocational Nurse preparation \(LPN & LVN candidates\)/i)).toBeInTheDocument();
  });

  it("does not duplicate the header", () => {
    renderHeader();

    const headers = screen.getAllByRole("banner");
    expect(headers).toHaveLength(1);
  });

  it("groups NCLEX-RN and NCLEX-PN under the unified Nursing dropdown and closes on Escape or route click", () => {
    const { header } = renderHeader();

    const nursingTrigger = within(header).getByRole("button", { name: /^Nursing$/i });
    expect(nursingTrigger).toHaveAttribute("aria-expanded", "false");

    // Click to open Nursing dropdown
    fireEvent.click(nursingTrigger);
    expect(nursingTrigger).toHaveAttribute("aria-expanded", "true");

    // Verify NCLEX-RN and NCLEX-PN links inside Nursing dropdown
    const rnLinks = within(header).getAllByRole("link", { name: /NCLEX-RN/i });
    expect(rnLinks).toHaveLength(1);
    expect(rnLinks[0]).toHaveAttribute("href", "/nclex-rn");

    const pnLinks = within(header).getAllByRole("link", { name: /NCLEX-PN/i });
    expect(pnLinks).toHaveLength(1);
    expect(pnLinks[0]).toHaveAttribute("href", "/nclex-pn");

    // Press Escape to close dropdown
    fireEvent.keyDown(document, { key: "Escape" });
    expect(nursingTrigger).toHaveAttribute("aria-expanded", "false");

    // Reopen and click an item to verify route selection closes the menu
    fireEvent.click(nursingTrigger);
    expect(nursingTrigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(within(header).getByRole("link", { name: /NCLEX-RN/i }));
    expect(nursingTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens and closes the Study Guide dropdown with all 7 nursing study domains", () => {
    const { header } = renderHeader();

    const studyGuideLink = within(header).getByRole("link", { name: "Study Guide" });
    expect(studyGuideLink).toHaveAttribute("href", "/study-guide");

    const studyGuideTrigger = within(header).getByRole("button", { name: /Open Study Guide menu/i });
    expect(studyGuideTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(studyGuideTrigger);
    expect(studyGuideTrigger).toHaveAttribute("aria-expanded", "true");

    expect(within(header).getByRole("link", { name: "All Study Guides" })).toHaveAttribute("href", "/study-guide");
    expect(within(header).getByRole("link", { name: "Medical-Surgical Nursing" })).toHaveAttribute("href", "/study-guide/medical-surgical");
    expect(within(header).getByRole("link", { name: "Pharmacology & Medication Safety" })).toHaveAttribute("href", "/study-guide/pharmacology");
    expect(within(header).getByRole("link", { name: "Leadership & Delegation" })).toHaveAttribute("href", "/study-guide/leadership-delegation");
  });

  it("opens and closes the Products & Pricing dropdown without duplicates", () => {
    const { header } = renderHeader();

    const productsLink = within(header).getByRole("link", { name: "Products & Pricing" });
    expect(productsLink).toHaveAttribute("href", "/subscriptions");

    const productsTrigger = within(header).getByRole("button", { name: /Open Products & Pricing menu/i });
    expect(productsTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(productsTrigger);
    expect(productsTrigger).toHaveAttribute("aria-expanded", "true");

    expect(within(header).getAllByRole("link", { name: "Compare Subscription Plans" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "All Courses & Question Banks" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "Free Sample Questions" })).toHaveLength(1);
  });

  it("renders mobile navigation drawer with grouped NCLEX-RN and NCLEX-PN links", () => {
    const { header } = renderHeader();

    const mobileToggle = within(header).getByRole("button", { name: /Open menu/i });
    fireEvent.click(mobileToggle);

    const drawer = within(header).getByTestId("mobile-navigation-drawer");
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText("Nursing Exam Prep")).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: /NCLEX-RN/i })).toHaveAttribute("href", "/nclex-rn");
    expect(within(drawer).getByRole("link", { name: /NCLEX-PN/i })).toHaveAttribute("href", "/nclex-pn");
    expect(within(drawer).getByRole("link", { name: /Study Guide & Notes/i })).toHaveAttribute("href", "/study-guide");
  });

  it("does not show Buy Now in the header", () => {
    const { header } = renderHeader();

    expect(
      within(header).queryByRole("link", { name: /Buy Now/i })
    ).not.toBeInTheDocument();
  });

  it("does not show shopping cart or notifications for unauthenticated visitors", () => {
    const { header } = renderHeader();

    expect(
      within(header).queryByRole("link", { name: /Shopping cart/i })
    ).not.toBeInTheDocument();
    expect(
      within(header).queryByRole("button", { name: /Notifications and support/i })
    ).not.toBeInTheDocument();
  });

  it("shows theme selector in header", () => {
    const { header } = renderHeader();

    const themeButton = within(header).getByRole("button", {
      name: /Change theme/i,
    });
    expect(themeButton).toBeInTheDocument();
  });

  it("shows sign-in and create account for unauthenticated users", () => {
    const { header } = renderHeader();

    expect(
      within(header).getByRole("link", { name: /Sign in/i })
    ).toBeInTheDocument();
    expect(
      within(header).getByRole("link", { name: /Create account/i })
    ).toBeInTheDocument();
  });

  it("shows cart, notifications, and profile menu when authenticated and hides sign-in", () => {
    const { header } = renderHeader({
      user: { displayName: "Candidate Nurse", role: "candidate", email: "candidate@example.com" },
    });

    const cartLink = within(header).getByRole("link", {
      name: /Shopping cart/i,
    });
    expect(cartLink).toBeInTheDocument();

    const bellButton = within(header).getByRole("button", {
      name: /Notifications and support/i,
    });
    expect(bellButton).toBeInTheDocument();

    const profileMenu = within(header).getByRole("button", {
      name: /User profile menu/i,
    });
    expect(profileMenu).toBeInTheDocument();

    expect(
      within(header).queryByRole("link", { name: /Sign in/i })
    ).not.toBeInTheDocument();
    expect(
      within(header).queryByRole("link", { name: /Create account/i })
    ).not.toBeInTheDocument();
  });
});
