import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
    mounted: true,
    resolvedTheme: "light",
  }),
}));

// Mock @tanstack/react-query
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useQuery: () => ({
      data: [
        { code: "RN", displayName: "NCLEX-RN Pathway", isActive: true },
        { code: "PN", displayName: "NCLEX-PN Pathway", isActive: true },
      ],
      isLoading: false,
      error: undefined,
    }),
  };
});

import { HomeClient } from "@/app/home-client";

describe("Landing Page User Journey & Product Discovery", () => {
  it("renders Hero section with Explore Courses and Find Your Course CTAs", () => {
    render(<HomeClient />);

    expect(screen.getByText(/Prepare with clarity/i)).toBeInTheDocument();

    const exploreCoursesBtn = screen.getByRole("link", { name: /Explore Courses/i });
    expect(exploreCoursesBtn).toHaveAttribute("href", "/courses");

    const findYourCourseBtn = screen.getByRole("link", { name: /Find Your Course/i });
    expect(findYourCourseBtn).toHaveAttribute("href", "#course-finder");
  });

  it("renders Product & Pathway Discovery cards with verified prices and distinct detail/cart CTAs", () => {
    render(<HomeClient />);

    const detailLinks = screen.getAllByRole("link", { name: /Explore Course Details/i });
    expect(detailLinks.length).toBeGreaterThanOrEqual(2);
    expect(detailLinks[0]).toHaveAttribute("href", "/nclex-rn");
    expect(detailLinks[1]).toHaveAttribute("href", "/nclex-pn");

    const enroll59Links = screen.getAllByRole("link", { name: /Enroll Now — \$59/i });
    expect(enroll59Links[0]).toHaveAttribute("href", "/cart?add=rn-pro");
    expect(enroll59Links[1]).toHaveAttribute("href", "/cart?add=pn-pro");

    const allAccessEnroll = screen.getByRole("link", { name: /Enroll Now — \$89/i });
    expect(allAccessEnroll).toHaveAttribute("href", "/cart?add=prep-premium");
  });

  it("completes the course recommendation quiz and renders direct purchase and pathway CTAs", async () => {
    const user = userEvent.setup();
    render(<HomeClient />);

    // Step 1: Select NCLEX-RN
    const rnOption = screen.getByRole("button", { name: /NCLEX-RN \(Registered Nurse\)/i });
    await user.click(rnOption);
    const nextBtn = screen.getByRole("button", { name: /Next Question/i });
    await user.click(nextBtn);

    // Step 2: Select Timeline
    const timelineOption = screen.getByRole("button", { name: /1 to 3 months/i });
    await user.click(timelineOption);
    await user.click(screen.getByRole("button", { name: /Next Question/i }));

    // Step 3: Select Support Style
    const supportOption = screen.getByRole("button", { name: /Adaptive CAT simulation/i });
    await user.click(supportOption);
    await user.click(screen.getByRole("button", { name: /Next Question/i }));

    // Step 4: Select Focus
    const focusOption = screen.getByRole("button", { name: /Pharmacology/i });
    await user.click(focusOption);
    await user.click(screen.getByRole("button", { name: /View Recommendation/i }));

    // Verify Recommendation Card
    const recHeading = screen.getByText(/Your Tailored Study Plan/i);
    expect(recHeading).toBeInTheDocument();

    const addToCartBtn = screen.getByRole("link", { name: /Add to Cart — \$59\/mo/i });
    expect(addToCartBtn).toHaveAttribute("href", "/cart?add=rn-pro");

    const quizContainer = recHeading.closest("section")!;
    const explorePathwayBtn = within(quizContainer).getByRole("link", { name: /Explore Pathway/i });
    expect(explorePathwayBtn).toHaveAttribute("href", "/nclex-rn");
  });

  it("renders Learning & Resources section with real destinations for catalog, blog, practice, and support", () => {
    render(<HomeClient />);

    expect(screen.getByRole("link", { name: /Browse Courses/i })).toHaveAttribute("href", "/courses");
    expect(screen.getByRole("link", { name: /Read Study Articles/i })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: /Try Sample Questions/i })).toHaveAttribute("href", "/courses?type=practice");
    expect(screen.getByRole("link", { name: /Contact Support/i })).toHaveAttribute("href", "/contact");
  });

  it("renders Final CTA with Buy Now routing directly to cart and Try Now to sign-up", () => {
    render(<HomeClient />);

    const buyNow = screen.getByRole("link", { name: /^Buy Now$/i });
    expect(buyNow).toHaveAttribute("href", "/cart?add=rn-pro");

    const tryNow = screen.getByRole("link", { name: /^Try Now$/i });
    expect(tryNow).toHaveAttribute("href", "/sign-up");
  });
});
