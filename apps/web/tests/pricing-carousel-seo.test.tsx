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

describe("Homepage Hero Animated Carousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the initial slide with Archer-inspired copy and seamless visual integration without manual controls", () => {
    render(<HeroSection />);

    // Verify slide 1 headline
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    // Verify manual controls and counters are removed in accordance with Archer Review inspiration
    expect(screen.queryByTestId("hero-slide-counter")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-prev")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-next")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-play-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hero-carousel-dot-0")).not.toBeInTheDocument();

    // Verify right column image is seamlessly integrated without artificial white card frame
    const rightCol = screen.getByTestId("hero-right-column");
    expect(within(rightCol).getByRole("img")).toBeInTheDocument();
  });

  it("automatically cycles slides using 7000ms autoplay interval", () => {
    vi.useFakeTimers();
    render(<HeroSection />);

    // Initial: Slide 1
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    // Advance 7000ms -> Slide 2 (NGN Unfolding Cases)
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master Clinical Judgment with EHR Unfolding Cases\./i,
      })
    ).toBeInTheDocument();

    // Advance 7000ms -> Slide 3 (Study Guide)
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master High-Yield Clinical Concepts Across 7 Nursing Domains\./i,
      })
    ).toBeInTheDocument();

    // Advance 7000ms -> Slide 4 (Readiness Insights)
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Transparent Clinical Readiness Insights for Confident Exam Day\./i,
      })
    ).toBeInTheDocument();

    // Advance 7000ms -> Wrap back to Slide 1
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();
  });

  it("pauses automatic slide advancement when user hovers over hero section and resumes on leave", () => {
    vi.useFakeTimers();
    render(<HeroSection />);

    const hero = screen.getByTestId("hero-section");

    // Mouse enters hero -> should pause
    fireEvent.mouseEnter(hero);

    // Advance 14000ms while hovered -> should stay on Slide 1
    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    // Mouse leaves hero -> should resume
    fireEvent.mouseLeave(hero);

    // Advance 7000ms -> advances to Slide 2
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master Clinical Judgment with EHR Unfolding Cases\./i,
      })
    ).toBeInTheDocument();
  });

  it("pauses automatic slide advancement when user focuses within hero section and resumes on blur", () => {
    vi.useFakeTimers();
    render(<HeroSection />);

    const hero = screen.getByTestId("hero-section");

    // Focus enters hero -> should pause
    fireEvent.focusIn(hero);

    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    // Blur from hero -> should resume
    fireEvent.focusOut(hero);

    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master Clinical Judgment with EHR Unfolding Cases\./i,
      })
    ).toBeInTheDocument();
  });

  it("supports keyboard arrow navigation (ArrowLeft & ArrowRight)", () => {
    render(<HeroSection />);

    const carousel = screen.getByRole("region", { name: /PrepFord NCLEX Hero/i });

    // ArrowRight advances to Slide 2
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master Clinical Judgment with EHR Unfolding Cases\./i,
      })
    ).toBeInTheDocument();

    // ArrowLeft goes back to Slide 1
    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();
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
