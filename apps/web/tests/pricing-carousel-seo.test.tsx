import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroSection } from "@/components/home/hero-section";
import { SubscriptionsPageClient } from "@/app/subscriptions/page-client";
import PublicHeader from "@/components/layout/public-header";
import PublicFooter from "@/components/layout/public-footer";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock use-api hook for SubscriptionsPageClient
vi.mock("@/hooks/use-api", () => ({
  useProgrammes: () => ({
    data: [
      { code: "RN", displayName: "Registered Nurse (NCLEX-RN)", isActive: true },
      { code: "PN", displayName: "Practical Nurse (NCLEX-PN)", isActive: true },
    ],
  }),
}));

// Mock auth & cart context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    itemCount: 0,
    items: [],
  }),
}));

describe("Homepage Hero Experience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the authoritative headline and primary pathway CTAs without manual carousel controls", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    // Verify manual carousel controls and counters are not present
    expect(screen.queryByTestId("hero-slide-counter")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-prev")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-next")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-play-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-dot-0")).not.toBeInTheDocument();

    // Verify primary RN & PN CTAs
    expect(screen.getByTestId("home-cta-explore-rn")).toHaveAttribute("href", "/nclex-rn");
    expect(screen.getByTestId("home-cta-explore-pn")).toHaveAttribute("href", "/nclex-pn");
  });

  it("renders decorative autoplay background video with accessibility safeguards", () => {
    const { container } = render(<HeroSection />);

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("aria-hidden", "true");
    expect(video).toHaveProperty("muted", true);
    expect(video).toHaveProperty("loop", true);
    expect(video).toHaveProperty("playsInline", true);
  });

  it("preserves hero section landmark and trust badges", () => {
    render(<HeroSection />);

    const hero = screen.getByTestId("hero-section");
    expect(hero).toBeInTheDocument();
    expect(screen.getByText(/NCLEX-RN & NCLEX-PN Learning Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Practice nursing questions, strengthen your clinical judgment/i)).toBeInTheDocument();
  });
});

describe("Pricing UI/UX Repair across Subscriptions", () => {
  it("renders compact, overflow-safe CTA button labels with full accessible screen-reader names", () => {
    render(<SubscriptionsPageClient />);

    const starterBtn = screen.getByRole("link", { name: /Choose Starter Plan for \$29 per month/i });
    expect(starterBtn).toBeInTheDocument();
    expect(starterBtn).toHaveAttribute("href", "/cart?add=rn-starter");

    const proBtn = screen.getByRole("link", { name: /Choose Pro Plan for \$59 per month/i });
    expect(proBtn).toBeInTheDocument();
    expect(proBtn).toHaveAttribute("href", "/cart?add=rn-pro");

    const premiumBtn = screen.getByRole("link", { name: /Choose Premium Plan for \$89 per month/i });
    expect(premiumBtn).toBeInTheDocument();
    expect(premiumBtn).toHaveAttribute("href", "/cart?add=prep-premium");
  });
});

describe("PrepFord Brand Wordmark Tight Layout", () => {
  it("renders stacked wordmark in header with data-testid and tight line-height", () => {
    render(<PublicHeader />);

    const wordmark = screen.getByTestId("brand-wordmark-stacked");
    expect(wordmark).toBeInTheDocument();
    expect(wordmark.className).toContain("leading-none");
    expect(within(wordmark).getByText("Prep")).toHaveClass("leading-none");
    expect(within(wordmark).getByText("Ford")).toHaveClass("leading-none");
  });

  it("renders stacked wordmark in footer with data-testid and tight line-height", () => {
    render(<PublicFooter />);

    const wordmark = screen.getByTestId("brand-wordmark-stacked");
    expect(wordmark).toBeInTheDocument();
    expect(wordmark.className).toContain("leading-none");
  });
});

describe("Sitemap & Robots Infrastructure", () => {
  it("generates a comprehensive sitemap covering all canonical routes", () => {
    const siteMapEntries = sitemap();
    expect(siteMapEntries.length).toBeGreaterThan(20);

    const urls = siteMapEntries.map((e) => e.url);
    expect(urls.some((u) => u.replace(/^https?:\/\/[^/]+/, "") === "/")).toBe(true);
    expect(urls.some((u) => u.endsWith("/nclex-rn"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/nclex-pn"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/subscriptions"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/study-guide"))).toBe(true);

    // Must not contain private/internal routes
    expect(urls.some((u) => u.includes("/dashboard"))).toBe(false);
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
    expect(urls.some((u) => u.includes("/cart"))).toBe(false);
    expect(urls.some((u) => u.includes("/sign-in"))).toBe(false);
  });

  it("configures robots.txt disallowing private routes and referencing sitemap.xml", () => {
    const robotsRules = robots();
    expect(robotsRules.sitemap).toBe("https://prepfordnclex.com/sitemap.xml");

    const rules = Array.isArray(robotsRules.rules) ? robotsRules.rules[0] : robotsRules.rules;
    expect(rules.disallow).toContain("/dashboard");
    expect(rules.disallow).toContain("/admin");
    expect(rules.disallow).toContain("/profile");
    expect(rules.disallow).toContain("/cart");
    expect(rules.disallow).toContain("/sign-in");
    expect(rules.disallow).toContain("/sign-up");
  });
});
