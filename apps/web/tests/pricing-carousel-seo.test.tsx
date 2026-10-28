import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

  it("renders the initial slide with Archer-inspired copy and controls", () => {
    render(<HeroSection />);

    // Verify slide 1 headline
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeInTheDocument();

    // Verify counter
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 01 of 04");

    // Verify controls exist
    expect(screen.getByTestId("hero-carousel-prev")).toBeInTheDocument();
    expect(screen.getByTestId("hero-carousel-next")).toBeInTheDocument();
    expect(screen.getByTestId("hero-carousel-play-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("hero-carousel-dot-0")).toBeInTheDocument();
  });

  it("advances slides when clicking next and wraps backwards when clicking previous", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    const nextBtn = screen.getByTestId("hero-carousel-next");
    const prevBtn = screen.getByTestId("hero-carousel-prev");

    // Click Next -> Slide 2 (EHR Unfolding Cases / NGN)
    await user.click(nextBtn);
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 02 of 04");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master Clinical Judgment with EHR Unfolding Cases\./i,
      })
    ).toBeInTheDocument();

    // Click Next -> Slide 3 (Study Guide)
    await user.click(nextBtn);
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 03 of 04");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Master High-Yield Clinical Concepts Across 7 Nursing Domains\./i,
      })
    ).toBeInTheDocument();

    // Click Prev -> back to Slide 2
    await user.click(prevBtn);
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 02 of 04");

    // Click Prev twice -> Slide 1 then wrap to Slide 4
    await user.click(prevBtn);
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 01 of 04");
    await user.click(prevBtn);
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 04 of 04");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Transparent Clinical Readiness Insights for Confident Exam Day\./i,
      })
    ).toBeInTheDocument();
  });

  it("allows selecting a specific slide via dot indicator pills", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    const dot2 = screen.getByTestId("hero-carousel-dot-2");
    await user.click(dot2);

    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 03 of 04");
  });

  it("toggles autoplay pause state via the play/pause button", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    const toggleBtn = screen.getByTestId("hero-carousel-play-toggle");
    expect(toggleBtn).toHaveAttribute("aria-label", "Pause automatic slide rotation");

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-label", "Start automatic slide rotation");

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-label", "Pause automatic slide rotation");
  });

  it("supports keyboard arrow navigation (ArrowLeft & ArrowRight)", () => {
    render(<HeroSection />);

    const carousel = screen.getByRole("region", { name: /PrepFord NCLEX Hero/i });

    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 02 of 04");

    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    expect(screen.getByTestId("hero-slide-counter")).toHaveTextContent("Slide 01 of 04");
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
    expect(urls).toContain("https://prepfordnclex.com/");
    expect(urls).toContain("https://prepfordnclex.com/nclex-rn");
    expect(urls).toContain("https://prepfordnclex.com/nclex-pn");
    expect(urls).toContain("https://prepfordnclex.com/subscriptions");
    expect(urls).toContain("https://prepfordnclex.com/study-guide");

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
