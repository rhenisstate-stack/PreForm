import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/nclex-pn",
  useSearchParams: () => new URLSearchParams(),
}));

import PNPage, { metadata as pnMetadata } from "@/app/nclex-pn/page";
import { CartProvider, useCart } from "@/lib/cart-context";

function CartInspector() {
  const { items, total } = useCart();
  return (
    <div data-testid="cart-inspector">
      <span data-testid="cart-item-ids">{items.map((i) => i.product.id).join(",")}</span>
      <span data-testid="cart-total">{total}</span>
    </div>
  );
}

describe("NCLEX-PN Page Transformation & Conversion Flow", () => {
  beforeEach(() => {
    pushMock.mockClear();
    localStorage.clear();
  });

  it("renders all 10 page sections in the Archer-inspired sequence with left-to-right heartbeat", () => {
    render(
      <CartProvider>
        <PNPage />
      </CartProvider>
    );

    // Section 1: Hero + Full-width left-to-right ECG
    const hero = screen.getByTestId("nclex-pn-hero");
    expect(hero).toBeInTheDocument();
    expect(
      within(hero).getByRole("heading", {
        level: 1,
        name: /Prepare for the NCLEX-PN with Structured Practice and Clinical Clarity/i,
      })
    ).toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: /Explore Study Plans/i })).toHaveAttribute(
      "href",
      "#pn-study-plans"
    );
    expect(within(hero).getByRole("link", { name: /Explore Study Guide/i })).toHaveAttribute(
      "href",
      "/study-guide"
    );

    const heartbeat = within(hero).getByTestId("pn-hero-heartbeat");
    expect(heartbeat.className).toContain("inset-x-0");
    expect(heartbeat.className).toContain("w-full");
    expect(heartbeat.className).toContain("pointer-events-none");
    expect(within(heartbeat).getByTestId("pn-hero-ecg-baseline")).toBeInTheDocument();
    expect(
      within(heartbeat).getByTestId("pn-hero-ecg-pulse-ltr").getAttribute("class")
    ).toContain("motion-safe:animate-ecg-ltr");

    // Section 2 through Section 10 present in DOM order
    const benefits = screen.getByTestId("pn-learning-benefits");
    const questionExp = screen.getByTestId("pn-question-experience");
    const studyResources = screen.getByTestId("pn-study-resources");
    const featuresShowcase = screen.getByTestId("pn-features-showcase");
    const studyPlans = screen.getByTestId("pn-study-plans");
    const planComparison = screen.getByTestId("pn-plan-comparison");
    const standaloneAssessment = screen.getByTestId("pn-standalone-assessment");
    const finalCta = screen.getByTestId("pn-final-cta");
    const faqSection = screen.getByTestId("pn-faq-section");

    const orderedSections = [
      hero,
      benefits,
      questionExp,
      studyResources,
      featuresShowcase,
      studyPlans,
      planComparison,
      standaloneAssessment,
      finalCta,
      faqSection,
    ];

    for (let i = 0; i < orderedSections.length - 1; i++) {
      const relation = orderedSections[i].compareDocumentPosition(orderedSections[i + 1]);
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("evaluates the interactive NCLEX-PN clinical scenario question and reveals option-by-option rationales", async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <PNPage />
      </CartProvider>
    );

    const questionSection = screen.getByTestId("pn-question-experience");
    const checkBtn = within(questionSection).getByRole("button", {
      name: /Check Answer & View Rationale/i,
    });
    expect(checkBtn).toBeDisabled();

    const correctOption = within(questionSection).getByRole("radio", {
      name: /Stimulate the client, elevate the head of the bed, and apply supplemental oxygen/i,
    });
    await user.click(correctOption);
    expect(checkBtn).toBeEnabled();

    await user.click(checkBtn);

    // Verifies correct rationale, distractor rationales, and clinical takeaway appear
    expect(
      within(questionSection).getByText(/Following the airway and breathing priority framework/i)
    ).toBeInTheDocument();
    expect(
      within(questionSection).getByText(/NCLEX-PN Physiological Integrity & Safety/i)
    ).toBeInTheDocument();

    // Reset question works
    const resetBtn = within(questionSection).getByRole("button", {
      name: /Reset Sample Question/i,
    });
    await user.click(resetBtn);
    expect(
      within(questionSection).getByRole("button", { name: /Check Answer & View Rationale/i })
    ).toBeDisabled();
  });

  it("integrates all 7 real Study Guide domains with working category and topic links", () => {
    render(
      <CartProvider>
        <PNPage />
      </CartProvider>
    );

    const studySection = screen.getByTestId("pn-study-resources");
    expect(
      within(studySection).getByRole("link", { name: /Open Full Nursing Study Guide/i })
    ).toHaveAttribute("href", "/study-guide");

    const expectedSlugs = [
      "medical-surgical",
      "pharmacology",
      "maternal-newborn",
      "pediatrics",
      "mental-health",
      "fundamentals",
      "leadership-delegation",
    ];

    for (const slug of expectedSlugs) {
      const domainCard = within(studySection).getByTestId(`pn-study-domain-${slug}`);
      expect(domainCard).toBeInTheDocument();
    }
  });

  it("supports click and keyboard navigation across the Section 5 Learning Features Showcase tabs", () => {
    render(
      <CartProvider>
        <PNPage />
      </CartProvider>
    );

    const showcase = screen.getByTestId("pn-features-showcase");
    const practiceTab = within(showcase).getByRole("tab", { name: /Question Practice/i });
    const rationalesTab = within(showcase).getByRole("tab", { name: /Answer Rationales/i });
    const studyGuideTab = within(showcase).getByRole("tab", { name: /7-Domain Study Guide/i });

    expect(practiceTab).toHaveAttribute("aria-selected", "true");

    // Keyboard ArrowRight advances to Answer Rationales tab
    fireEvent.keyDown(practiceTab, { key: "ArrowRight" });
    expect(rationalesTab).toHaveAttribute("aria-selected", "true");
    expect(
      within(showcase).getByRole("heading", {
        name: /Understand Why the Correct Action Is Safe/i,
      })
    ).toBeInTheDocument();

    // Click 7-Domain Study Guide tab
    fireEvent.click(studyGuideTab);
    expect(studyGuideTab).toHaveAttribute("aria-selected", "true");
    expect(
      within(showcase).getByRole("link", { name: /Open the Nursing Study Guide/i })
    ).toHaveAttribute("href", "/study-guide");
  });

  it("updates displayed plan prices and savings when switching duration and hands off selected product to cart", async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <PNPage />
        <CartInspector />
      </CartProvider>
    );

    const plansSection = screen.getByTestId("pn-study-plans");

    // Default: 30-Day Monthly Access ($29, $59, $89)
    expect(within(plansSection).getByTestId("pn-plan-price-starter")).toHaveTextContent("$29");
    expect(within(plansSection).getByTestId("pn-plan-price-pro")).toHaveTextContent("$59");
    expect(within(plansSection).getByTestId("pn-plan-price-premium")).toHaveTextContent("$89");

    // Toggle to 90-Day Quarterly Access ($75, $149, $229)
    const quarterToggle = within(plansSection).getByTestId("duration-toggle-quarter");
    await user.click(quarterToggle);
    expect(quarterToggle).toHaveAttribute("aria-pressed", "true");

    expect(within(plansSection).getByTestId("pn-plan-price-starter")).toHaveTextContent("$75");
    expect(within(plansSection).getByTestId("pn-plan-price-pro")).toHaveTextContent("$149");
    expect(within(plansSection).getByTestId("pn-plan-price-premium")).toHaveTextContent("$229");
    expect(
      within(plansSection).getByText(/Save \$28 USD compared to 3 separate monthly renewals/i)
    ).toBeInTheDocument();

    // Select 90-day PN Complete Preparation (pn-pro-90)
    const selectPro90Btn = within(plansSection).getByTestId("select-plan-pn-pro-90");
    await user.click(selectPro90Btn);

    expect(screen.getByTestId("cart-item-ids")).toHaveTextContent("pn-pro-90");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("149");
    expect(pushMock).toHaveBeenCalledWith("/cart?add=pn-pro-90");
  });

  it("supports adding the standalone NCLEX-PN Readiness Assessment Pack ($39) to the cart", async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <PNPage />
        <CartInspector />
      </CartProvider>
    );

    const readinessSection = screen.getByTestId("pn-standalone-assessment");
    const addPackBtn = within(readinessSection).getByTestId("select-plan-pn-readiness");
    await user.click(addPackBtn);

    expect(screen.getByTestId("cart-item-ids")).toHaveTextContent("pn-readiness");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("39");
    expect(pushMock).toHaveBeenCalledWith("/cart?add=pn-readiness");
  });

  it("toggles FAQ accordion items with accessible aria-expanded attributes and configures accurate SEO metadata", async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <PNPage />
      </CartProvider>
    );

    const faqSection = screen.getByTestId("pn-faq-section");
    const firstFaqBtn = within(faqSection).getByRole("button", {
      name: /What is PrepFord's NCLEX-PN preparation pathway designed for\?/i,
    });
    const secondFaqBtn = within(faqSection).getByRole("button", {
      name: /What learning resources are currently available for NCLEX-PN candidates\?/i,
    });

    expect(firstFaqBtn).toHaveAttribute("aria-expanded", "true");
    expect(secondFaqBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(secondFaqBtn);
    expect(secondFaqBtn).toHaveAttribute("aria-expanded", "true");
    expect(firstFaqBtn).toHaveAttribute("aria-expanded", "false");

    // Verify SEO metadata
    expect(pnMetadata.title).toEqual({
      absolute: "NCLEX-PN Exam Preparation | PrepFord",
    });
    expect(pnMetadata.description).toBe(
      "Explore PrepFord’s NCLEX-PN preparation resources, nursing study guides, practice tools, and available study plans to support your exam preparation."
    );
    expect(pnMetadata.alternates?.canonical).toBe("/nclex-pn");
  });
});
