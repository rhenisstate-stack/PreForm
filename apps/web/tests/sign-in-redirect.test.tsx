import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignInPageClient } from "@/app/sign-in/page-client";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: mockRefresh,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/sign-in",
  useSearchParams: () => currentSearchParams,
}));

const mockLogin = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

describe("SignInPageClient login redirect and open-redirect protection", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockLogin.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  it("redirects to the homepage (/) by default after a successful login", async () => {
    mockLogin.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();

    render(<SignInPageClient />);

    await user.type(screen.getByLabelText(/Email address/i), "nurse@prepford.com");
    await user.type(screen.getByLabelText(/^Password$/i), "ValidPassword123!");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    expect(googleBtn).toHaveAttribute(
      "href",
      "/api/auth/google?source=sign-in&from=%2F"
    );
  });

  it("preserves a valid internal return destination such as ?from=/cart", async () => {
    currentSearchParams = new URLSearchParams("from=/cart?add=rn-pro-quarter");
    mockLogin.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();

    render(<SignInPageClient />);

    await user.type(screen.getByLabelText(/Email address/i), "nurse@prepford.com");
    await user.type(screen.getByLabelText(/^Password$/i), "ValidPassword123!");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/cart?add=rn-pro-quarter");
    });
  });

  it("rejects external or protocol-relative redirect URLs and falls back to /", async () => {
    currentSearchParams = new URLSearchParams("from=//malicious.example.com/phish");
    mockLogin.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();

    render(<SignInPageClient />);

    await user.type(screen.getByLabelText(/Email address/i), "nurse@prepford.com");
    await user.type(screen.getByLabelText(/^Password$/i), "ValidPassword123!");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    expect(googleBtn).toHaveAttribute(
      "href",
      "/api/auth/google?source=sign-in&from=%2F"
    );
  });

  it("does not redirect when authentication fails and shows the error banner", async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: "Invalid email or password.",
    });
    const user = userEvent.setup();

    render(<SignInPageClient />);

    await user.type(screen.getByLabelText(/Email address/i), "nurse@prepford.com");
    await user.type(screen.getByLabelText(/^Password$/i), "WrongPassword123!");
    await user.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
