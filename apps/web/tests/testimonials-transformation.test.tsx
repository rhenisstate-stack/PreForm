import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import * as React from "react";

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, priority, ...props }: React.ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} data-priority={priority ? "true" : undefined} {...props} />;
  },
}));

import { TestimonialsPageClient } from "@/app/testimonials/page-client";

describe("Phase 3: PrepFord Testimonials Page Transformation", () => {
  it("renders the dedicated testimonials hero with heading, copy, and real hero image", () => {
    render(<TestimonialsPageClient />);

    // 1. Heading
    expect(
      screen.getByRole("heading", { level: 1, name: /Real Progress\. Meaningful Preparation\./i })
    ).toBeInTheDocument();

    // 2. Supporting copy
    expect(
      screen.getByText(/Discover how nursing candidates leverage PrepFord’s structured clinical rationales/i)
    ).toBeInTheDocument();

    // 3. Primary and secondary CTAs leading to real routes
    const primaryCta = screen.getByRole("link", { name: /Start Free Practice/i });
    expect(primaryCta).toBeInTheDocument();
    expect(primaryCta).toHaveAttribute("href", "/courses?type=practice");

    const secondaryCta = screen.getByRole("link", { name: /Compare Study Plans/i });
    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveAttribute("href", "/subscriptions");

    // 4. Hero image
    const heroImg = screen.getByAltText(/Confident smiling nursing graduate in clinical scrubs holding graduation cap/i);
    expect(heroImg).toBeInTheDocument();
    expect(heroImg).toHaveAttribute("src", "/images/testimonials/prepford-testimonials-hero.jpg");
    expect(heroImg).toHaveAttribute("data-priority", "true");
  });

  it("renders floating decorative elements with Lucide icons hidden from screen readers", () => {
    const { container } = render(<TestimonialsPageClient />);

    // Floating items have aria-hidden="true"
    const floatingElements = container.querySelectorAll('[aria-hidden="true"]');
    expect(floatingElements.length).toBeGreaterThan(0);

    // Verify key floating badge texts
    expect(screen.getByText("Clinical Rationales")).toBeInTheDocument();
    expect(screen.getByText("RN & PN Pathways")).toBeInTheDocument();
    expect(screen.getByText("Clinical Judgment")).toBeInTheDocument();
    expect(screen.getByText("Bedside Ready")).toBeInTheDocument();
  });

  it("renders truthful feature highlights without fabricated pass rates", () => {
    render(<TestimonialsPageClient />);

    // Truthful features
    expect(screen.getByText("2 Licensure Tracks")).toBeInTheDocument();
    expect(screen.getByText("7 Clinical Domains")).toBeInTheDocument();
    expect(screen.getByText("Unfolding Case Studies")).toBeInTheDocument();
    expect(screen.getByText("100% In-Depth Rationales")).toBeInTheDocument();

    // Confirm no fake statistics
    expect(screen.queryByText(/99% pass rate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/100,000 students passed/i)).not.toBeInTheDocument();
  });

  it("supports pathway filtering across candidate reflections", () => {
    render(<TestimonialsPageClient />);

    const tablist = screen.getByRole("tablist", { name: /Filter by exam pathway/i });
    expect(tablist).toBeInTheDocument();

    const allBtn = within(tablist).getByRole("tab", { name: /All Scenarios/i });
    const rnBtn = within(tablist).getByRole("tab", { name: /NCLEX-RN/i });
    const pnBtn = within(tablist).getByRole("tab", { name: /NCLEX-PN/i });

    expect(allBtn).toHaveAttribute("aria-selected", "true");

    // Click PN filter
    fireEvent.click(pnBtn);
    expect(pnBtn).toHaveAttribute("aria-selected", "true");
    expect(allBtn).toHaveAttribute("aria-selected", "false");

    // Click RN filter
    fireEvent.click(rnBtn);
    expect(rnBtn).toHaveAttribute("aria-selected", "true");
  });

  it("provides transparent disclosure safeguard notice", () => {
    render(<TestimonialsPageClient />);

    expect(screen.getByText(/Transparency Notice:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Live verified student survey reviews will be published as our initial post-examination survey cohorts conclude/i)
    ).toBeInTheDocument();
  });

  it("supports expanding and collapsing long candidate reflections", () => {
    render(<TestimonialsPageClient />);

    const expandButtons = screen.getAllByRole("button", { name: /Read full reflection/i });
    expect(expandButtons.length).toBeGreaterThan(0);

    // Click expand
    fireEvent.click(expandButtons[0]);
    expect(screen.getByRole("button", { name: /Show less/i })).toBeInTheDocument();

    // Click collapse
    fireEvent.click(screen.getByRole("button", { name: /Show less/i }));
    expect(screen.getAllByRole("button", { name: /Read full reflection/i }).length).toBeGreaterThan(0);
  });

  it("renders closing CTA section linking to real courses and subscriptions", () => {
    render(<TestimonialsPageClient />);

    expect(screen.getByText(/Ready to Strengthen Your Clinical Judgment\?/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore PrepFord Courses/i })).toHaveAttribute("href", "/courses");
    expect(screen.getByRole("link", { name: /View Subscription Plans/i })).toHaveAttribute("href", "/subscriptions");
  });
});
