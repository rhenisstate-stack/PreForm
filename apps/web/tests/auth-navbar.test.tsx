import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("Auth-Aware PublicHeader Component", () => {
  it("renders public navigation items and NO cart/notification/profile for unauthenticated visitors", () => {
    render(<PublicHeader />);

    // 1. Navigation links
    expect(screen.getByRole("link", { name: "NCLEX-RN" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NCLEX-PN" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Courses" })).toBeInTheDocument();

    // 2. Theme switcher exists
    expect(screen.getByRole("button", { name: /Change theme/i })).toBeInTheDocument();

    // 3. Visitor actions
    expect(screen.getAllByRole("link", { name: /Sign in/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Create account/i })[0]).toBeInTheDocument();

    // 4. Critical: Cart, notifications, and profile menu MUST NOT exist in DOM
    expect(screen.queryByRole("link", { name: /Shopping cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Notifications and support/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /User profile menu/i })).not.toBeInTheDocument();
  });

  it("renders cart, notifications, and profile menu when user is authenticated, hiding visitor auth CTAs", () => {
    const mockUser = {
      displayName: "Jane Candidate",
      email: "jane.nurse@example.com",
      role: "candidate",
    };

    render(<PublicHeader user={mockUser} />);

    // 1. Authenticated icons exist in DOM
    expect(screen.getByRole("link", { name: /Shopping cart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notifications and support/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /User profile menu/i })).toBeInTheDocument();

    // 2. Candidate name is displayed
    expect(screen.getByText("Jane Candidate")).toBeInTheDocument();

    // 3. Sign in & Create account are NOT rendered
    expect(screen.queryByRole("link", { name: /^Sign in$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Create account$/i })).not.toBeInTheDocument();
  });
});
