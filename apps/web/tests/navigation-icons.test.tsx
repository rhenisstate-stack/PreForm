import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import * as React from "react";

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
    mounted: true,
    resolvedTheme: "light",
  }),
}));

import PublicHeader from "@/components/layout/public-header";
import { ProfileMenu } from "@/components/layout/notification-panel";

describe("Phase 4: Navigation with Icons Transformation", () => {
  it("renders Lucide icons across desktop navigation dropdown items", () => {
    const { container } = render(<PublicHeader />);

    // 1. Nursing dropdown
    const nursingTrigger = screen.getByRole("button", { name: /^Nursing$/i });
    fireEvent.click(nursingTrigger);

    const rnLink = screen.getByRole("link", { name: /NCLEX-RN/i });
    expect(rnLink).toBeInTheDocument();
    expect(rnLink.querySelector("svg")).toBeInTheDocument();

    const pnLink = screen.getByRole("link", { name: /NCLEX-PN/i });
    expect(pnLink).toBeInTheDocument();
    expect(pnLink.querySelector("svg")).toBeInTheDocument();

    const allCoursesLink = screen.getByRole("link", { name: /All Nursing Courses/i });
    expect(allCoursesLink).toBeInTheDocument();
    expect(allCoursesLink.querySelector("svg")).toBeInTheDocument();

    // 2. Study Guide dropdown
    const studyGuideTrigger = screen.getByRole("button", { name: /Open Study Guide menu/i });
    fireEvent.click(studyGuideTrigger);

    const medSurgLink = screen.getByRole("link", { name: /Medical-Surgical Nursing/i });
    expect(medSurgLink.querySelector("svg")).toBeInTheDocument();

    const pharmacologyLink = screen.getByRole("link", { name: /Pharmacology & Medication Safety/i });
    expect(pharmacologyLink.querySelector("svg")).toBeInTheDocument();

    // 3. Products & Pricing dropdown
    const productsTrigger = screen.getByRole("button", { name: /Open Products & Pricing menu/i });
    fireEvent.click(productsTrigger);

    const subPlansLink = screen.getByRole("link", { name: /Compare Subscription Plans/i });
    expect(subPlansLink.querySelector("svg")).toBeInTheDocument();

    const freeQuestionsLink = screen.getByRole("link", { name: /Free Sample Questions/i });
    expect(freeQuestionsLink.querySelector("svg")).toBeInTheDocument();

    // 4. More dropdown
    const moreTrigger = screen.getByRole("button", { name: /^More$/i });
    fireEvent.click(moreTrigger);

    const testimonialsLink = screen.getByRole("link", { name: /Testimonials/i });
    expect(testimonialsLink.querySelector("svg")).toBeInTheDocument();

    const blogLink = screen.getByRole("link", { name: /Blog/i });
    expect(blogLink.querySelector("svg")).toBeInTheDocument();
  });

  it("renders consistent Lucide icons on desktop visitor action links", () => {
    render(<PublicHeader />);

    const signInLink = screen.getAllByRole("link", { name: /Sign in/i })[0];
    expect(signInLink.querySelector("svg")).toBeInTheDocument();

    const createAccountLink = screen.getAllByRole("link", { name: /Create account/i })[0];
    expect(createAccountLink.querySelector("svg")).toBeInTheDocument();
  });

  it("renders Lucide icons in mobile navigation drawer for all routes and pathways", () => {
    render(<PublicHeader />);

    const hamburger = screen.getByRole("button", { name: /Open menu/i });
    fireEvent.click(hamburger);

    const drawer = screen.getByTestId("mobile-navigation-drawer");
    expect(drawer).toBeInTheDocument();

    // Nursing pathway mobile links have icons
    const rnMobile = within(drawer).getByRole("link", { name: /NCLEX-RN/i });
    expect(rnMobile.querySelector("svg")).toBeInTheDocument();

    const pnMobile = within(drawer).getByRole("link", { name: /NCLEX-PN/i });
    expect(pnMobile.querySelector("svg")).toBeInTheDocument();

    // Standard mobile links have icons
    const studyGuideMobile = within(drawer).getByRole("link", { name: /Study Guide & Notes/i });
    expect(studyGuideMobile.querySelector("svg")).toBeInTheDocument();

    const testimonialsMobile = within(drawer).getByRole("link", { name: /Testimonials/i });
    expect(testimonialsMobile.querySelector("svg")).toBeInTheDocument();

    const blogMobile = within(drawer).getByRole("link", { name: /Blog/i });
    expect(blogMobile.querySelector("svg")).toBeInTheDocument();
  });

  it("renders Lucide icons for every item in ProfileMenu", () => {
    const mockUser = {
      displayName: "Alex Candidate",
      email: "alex@example.com",
      role: "candidate",
    };

    render(<ProfileMenu user={mockUser} />);

    const trigger = screen.getByRole("button", { name: /User profile menu/i });
    fireEvent.click(trigger);

    expect(screen.getByRole("menuitem", { name: /My Profile/i }).querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /My Courses/i }).querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /My Subscriptions/i }).querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Shopping Cart/i }).querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Sign out/i }).querySelector("svg")).toBeInTheDocument();
  });

  it("renders Admin Workspace item with ShieldCheck icon for administrative users in ProfileMenu", () => {
    const adminUser = {
      displayName: "Dr. Admin",
      email: "admin@prepford.com",
      role: "admin",
    };

    render(<ProfileMenu user={adminUser} />);

    const trigger = screen.getByRole("button", { name: /User profile menu/i });
    fireEvent.click(trigger);

    const adminItem = screen.getByRole("menuitem", { name: /Admin Workspace/i });
    expect(adminItem).toBeInTheDocument();
    expect(adminItem.querySelector("svg")).toBeInTheDocument();
  });
});
