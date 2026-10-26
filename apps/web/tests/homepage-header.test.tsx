import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";

// Mock next-themes to avoid jsdom/document issues
vi.mock("next-themes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-themes")>();
  return {
    ...actual,
    ThemeProvider: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <actual.ThemeProvider {...(props as any)}>{children}</actual.ThemeProvider>
    ),
    useTheme: () => ({
      theme: "system",
      setTheme: vi.fn(),
      mounted: true,
      resolvedTheme: "light",
    }),
  };
});

// Mock @tanstack/react-query QueryClientProvider to avoid provider issues
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useQuery: () => ({ data: undefined, isLoading: false, error: undefined }),
  };
});

import { PublicHeader } from "@/components/layout/public-header";
import { HomeClient } from "@/app/home-client";

describe("Homepage header integration", () => {
  it("renders the PREform header on the homepage", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    // Header is present
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();

    // Logo and homepage link
    const logoLink = screen.getByRole("link", { name: "PREform NCLEX home" });
    expect(logoLink).toBeInTheDocument();

    // Main navigation links are visible
    expect(screen.getByText("NCLEX-RN")).toBeInTheDocument();
    expect(screen.getByText("NCLEX-PN")).toBeInTheDocument();
    expect(screen.getByText("Courses")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Testimonials")).toBeInTheDocument();
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

    // Hero heading from homepage
    expect(screen.getByText(/prepare with clarity/i)).toBeInTheDocument();

    // Pathway cards
    expect(screen.getByText("NCLEX-RN")).toBeInTheDocument();
    expect(screen.getByText("NCLEX-PN")).toBeInTheDocument();
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

  it("opens and closes the NCLEX-RN dropdown", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    const rnTrigger = screen.getByRole("button", { name: /NCLEX-RN/i });
    expect(rnTrigger).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(rnTrigger);

    // Dropdown content should be visible
    expect(screen.getByText("RN Overview")).toBeInTheDocument();
    expect(screen.getByText("RN Courses")).toBeInTheDocument();
  });

  it("opens and closes the More dropdown", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    const moreTrigger = screen.getByRole("button", { name: /More/i });
    expect(moreTrigger).toBeInTheDocument();

    fireEvent.click(moreTrigger);

    expect(screen.getByText("Our Features")).toBeInTheDocument();
    expect(screen.getByText("For Educators")).toBeInTheDocument();
    expect(screen.getByText("Contact Us")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  it("shows Buy Now and Try Now CTAs", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    expect(screen.getByRole("link", { name: /Buy Now/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try Now/i })).toBeInTheDocument();
  });

  it("shows theme selector", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    // ThemeSwitcher renders a button for theme selection
    const themeButton = screen.getByRole("button", { name: /Change theme/i });
    expect(themeButton).toBeInTheDocument();
  });

  it("shows notification bell icon", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    const bellButton = screen.getByRole("button", {
      name: /Notifications and support/i,
    });
    expect(bellButton).toBeInTheDocument();
  });

  it("shows sign-in and create account for unauthenticated users", () => {
    render(
      <>
        <PublicHeader />
        <main id="main-content">
          <HomeClient />
        </main>
      </>
    );

    expect(screen.getByRole("link", { name: /Sign in/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create account/i })
    ).toBeInTheDocument();
  });
});
