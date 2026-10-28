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
import { CoursesPageClient } from "@/app/courses/page-client";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as rnMetadata } from "@/app/nclex-rn/page";
import { metadata as pnMetadata } from "@/app/nclex-pn/page";
import { metadata as studyGuideMetadata } from "@/app/study-guide/page";
import { metadata as profileMetadata } from "@/app/profile/page";
import { metadata as adminMetadata } from "@/app/admin/page";

describe("Landing Page Information Architecture, Full-Width Heartbeat & SEO", () => {
  it("renders Hero section with Archer-inspired copy, Explore NCLEX Prep & Explore Study Guide CTAs, and full-width left-to-right heartbeat", () => {
    render(<HomeClient />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Practice nursing questions, strengthen your understanding with rationales, and organize your preparation with PrepFord's available study resources\./i
      )
    ).toBeInTheDocument();

    const explorePrepBtn = screen.getByRole("link", { name: /Explore NCLEX Prep/i });
    expect(explorePrepBtn).toHaveAttribute("href", "#nursing-pathways");

    const exploreStudyGuideBtn = screen.getByRole("link", { name: /Explore Study Guide/i });
    expect(exploreStudyGuideBtn).toHaveAttribute("href", "/study-guide");

    // Full-width heartbeat line spans across the hero section
    const fullwidthHeartbeat = screen.getByTestId("hero-fullwidth-heartbeat");
    expect(fullwidthHeartbeat).toBeInTheDocument();
    expect(fullwidthHeartbeat.className).toContain("inset-x-0");
    expect(fullwidthHeartbeat.className).toContain("w-full");
    expect(fullwidthHeartbeat.className).toContain("pointer-events-none");

    const baselinePath = within(fullwidthHeartbeat).getByTestId("hero-ecg-baseline");
    expect(baselinePath).toBeInTheDocument();

    const pulsePath = within(fullwidthHeartbeat).getByTestId("hero-ecg-pulse-ltr");
    expect(pulsePath).toBeInTheDocument();
    expect(pulsePath.getAttribute("class")).toContain("motion-safe:animate-ecg-ltr");
  });

  it("renders Course Discovery cards for NCLEX-RN and NCLEX-PN directly after the hero", () => {
    render(<HomeClient />);

    const rnCard = screen.getByTestId("pathway-card-rn");
    expect(within(rnCard).getByText("NCLEX-RN Exam Preparation")).toBeInTheDocument();
    expect(within(rnCard).getByRole("link", { name: /Explore NCLEX-RN/i })).toHaveAttribute(
      "href",
      "/nclex-rn"
    );

    const pnCard = screen.getByTestId("pathway-card-pn");
    expect(within(pnCard).getByText("NCLEX-PN Exam Preparation")).toBeInTheDocument();
    expect(within(pnCard).getByRole("link", { name: /Explore NCLEX-PN/i })).toHaveAttribute(
      "href",
      "/nclex-pn"
    );
  });

  it("renders the Question-Learning Showcase with step carousel", () => {
    render(<HomeClient />);

    expect(
      screen.getByText(/Practice NCLEX-Style Questions\. Understand the Why\./i)
    ).toBeInTheDocument();

    expect(screen.getAllByRole("tab", { name: /1\. Recognize Cues/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: /2\. Generate Solutions/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: /3\. Evaluate Outcomes/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { name: /4\. Readiness Insights/i })[0]).toBeInTheDocument();
  });

  it("renders the Study Guide & Nursing Notes preview linking to real Study Guide categories and topics", () => {
    render(<HomeClient />);

    expect(
      screen.getByRole("heading", {
        name: /High-Yield Clinical Notes Organized by Nursing Subject/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Open Full Study Guide/i })).toHaveAttribute(
      "href",
      "/study-guide"
    );

    const medSurgCard = screen.getByTestId("study-guide-preview-medical-surgical");
    expect(within(medSurgCard).getByRole("link", { name: /Browse Med-Surg Notes/i })).toHaveAttribute(
      "href",
      "/study-guide/medical-surgical"
    );

    const pharmCard = screen.getByTestId("study-guide-preview-pharmacology");
    expect(within(pharmCard).getByRole("link", { name: /Browse Pharmacology Notes/i })).toHaveAttribute(
      "href",
      "/study-guide/pharmacology"
    );
  });

  it("renders Final CTA with clear actions for NCLEX-RN, NCLEX-PN, and Study Guide", () => {
    render(<HomeClient />);

    const finalSection = document.getElementById("try-now")!;
    expect(finalSection).not.toBeNull();

    expect(within(finalSection).getByRole("link", { name: /Explore NCLEX-RN/i })).toHaveAttribute(
      "href",
      "/nclex-rn"
    );
    expect(within(finalSection).getByRole("link", { name: /Explore NCLEX-PN/i })).toHaveAttribute(
      "href",
      "/nclex-pn"
    );
    expect(within(finalSection).getByRole("link", { name: /Open Study Guide/i })).toHaveAttribute(
      "href",
      "/study-guide"
    );
  });

  it("preserves interactive Free Demo and Course Recommendation Quiz on the dedicated Courses page", async () => {
    const user = userEvent.setup();
    render(<CoursesPageClient />);

    // Interactive Free Demo question evaluation
    expect(screen.getByText(/Try PrepFord Free/i)).toBeInTheDocument();
    const correctOption = screen.getByRole("radio", {
      name: /Elevate the head of the bed to high-Fowler's and initiate supplemental oxygen/i,
    });
    await user.click(correctOption);
    await user.click(screen.getByRole("button", { name: /Submit Clinical Response/i }));
    expect(
      screen.getByText(/Applying the ABC \(Airway, Breathing, Circulation\) framework/i)
    ).toBeInTheDocument();

    // Interactive Course Recommendation Quiz
    await user.click(screen.getByRole("button", { name: /NCLEX-RN \(Registered Nurse\)/i }));
    await user.click(screen.getByRole("button", { name: /Next Question/i }));
    await user.click(screen.getByRole("button", { name: /1 to 3 months/i }));
    await user.click(screen.getByRole("button", { name: /Next Question/i }));
    await user.click(screen.getByRole("button", { name: /Adaptive CAT simulation/i }));
    await user.click(screen.getByRole("button", { name: /Next Question/i }));
    await user.click(screen.getByRole("button", { name: /Pharmacology/i }));
    await user.click(screen.getByRole("button", { name: /View Recommendation/i }));

    expect(screen.getByText(/Your Tailored Study Plan/i)).toBeInTheDocument();
  });

  it("configures accurate SEO metadata for public routes and noindex for private routes", () => {
    expect(homeMetadata.title).toEqual({
      absolute: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    });
    expect(homeMetadata.description).toBe(
      "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources."
    );

    expect(rnMetadata.title).toEqual({
      absolute: "NCLEX-RN Exam Preparation | PrepFord",
    });
    expect(rnMetadata.description).toBe(
      "Explore PrepFord's NCLEX-RN study resources, practice questions, and nursing learning tools."
    );

    expect(pnMetadata.title).toEqual({
      absolute: "NCLEX-PN Exam Preparation | PrepFord",
    });
    expect(pnMetadata.description).toBe(
      "Explore PrepFord's NCLEX-PN study resources, practice questions, and nursing learning tools."
    );

    expect(studyGuideMetadata.title).toEqual({
      absolute: "Nursing Study Guide & Notes | PrepFord",
    });
    expect(studyGuideMetadata.description).toBe(
      "Browse PrepFord's available nursing study notes and subject-based learning resources."
    );

    expect(profileMetadata.robots).toEqual({ index: false, follow: false });
    expect(adminMetadata.robots).toEqual({ index: false, follow: false });
  });
});
