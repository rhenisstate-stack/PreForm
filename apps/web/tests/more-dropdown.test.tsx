import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PublicHeader from "@/components/layout/public-header";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock hooks
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

describe("PublicHeader — 'More' Dropdown & Navigation Enhancement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'More' button in desktop navigation and toggles dropdown on click", () => {
    render(<PublicHeader />);

    const moreTrigger = screen.getByRole("button", { name: /^More$/i });
    expect(moreTrigger).toBeInTheDocument();
    expect(moreTrigger).toHaveAttribute("aria-expanded", "false");

    // Click to open
    fireEvent.click(moreTrigger);
    expect(moreTrigger).toHaveAttribute("aria-expanded", "true");

    // Verify all 5 items exist with correct hrefs
    const testimonialsLink = screen.getByRole("link", { name: /Testimonials/i });
    expect(testimonialsLink).toBeInTheDocument();
    expect(testimonialsLink).toHaveAttribute("href", "/testimonials");

    const blogLink = screen.getByRole("link", { name: /Blog/i });
    expect(blogLink).toBeInTheDocument();
    expect(blogLink).toHaveAttribute("href", "/blog");

    const studyGuidesLink = screen.getByRole("link", { name: /Study Guides/i });
    expect(studyGuidesLink).toBeInTheDocument();
    expect(studyGuidesLink).toHaveAttribute("href", "/study-guide");

    const aboutLink = screen.getByRole("link", { name: /About PrepFord/i });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute("href", "/about");

    const contactLink = screen.getByRole("link", { name: /Contact/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute("href", "/contact");
  });

  it("closes the 'More' dropdown when Escape key is pressed", () => {
    render(<PublicHeader />);

    const moreTrigger = screen.getByRole("button", { name: /^More$/i });
    fireEvent.click(moreTrigger);
    expect(moreTrigger).toHaveAttribute("aria-expanded", "true");

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(moreTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the 'More' dropdown when clicking outside the navigation container", () => {
    render(
      <div>
        <div data-testid="outside-element">Outside</div>
        <PublicHeader />
      </div>
    );

    const moreTrigger = screen.getByRole("button", { name: /^More$/i });
    fireEvent.click(moreTrigger);
    expect(moreTrigger).toHaveAttribute("aria-expanded", "true");

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside-element"));
    expect(moreTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("renders all 'More' destinations inside the mobile navigation drawer when opened", () => {
    render(<PublicHeader />);

    // Mobile menu starts closed
    expect(screen.queryByTestId("mobile-navigation-drawer")).not.toBeInTheDocument();

    // Click mobile hamburger toggle
    const mobileToggle = screen.getByRole("button", { name: /Open menu/i });
    fireEvent.click(mobileToggle);

    const mobileDrawer = screen.getByTestId("mobile-navigation-drawer");
    expect(mobileDrawer).toBeInTheDocument();

    // Verify all items are accessible in mobile view
    expect(within(mobileDrawer).getByRole("link", { name: /Testimonials/i })).toHaveAttribute("href", "/testimonials");
    expect(within(mobileDrawer).getByRole("link", { name: /Blog/i })).toHaveAttribute("href", "/blog");
    expect(within(mobileDrawer).getByRole("link", { name: /About PrepFord/i })).toHaveAttribute("href", "/about");
    expect(within(mobileDrawer).getByRole("link", { name: /Contact Us/i })).toHaveAttribute("href", "/contact");
    expect(within(mobileDrawer).getByRole("link", { name: /Study Guide & Notes/i })).toHaveAttribute("href", "/study-guide");

    // Close mobile menu
    const closeToggle = screen.getByRole("button", { name: /Close menu/i });
    fireEvent.click(closeToggle);
    expect(screen.queryByTestId("mobile-navigation-drawer")).not.toBeInTheDocument();
  });
});
