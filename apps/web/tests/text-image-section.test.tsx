import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { ArrowRight, BookOpen, Stethoscope } from "lucide-react";
import {
  TextImageSection,
  type TextImageSectionProps,
} from "@/components/ui/text-image-section";

describe("PrepFord Archer-Inspired TextImageSection Component", () => {
  const defaultProps: TextImageSectionProps = {
    id: "test-feature",
    dataTestId: "test-feature-section",
    eyebrow: "Next Gen Clinical Reasoning",
    heading: "Master NCLEX Decision Making with EHR Unfolding Cases",
    description: "Analyze progressive nurses' notes and lab flowsheets structured around the 6 cognitive operations of the CJMM.",
    imageSrc: "/images/illustrations/prepford-ehr-unfolding-case.png",
    imageAlt: "Candidate reviewing Next Gen NCLEX electronic health record scenario",
    primaryAction: {
      label: "Explore Case Studies",
      href: "/courses",
      icon: Stethoscope,
      dataTestId: "primary-action-btn",
    },
    secondaryAction: {
      label: "View Study Guide",
      href: "/study-guide",
      icon: BookOpen,
      dataTestId: "secondary-action-btn",
    },
  };

  it("renders heading, eyebrow, description, and action buttons with accessible attributes", () => {
    render(<TextImageSection {...defaultProps} />);

    expect(screen.getByRole("heading", { level: 2, name: /Master NCLEX Decision Making with EHR Unfolding Cases/i })).toBeInTheDocument();
    expect(screen.getByText("Next Gen Clinical Reasoning")).toBeInTheDocument();
    expect(screen.getByText(/Analyze progressive nurses' notes and lab flowsheets/i)).toBeInTheDocument();

    const primaryBtn = screen.getByTestId("primary-action-btn");
    expect(primaryBtn).toBeInTheDocument();
    expect(primaryBtn).toHaveAttribute("href", "/courses");
    expect(primaryBtn).toHaveTextContent("Explore Case Studies");

    const secondaryBtn = screen.getByTestId("secondary-action-btn");
    expect(secondaryBtn).toBeInTheDocument();
    expect(secondaryBtn).toHaveAttribute("href", "/study-guide");
    expect(secondaryBtn).toHaveTextContent("View Study Guide");

    const img = screen.getByAltText("Candidate reviewing Next Gen NCLEX electronic health record scenario");
    expect(img).toBeInTheDocument();
  });

  it("supports configurable heading levels (h1, h2, h3)", () => {
    const { rerender } = render(<TextImageSection {...defaultProps} headingLevel="h1" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

    rerender(<TextImageSection {...defaultProps} headingLevel="h3" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("coordinates two-column layout with imagePosition='right' by default", () => {
    render(<TextImageSection {...defaultProps} imagePosition="right" />);

    const contentCol = screen.getByTestId("test-feature-section-content").parentElement;
    const visualCol = screen.getByTestId("test-feature-section-visual").parentElement;

    expect(contentCol).toHaveClass("lg:col-span-6");
    expect(visualCol).toHaveClass("lg:col-span-6");
    expect(contentCol).toHaveClass("lg:order-1");
    expect(visualCol).toHaveClass("lg:order-2");
  });

  it("alternates layout when imagePosition='left' is specified", () => {
    render(<TextImageSection {...defaultProps} imagePosition="left" />);

    const contentCol = screen.getByTestId("test-feature-section-content").parentElement;
    const visualCol = screen.getByTestId("test-feature-section-visual").parentElement;

    // With imagePosition="left", visual is in the first column, content in the second
    expect(visualCol).toHaveClass("lg:order-1");
    expect(contentCol).toHaveClass("lg:order-2");
  });

  it("renders rich React children such as feature checklists and badges", () => {
    render(
      <TextImageSection {...defaultProps}>
        <ul data-testid="custom-checklist" className="space-y-2">
          <li>Multi-tab EHR flowsheets</li>
          <li>6-step NCSBN cognitive operations</li>
        </ul>
      </TextImageSection>
    );

    expect(screen.getByTestId("custom-checklist")).toBeInTheDocument();
    expect(screen.getByText("Multi-tab EHR flowsheets")).toBeInTheDocument();
    expect(screen.getByText("6-step NCSBN cognitive operations")).toBeInTheDocument();
  });

  it("renders image badge overlay and image caption when provided", () => {
    render(
      <TextImageSection
        {...defaultProps}
        imageBadge="Next Gen NCLEX Format"
        imageCaption="Figure 1.1: Unfolding patient chart simulation"
      />
    );

    expect(screen.getByText("Next Gen NCLEX Format")).toBeInTheDocument();
    expect(screen.getByText("Figure 1.1: Unfolding patient chart simulation")).toBeInTheDocument();
  });

  it("falls back to fallbackImageSrc when image fails to load", () => {
    render(
      <TextImageSection
        {...defaultProps}
        imageSrc="/images/broken-image.png"
        fallbackImageSrc="/images/illustrations/prepford-landing-hero.png"
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("broken-image.png"));

    // Simulate error
    fireEvent.error(img);

    expect(img).toHaveAttribute("src", expect.stringContaining("prepford-landing-hero.png"));
  });

  it("renders custom visual slot when customVisual prop is provided", () => {
    render(
      <TextImageSection
        {...defaultProps}
        customVisual={<div data-testid="custom-workbench">Interactive Workbench</div>}
      />
    );

    expect(screen.getByTestId("custom-workbench")).toBeInTheDocument();
    expect(screen.getByText("Interactive Workbench")).toBeInTheDocument();
  });

  it("applies variant styling classes for card, feature, and muted", () => {
    const { container, rerender } = render(
      <TextImageSection {...defaultProps} variant="card" />
    );
    expect(container.querySelector(".bg-card")).toBeInTheDocument();

    rerender(<TextImageSection {...defaultProps} variant="feature" />);
    expect(container.querySelector(".from-slate-900")).toBeInTheDocument();

    rerender(<TextImageSection {...defaultProps} variant="muted" />);
    expect(container.querySelector(".bg-muted\\/40")).toBeInTheDocument();
  });

  it("supports configurable column ratios (60-40 and 40-60)", () => {
    const { rerender } = render(
      <TextImageSection {...defaultProps} columnRatio="60-40" imagePosition="right" />
    );
    const textCol60 = screen.getByTestId("test-feature-section-content").parentElement;
    const visualCol40 = screen.getByTestId("test-feature-section-visual").parentElement;
    expect(textCol60).toHaveClass("lg:col-span-7");
    expect(visualCol40).toHaveClass("lg:col-span-5");

    rerender(
      <TextImageSection {...defaultProps} columnRatio="40-60" imagePosition="right" />
    );
    const textCol40 = screen.getByTestId("test-feature-section-content").parentElement;
    const visualCol60 = screen.getByTestId("test-feature-section-visual").parentElement;
    expect(textCol40).toHaveClass("lg:col-span-5");
    expect(visualCol60).toHaveClass("lg:col-span-7");
  });

  it("supports mobileImageOrder='first' so visual leads on small viewports", () => {
    render(
      <TextImageSection {...defaultProps} imagePosition="right" mobileImageOrder="first" />
    );
    const contentCol = screen.getByTestId("test-feature-section-content").parentElement;
    const visualCol = screen.getByTestId("test-feature-section-visual").parentElement;

    expect(visualCol).toHaveClass("order-1");
    expect(contentCol).toHaveClass("order-2");
  });
});
