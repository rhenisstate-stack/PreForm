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

const renderHeader = () => {
  const utils = render(
    <>
      <PublicHeader />
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

describe("Homepage header integration", () => {
  it("renders the PREform header on the homepage", () => {
    const { header } = renderHeader();

    // Header is present
    expect(header).toBeInTheDocument();

    // Logo and homepage link
    const logoLink = within(header).getByRole("link", { name: "PREform NCLEX home" });
    expect(logoLink).toBeInTheDocument();

    // Main navigation links are visible in header
    expect(within(header).getByText("NCLEX-RN")).toBeInTheDocument();
    expect(within(header).getByText("NCLEX-PN")).toBeInTheDocument();
    expect(within(header).getByText("Courses")).toBeInTheDocument();
    expect(within(header).getByText("More")).toBeInTheDocument();
  });

  it("renders main content below the header", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    // Hero heading from homepage (scoped to main content, not header)
    expect(screen.getByText(/prepare with clarity/i)).toBeInTheDocument();

    // Pathway cards in main content
    expect(screen.getByText("Registered Nurse preparation")).toBeInTheDocument();
    expect(screen.getByText("Practical / Vocational Nurse preparation")).toBeInTheDocument();
  });

  it("does not duplicate the header", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    const headers = screen.getAllByRole("banner");
    expect(headers).toHaveLength(1);
  });

  it("opens and closes the NCLEX-RN dropdown without duplicates", () => {
    const { header } = renderHeader();

    // Direct navigation link exists
    const rnLink = within(header).getByRole("link", { name: "NCLEX-RN" });
    expect(rnLink).toHaveAttribute("href", "/nclex-rn");

    const rnTrigger = within(header).getByRole("button", { name: /NCLEX-RN/i });
    expect(rnTrigger).toBeInTheDocument();
    expect(rnTrigger).toHaveAttribute("aria-expanded", "false");

    // Click to open dropdown
    fireEvent.click(rnTrigger);

    // Dropdown should be open
    expect(rnTrigger).toHaveAttribute("aria-expanded", "true");

    // Each sub-item must appear exactly once (no 4x duplication)
    expect(within(header).getAllByRole("link", { name: "RN Overview" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "RN Courses" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "RN Preparation Plans" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "Try RN Questions" })).toHaveLength(1);
  });

  it("opens and closes the NCLEX-PN dropdown without duplicates", () => {
    const { header } = renderHeader();

    const pnLink = within(header).getByRole("link", { name: "NCLEX-PN" });
    expect(pnLink).toHaveAttribute("href", "/nclex-pn");

    const pnTrigger = within(header).getByRole("button", { name: /NCLEX-PN/i });
    expect(pnTrigger).toBeInTheDocument();
    expect(pnTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(pnTrigger);
    expect(pnTrigger).toHaveAttribute("aria-expanded", "true");

    expect(within(header).getAllByRole("link", { name: "PN Overview" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "PN Courses" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "PN Preparation Plans" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "Try PN Questions" })).toHaveLength(1);
  });

  it("opens and closes the Courses dropdown without duplicates", () => {
    const { header } = renderHeader();

    const coursesLink = within(header).getByRole("link", { name: "Courses" });
    expect(coursesLink).toHaveAttribute("href", "/courses");

    const coursesTrigger = within(header).getByRole("button", { name: /Courses/i });
    expect(coursesTrigger).toBeInTheDocument();
    expect(coursesTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(coursesTrigger);
    expect(coursesTrigger).toHaveAttribute("aria-expanded", "true");

    expect(within(header).getAllByRole("link", { name: "All Courses" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "Compare Subscription Plans" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "Free Sample Questions" })).toHaveLength(1);
  });

  it("opens and closes the More dropdown without duplicates", () => {
    const { header } = renderHeader();

    const moreTrigger = within(header).getByRole("button", { name: /More/i });
    expect(moreTrigger).toBeInTheDocument();
    expect(moreTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(moreTrigger);

    expect(moreTrigger).toHaveAttribute("aria-expanded", "true");

    // Sub-items appear exactly once
    expect(within(header).getAllByRole("link", { name: "Our Features" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "For Educators" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "Testimonials" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "FAQ" })).toHaveLength(1);
    expect(within(header).getAllByRole("link", { name: "Contact Us" })).toHaveLength(1);
  });

  it("does not show Buy Now in the header", () => {
    const { header } = renderHeader();

    expect(
      within(header).queryByRole("link", { name: /Buy Now/i })
    ).not.toBeInTheDocument();
  });

  it("shows shopping cart button in header", () => {
    const { header } = renderHeader();

    const cartButton = within(header).getByRole("button", {
      name: /Shopping cart/i,
    });
    expect(cartButton).toBeInTheDocument();
  });

  it("shows theme selector in header", () => {
    const { header } = renderHeader();

    const themeButton = within(header).getByRole("button", {
      name: /Change theme/i,
    });
    expect(themeButton).toBeInTheDocument();
  });

  it("shows notification bell icon in header", () => {
    const { header } = renderHeader();

    const bellButton = within(header).getByRole("button", {
      name: /Notifications and support/i,
    });
    expect(bellButton).toBeInTheDocument();
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
});
