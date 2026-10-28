import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

const mockPush = vi.fn();
const mockAddItem = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/nclex-rn",
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    items: [],
    addItem: mockAddItem,
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    totalPrice: 0,
    itemCount: 0,
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

import { NCLEXRNPageClient } from "@/app/nclex-rn/page-client";
import { metadata as rnMetadata } from "@/app/nclex-rn/page";
import { STUDY_GUIDE_CATEGORIES, getCategoryBySlug, getSubjectBySlugs } from "@/lib/study-guide-data";

describe("NCLEX-RN Page Transformation (/nclex-rn)", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockAddItem.mockReset();
  });

  it("renders all required NCLEX-RN sections in the expected information architecture sequence", () => {
    render(<NCLEXRNPageClient />);

    const orderedTestIds = [
      "nclex-rn-hero",
      "rn-study-plans",
      "rn-plan-comparison",
      "rn-student-progress",
      "rn-question-experience",
      "rn-assessments-progress",
      "rn-feature-highlights",
      "rn-ngn-readiness",
      "rn-study-guide-integration",
      "rn-learning-journey",
      "rn-recommendation-quiz",
      "rn-standalone-assessment",
      "rn-testimonials",
      "rn-final-cta",
      "rn-faq-section",
    ];

    const elements = orderedTestIds.map((id) => screen.getByTestId(id));
    for (let i = 0; i < elements.length - 1; i++) {
      const relation = elements[i].compareDocumentPosition(elements[i + 1]);
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("renders the Hero section with PrepFord RN headline, CTAs, and a full-width left-to-right animated heartbeat line", () => {
    render(<NCLEXRNPageClient />);

    const hero = screen.getByTestId("nclex-rn-hero");
    expect(
      within(hero).getByRole("heading", {
        level: 1,
        name: /Prepare for the NCLEX-RN with Clinical Clarity and Structured Practice\./i,
      })
    ).toBeInTheDocument();

    expect(within(hero).getByRole("link", { name: /Explore Study Plans/i })).toHaveAttribute(
      "href",
      "#rn-study-plans"
    );
    expect(within(hero).getByRole("link", { name: /Explore Study Guide/i })).toHaveAttribute(
      "href",
      "/study-guide"
    );
    expect(within(hero).getByRole("link", { name: /Try Free Sample Question/i })).toHaveAttribute(
      "href",
      "#rn-question-experience"
    );

    const heartbeat = screen.getByTestId("rn-hero-heartbeat");
    expect(heartbeat.className).toContain("inset-x-0");
    expect(heartbeat.className).toContain("w-full");

    const pulsePath = within(heartbeat).getByTestId("rn-hero-ecg-pulse-ltr");
    expect(pulsePath.getAttribute("class")).toContain("motion-safe:animate-ecg-ltr");
  });

  it("allows toggling between 90-Day Quarterly and 30-Day Monthly durations and hands off the selected RN plan to CartContext", async () => {
    const user = userEvent.setup();
    render(<NCLEXRNPageClient />);

    // Default duration is 90-Day Quarterly Access ($75 / $149 / $229)
    expect(screen.getByTestId("rn-plan-price-starter")).toHaveTextContent("$75");
    expect(screen.getByTestId("rn-plan-price-pro")).toHaveTextContent("$149");
    expect(screen.getByTestId("rn-plan-price-premium")).toHaveTextContent("$229");

    // Switch to 30-Day Monthly Access ($29 / $59 / $89)
    await user.click(screen.getByTestId("rn-duration-toggle-month"));
    expect(screen.getByTestId("rn-plan-price-starter")).toHaveTextContent("$29");
    expect(screen.getByTestId("rn-plan-price-pro")).toHaveTextContent("$59");
    expect(screen.getByTestId("rn-plan-price-premium")).toHaveTextContent("$89");

    // Switch back to 90-Day Quarterly Access and select RN Complete Preparation (90-Day)
    await user.click(screen.getByTestId("rn-duration-toggle-quarter"));
    await user.click(screen.getByTestId("select-plan-rn-pro-90"));

    expect(mockAddItem).toHaveBeenCalledWith("rn-pro-90");
    expect(mockPush).toHaveBeenCalledWith("/cart?add=rn-pro-90");
  });

  it("renders an accessible Plan Comparison table with semantic column and row headers", () => {
    render(<NCLEXRNPageClient />);

    const comparison = screen.getByTestId("rn-plan-comparison");
    const table = within(comparison).getByRole("table");
    expect(table).toBeInTheDocument();

    expect(
      within(table).getByRole("columnheader", { name: /NCLEX-RN Starter Review/i })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: /NCLEX-RN Complete Prep \(Pro\)/i })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: /NCLEX-RN & PN All-Access/i })
    ).toBeInTheDocument();

    expect(
      within(table).getByRole("rowheader", { name: /Practice Question Bank Access/i })
    ).toBeInTheDocument();
  });

  it("evaluates the interactive NCLEX-RN sample question, reveals option-by-option rationales, and resets cleanly", async () => {
    const user = userEvent.setup();
    render(<NCLEXRNPageClient />);

    const questionSection = screen.getByTestId("rn-question-experience");
    const submitBtn = within(questionSection).getByRole("button", {
      name: /Check Answer & View Rationale/i,
    });
    expect(submitBtn).toBeDisabled();

    const optionA = within(questionSection).getByRole("radio", {
      name: /Elevate the head of the bed to high-Fowler's position and apply supplemental oxygen/i,
    });
    await user.click(optionA);
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    const rationalePanel = screen.getByTestId("rn-sample-rationale-panel");
    expect(within(rationalePanel).getByText(/Option A is Correct/i)).toBeInTheDocument();
    expect(
      within(rationalePanel).getByText(
        /optimize ventilation-perfusion matching by elevating the head of the bed/i
      )
    ).toBeInTheDocument();

    const resetBtn = within(questionSection).getByRole("button", {
      name: /Reset Sample Question/i,
    });
    await user.click(resetBtn);
    expect(screen.queryByTestId("rn-sample-rationale-panel")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation (ArrowRight / End) in the Feature Highlights tablist", async () => {
    const user = userEvent.setup();
    render(<NCLEXRNPageClient />);

    const highlights = screen.getByTestId("rn-feature-highlights");
    const firstTab = within(highlights).getByRole("tab", { name: /RN Question Practice/i });
    expect(firstTab).toHaveAttribute("aria-selected", "true");

    firstTab.focus();
    await user.keyboard("{ArrowRight}");

    const secondTab = within(highlights).getByRole("tab", {
      name: /Option-by-Option Rationales/i,
    });
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(
      within(highlights).getByRole("heading", {
        name: /Understand why the priority intervention is right/i,
      })
    ).toBeInTheDocument();
  });

  it("renders all 7 Nursing Study Guide domains with working category and subject links and accurate topic counts", () => {
    render(<NCLEXRNPageClient />);

    const studyGuideSection = screen.getByTestId("rn-study-guide-integration");
    for (const cat of STUDY_GUIDE_CATEGORIES) {
      const card = within(studyGuideSection).getByTestId(`rn-study-guide-card-${cat.slug}`);
      expect(card).toBeInTheDocument();
      expect(getCategoryBySlug(cat.slug)).toBeDefined();

      for (const subj of cat.subjects.slice(0, 3)) {
        expect(getSubjectBySlugs(cat.slug, subj.slug)).toBeDefined();
        const subjLink = within(card).getByRole("link", { name: subj.title });
        expect(subjLink).toHaveAttribute("href", `/study-guide/${cat.slug}/${subj.slug}`);
      }
    }

    expect(within(studyGuideSection).queryByText("1 Subject Guides")).not.toBeInTheDocument();
    expect(screen.queryByText(/22 structured subject guides/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adaptive CAT/i)).not.toBeInTheDocument();
  });

  it("does not duplicate Section 14 candidate reflections inside Section 4", () => {
    render(<NCLEXRNPageClient />);

    const progressSection = screen.getByTestId("rn-student-progress");
    const testimonialsSection = screen.getByTestId("rn-testimonials");

    expect(within(progressSection).queryByText(/Alex R\., BSN/i)).not.toBeInTheDocument();
    expect(within(testimonialsSection).getByText(/Alex R\., BSN/i)).toBeInTheDocument();
    expect(within(testimonialsSection).getByText(/Jordan M\., RN/i)).toBeInTheDocument();
    expect(within(testimonialsSection).getByText(/Morgan L\., BSN/i)).toBeInTheDocument();
    expect(within(testimonialsSection).getByText(/Casey P\., ADN/i)).toBeInTheDocument();
  });

  it("supports the standalone NCLEX-RN Readiness Assessment Pack ($39) checkout handoff", async () => {
    const user = userEvent.setup();
    render(<NCLEXRNPageClient />);

    const standaloneBtn = screen.getByTestId("select-plan-rn-readiness");
    expect(standaloneBtn).toHaveTextContent("Add Readiness Pack — $39");

    await user.click(standaloneBtn);
    expect(mockAddItem).toHaveBeenCalledWith("rn-readiness");
    expect(mockPush).toHaveBeenCalledWith("/cart?add=rn-readiness");
  });

  it("toggles FAQ accordion items with proper aria-expanded and aria-controls attributes", async () => {
    const user = userEvent.setup();
    render(<NCLEXRNPageClient />);

    const faqSection = screen.getByTestId("rn-faq-section");
    const faqButtons = within(faqSection).getAllByRole("button");
    expect(faqButtons.length).toBe(16);

    const firstFaqBtn = within(faqSection).getByRole("button", {
      name: /What resources are included in PrepFord's NCLEX-RN preparation platform\?/i,
    });
    expect(firstFaqBtn).toHaveAttribute("aria-expanded", "true");

    const secondFaqBtn = within(faqSection).getByRole("button", {
      name: /How do NCLEX-RN Starter Review, Complete Preparation \(Pro\), and RN & PN All-Access differ\?/i,
    });
    expect(secondFaqBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(secondFaqBtn);
    expect(secondFaqBtn).toHaveAttribute("aria-expanded", "true");
    expect(firstFaqBtn).toHaveAttribute("aria-expanded", "false");

    // Verify dynamic pricing and transparent operational disclosures in the expanded FAQ set
    const savingsFaqBtn = within(faqSection).getByRole("button", {
      name: /How is the 90-day quarterly price and saving calculated\?/i,
    });
    await user.click(savingsFaqBtn);
    expect(
      within(faqSection).getByText(
        /Starter Review is \$75 instead of \$87 \(saving \$12\), Complete Preparation is \$149 instead of \$177 \(saving \$28\), and RN & PN All-Access is \$229 instead of \$267 \(saving \$38\)/i
      )
    ).toBeVisible();

    const disclaimerFaqBtn = within(faqSection).getByRole("button", {
      name: /What should users know about exam outcomes and pass guarantees\?/i,
    });
    await user.click(disclaimerFaqBtn);
    expect(
      within(faqSection).getByText(
        /PrepFord does not offer pass guarantees, pass-rate promises, or official exam score predictions/i
      )
    ).toBeVisible();
  });

  it("updates the quarterly duration savings badge dynamically from products.ts and supports keyboard arrow navigation", async () => {
    const user = userEvent.setup();
    render(<NCLEXRNPageClient />);

    const monthBtn = screen.getByTestId("rn-duration-toggle-month");
    const quarterBtn = screen.getByTestId("rn-duration-toggle-quarter");
    const savingsBadge = screen.getByTestId("rn-duration-quarterly-savings");

    // Default selected tier is "pro" ($177 - $149 = $28 savings)
    expect(savingsBadge).toHaveTextContent("Save $28");
    expect(quarterBtn).toHaveTextContent("90-Day Quarterly Access");
    expect(quarterBtn).not.toHaveTextContent("Save up to $38");

    // Clicking Starter card updates dynamic quarterly savings badge to $12 ($87 - $75)
    await user.click(screen.getByTestId("rn-plan-card-starter"));
    expect(savingsBadge).toHaveTextContent("Save $12");

    // Clicking Premium All-Access card updates dynamic quarterly savings badge to $38 ($267 - $229)
    await user.click(screen.getByTestId("rn-plan-card-premium"));
    expect(savingsBadge).toHaveTextContent("Save $38");

    // Keyboard ArrowLeft/ArrowRight navigation toggles between quarterly and monthly access
    quarterBtn.focus();
    await user.keyboard("{ArrowLeft}");
    expect(monthBtn).toHaveAttribute("aria-pressed", "true");
    expect(quarterBtn).toHaveAttribute("aria-pressed", "false");

    await user.keyboard("{ArrowRight}");
    expect(quarterBtn).toHaveAttribute("aria-pressed", "true");
    expect(monthBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("renders a healthy resting sinus ECG waveform with P wave, narrow QRS complex, and T wave curves", () => {
    render(<NCLEXRNPageClient />);

    const baselinePath = screen.getByTestId("rn-hero-ecg-baseline");
    const pulsePath = screen.getByTestId("rn-hero-ecg-pulse-ltr");

    const d = baselinePath.getAttribute("d") ?? "";
    expect(d).toBe(pulsePath.getAttribute("d"));
    // Contains smooth cubic Bezier curves for rounded P and T waves and sharp L segments for narrow QRS
    expect(d).toContain("C ");
    expect(d).toContain("L ");
    expect(pulsePath).toHaveAttribute("pathLength", "1000");
    expect(pulsePath).toHaveAttribute("stroke-dasharray", "220 280");
  });

  it("exports accurate SEO metadata for /nclex-rn", () => {
    expect(rnMetadata.title).toEqual({
      absolute: "NCLEX-RN Exam Preparation | PrepFord",
    });
    expect(rnMetadata.description).toBe(
      "Explore PrepFord's NCLEX-RN study resources, nursing notes, practice tools, and available study plans to support your exam preparation."
    );
    expect(rnMetadata.alternates?.canonical).toBe("/nclex-rn");
  });
});
