import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { SplashScreen } from "@/components/layout/splash-screen";
import * as authContext from "@/lib/auth-context";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ priority, ...props }: any) => <img {...props} />,
}));

describe("PrepFord Splash Screen & Application Initialization Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders with official brand logo, wordmark, and clinical ECG heartbeat pulse while auth is loading", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      registerUser: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<SplashScreen />);

    const splash = screen.getByTestId("prepford-splash-screen");
    expect(splash).toBeInTheDocument();
    expect(splash).toHaveAttribute("role", "status");
    expect(splash).toHaveAttribute("aria-live", "polite");

    // Wordmark
    expect(screen.getByText("Prep")).toBeInTheDocument();
    expect(screen.getByText("Ford")).toBeInTheDocument();

    // Clinical ECG Waveform Pulse
    const pulse = screen.getByTestId("splash-ecg-pulse");
    expect(pulse).toBeInTheDocument();
    expect(pulse.getAttribute("class")).toContain("motion-safe:animate-ecg-ltr");
  });

  it("smoothly fades out and unmounts once application auth initialization completes", async () => {
    const { rerender } = render(<SplashScreen />);

    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: { id: "u1", email: "learner@prepford.com", name: "Jane Doe", displayName: "Jane Doe", role: "candidate", pathway: "rn" },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      registerUser: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    rerender(<SplashScreen />);

    // Fast-forward fade-out animation (300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByTestId("prepford-splash-screen")).not.toBeInTheDocument();
  });

  it("safely times out and unmounts after maxTimeoutMs if backend is unresponsive (no infinite spinner)", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      registerUser: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<SplashScreen maxTimeoutMs={2000} />);

    expect(screen.getByTestId("prepford-splash-screen")).toBeInTheDocument();

    // Advance past timeout
    act(() => {
      vi.advanceTimersByTime(2050);
    });

    // Advance fade-out
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByTestId("prepford-splash-screen")).not.toBeInTheDocument();
  });

  it("provides accessible skip button for assistive technology or extreme lag", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      registerUser: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<SplashScreen />);

    const skipButton = screen.getByRole("button", { name: /skip initialization/i });
    expect(skipButton).toBeInTheDocument();

    fireEvent.click(skipButton);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByTestId("prepford-splash-screen")).not.toBeInTheDocument();
  });
});
