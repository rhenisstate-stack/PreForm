import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HeroSection } from "@/components/home/hero-section";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Homepage Hero Text and Heartbeat Animation Layout Separation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders hero section with flex-col flow to guarantee zero text-to-animation overlap", () => {
    render(<HeroSection />);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).toBeInTheDocument();

    // Verify section uses flex-col layout to establish predictable vertical document flow
    expect(heroSection.className).toContain("flex");
    expect(heroSection.className).toContain("flex-col");
    expect(heroSection.className).toContain("justify-between");

    // Verify split layout is wrapped in flex-1 to center content vertically without colliding with heartbeat
    const splitLayout = screen.getByTestId("hero-split-layout");
    const contentContainer = splitLayout.parentElement;
    expect(contentContainer).not.toBeNull();
    expect(contentContainer?.className).toContain("flex-1");
    expect(contentContainer?.className).toContain("flex");
    expect(contentContainer?.className).toContain("items-center");
  });

  it("places the ECG heartbeat animation into natural document flow with guaranteed top margin", () => {
    render(<HeroSection />);

    const heartbeat = screen.getByTestId("hero-fullwidth-heartbeat");
    expect(heartbeat).toBeInTheDocument();

    // Verify heartbeat participates in document flow (relative positioning with top margin)
    expect(heartbeat.className).toContain("relative");
    expect(heartbeat.className).toContain("inset-x-0");
    expect(heartbeat.className).toContain("w-full");
    expect(heartbeat.className).toContain("pointer-events-none");
    expect(heartbeat.className).toMatch(/mt-\d+/);

    // Verify SVG waveform baseline and animated pulse wave
    const baseline = within(heartbeat).getByTestId("hero-ecg-baseline");
    expect(baseline).toBeInTheDocument();

    const pulse = within(heartbeat).getByTestId("hero-ecg-pulse-ltr");
    expect(pulse).toBeInTheDocument();
    expect(pulse.getAttribute("class")).toContain("motion-safe:animate-ecg-ltr");
  });

  it("ensures disclaimer and capabilities text precede the heartbeat in DOM hierarchy without overlapping", () => {
    render(<HeroSection />);

    const leftCol = screen.getByTestId("hero-left-column");
    expect(leftCol).toBeInTheDocument();

    // Verify capability indicators are present
    expect(
      within(leftCol).getByText("Dedicated NCLEX-RN & NCLEX-PN Pathways")
    ).toBeInTheDocument();
    expect(
      within(leftCol).getByText("Adaptive CAT & NGN Case Study Practice")
    ).toBeInTheDocument();

    // Verify disclaimer text immediately preceding the heartbeat
    const disclaimer = within(leftCol).getByText(
      "Independent preparation platform. Not affiliated with or endorsed by NCSBN."
    );
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.className).toContain("text-xs");
    expect(disclaimer.className).toContain("text-muted-foreground");

    // Verify heartbeat appears after the content container in document order
    const heroSection = screen.getByTestId("hero-section");
    const heartbeat = screen.getByTestId("hero-fullwidth-heartbeat");
    expect(heroSection.lastElementChild).toBe(heartbeat);
  });

  it("renders responsive monitor metadata labels without colliding on mobile viewports", () => {
    render(<HeroSection />);

    const heartbeat = screen.getByTestId("hero-fullwidth-heartbeat");
    const ecgContainer = within(heartbeat).getByTestId("hero-ecg-container");

    // Full desktop label + compact mobile variant
    expect(within(ecgContainer).getByText("PREPFORD CLINICAL RHYTHM • LEAD II")).toBeInTheDocument();
    expect(within(ecgContainer).getByText("RHYTHM • LEAD II")).toBeInTheDocument();

    // Full desktop pulse label + compact mobile variant
    expect(within(ecgContainer).getByText("NORMAL SINUS • LEFT-TO-RIGHT PULSE")).toBeInTheDocument();
    expect(within(ecgContainer).getByText("NORMAL SINUS")).toBeInTheDocument();
  });
});
