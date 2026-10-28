import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { FAQPageClient, FAQ_CATEGORIES, OVERALL_FAQ_ITEMS } from "@/app/faq/page-client";

describe("PrepFord Overall FAQ Page (/faq)", () => {
  it("renders 30 structured FAQ items across 10 distinct categories", () => {
    render(<FAQPageClient />);

    expect(FAQ_CATEGORIES.length).toBe(10);
    expect(OVERALL_FAQ_ITEMS.length).toBe(30);

    const faqPage = screen.getByTestId("overall-faq-page");
    expect(within(faqPage).getByRole("heading", { name: "Frequently Asked Questions" })).toBeInTheDocument();

    for (const cat of FAQ_CATEGORIES) {
      expect(screen.getByTestId(`faq-category-section-${cat.id}`)).toBeInTheDocument();
    }
  });

  it("supports category tab filtering", async () => {
    const user = userEvent.setup();
    render(<FAQPageClient />);

    // Click category 7: Study-Plan Selection, Durations & Pricing
    const pricingTab = screen.getByTestId("faq-category-tab-plans-pricing");
    await user.click(pricingTab);

    expect(screen.getByTestId("faq-category-section-plans-pricing")).toBeInTheDocument();
    expect(screen.queryByTestId("faq-category-section-getting-started")).not.toBeInTheDocument();

    // Click back to All Categories
    const allTab = screen.getByTestId("faq-category-tab-all");
    await user.click(allTab);
    expect(screen.getByTestId("faq-category-section-getting-started")).toBeInTheDocument();
    expect(screen.getByTestId("faq-category-section-plans-pricing")).toBeInTheDocument();
  });

  it("filters questions in real time using the search input", async () => {
    const user = userEvent.setup();
    render(<FAQPageClient />);

    const searchInput = screen.getByTestId("faq-search-input");
    await user.type(searchInput, "quarterly savings");

    expect(
      screen.getByText(/How are the 90-day quarterly savings calculated\?/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/How do I create a PrepFord learner account\?/i)
    ).not.toBeInTheDocument();
  });

  it("toggles accordion items with accessible aria-expanded and aria-controls attributes", async () => {
    const user = userEvent.setup();
    render(<FAQPageClient />);

    // First item is open by default
    const firstBtn = screen.getByTestId("overall-faq-btn-faq-overall-what-is-prepford");
    expect(firstBtn).toHaveAttribute("aria-expanded", "true");

    const secondBtn = screen.getByTestId("overall-faq-btn-faq-overall-create-account");
    expect(secondBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(secondBtn);
    expect(secondBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("supports Expand All and Collapse All convenience controls", async () => {
    const user = userEvent.setup();
    render(<FAQPageClient />);

    const collapseBtn = screen.getByTestId("faq-collapse-all");
    await user.click(collapseBtn);

    const firstBtn = screen.getByTestId("overall-faq-btn-faq-overall-what-is-prepford");
    expect(firstBtn).toHaveAttribute("aria-expanded", "false");

    const expandBtn = screen.getByTestId("faq-expand-all");
    await user.click(expandBtn);
    expect(firstBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("verifies accurate catalogue pricing, sandbox checkout disclosure, and no-pass-guarantee disclaimer", () => {
    render(<FAQPageClient />);

    // Accurate prices in the FAQ text
    expect(
      screen.getByText(/Starter Review is \$29\/30 days or \$75\/90 days/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Complete Preparation \(Pro\) is \$59\/30 days or \$149\/90 days/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/NCLEX-RN & PN All-Access is \$89\/30 days or \$229\/90 days/i)
    ).toBeInTheDocument();

    // Sandbox checkout disclosure
    expect(
      screen.getByText(/Checkout on \/cart currently operates in Phase 4 developer sandbox entitlement mode/i)
    ).toBeInTheDocument();

    // No pass guarantee disclaimer
    expect(
      screen.getByText(/PrepFord does not offer pass guarantees, pass-rate promises, or official exam score predictions/i)
    ).toBeInTheDocument();
  });
});
