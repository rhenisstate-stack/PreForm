import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    totalPrice: 0,
    itemCount: 0,
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

import { ProductVideoPlayer } from "@/components/video/product-video-player";
import { HOME_PLATFORM_VIDEO } from "@/lib/hero-videos";
import { HeroSection } from "@/components/home/hero-section";
import { NCLEXRNPageClient } from "@/app/nclex-rn/page-client";
import { NCLEXPNPageClient } from "@/app/nclex-pn/page-client";

describe("ProductVideoPlayer & Redesigned Hero Experiences", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("lazy-loads video only when opened, renders HTML5 sources & captions, and closes via button or Escape", async () => {
    const user = userEvent.setup();
    render(<ProductVideoPlayer video={HOME_PLATFORM_VIDEO} />);

    // No <video> element in DOM before playback is requested
    expect(screen.queryByTestId("product-video-element")).not.toBeInTheDocument();

    const playBtn = screen.getByTestId("product-video-play-button");
    expect(playBtn).toHaveAttribute("aria-label", HOME_PLATFORM_VIDEO.accessibleLabel);

    await user.click(playBtn);

    const modal = screen.getByTestId("product-video-modal");
    expect(modal).toBeInTheDocument();

    const videoEl = within(modal).getByTestId("product-video-element") as HTMLVideoElement;
    expect(videoEl).toHaveAttribute("controls");
    expect(videoEl).toHaveAttribute("preload", "metadata");

    const sources = videoEl.querySelectorAll("source");
    expect(sources.length).toBe(2);
    expect(sources[0]).toHaveAttribute("type", "video/webm");
    expect(sources[1]).toHaveAttribute("type", "video/mp4");

    const track = videoEl.querySelector("track");
    expect(track).toHaveAttribute("kind", "captions");
    expect(track).toHaveAttribute("src", HOME_PLATFORM_VIDEO.captionsSrc);

    // Close via Escape key
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("product-video-modal")).not.toBeInTheDocument();
  });

  it("displays an honest fallback state with walkthrough links if the video asset fails to load", async () => {
    const user = userEvent.setup();
    render(<ProductVideoPlayer video={HOME_PLATFORM_VIDEO} />);

    await user.click(screen.getByTestId("product-video-play-button"));

    const videoEl = screen.getByTestId("product-video-element");
    fireEvent.error(videoEl);

    const unavailable = screen.getByTestId("product-video-unavailable");
    expect(unavailable).toBeInTheDocument();
    expect(
      within(unavailable).getByText(/Walkthrough recording unavailable in this preview/i)
    ).toBeInTheDocument();
    expect(within(unavailable).getByRole("link", { name: /Explore NCLEX-RN/i })).toHaveAttribute(
      "href",
      "/nclex-rn"
    );
  });

  it("opens the Homepage platform tour modal from the tertiary Watch Platform Tour button", async () => {
    const user = userEvent.setup();
    render(<HeroSection />);

    await user.click(screen.getByTestId("home-cta-watch-tour"));
    const modal = screen.getByTestId("home-hero-video-modal");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/PrepFord Learning Platform Tour/i)).toBeInTheDocument();
  });

  it("supports RN hero dashboard navigation and RN platform tour modal", async () => {
    const user = userEvent.setup();
    render(<NCLEXRNPageClient />);

    await user.click(screen.getByTestId("rn-hero-watch-tour"));
    const modal = screen.getByTestId("rn-hero-video-modal");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/NCLEX-RN Platform Tour/i)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await user.click(screen.getByTestId("rn-hero-dashboard-cta"));
    expect(mockPush).toHaveBeenCalledWith("/sign-in?from=%2Fdashboard%2Frn");
  });

  it("supports PN hero dashboard navigation and PN platform tour modal", async () => {
    const user = userEvent.setup();
    render(<NCLEXPNPageClient />);

    await user.click(screen.getByTestId("pn-hero-watch-tour"));
    const modal = screen.getByTestId("pn-hero-video-modal");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/NCLEX-PN Platform Tour/i)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await user.click(screen.getByTestId("pn-hero-dashboard-cta"));
    expect(mockPush).toHaveBeenCalledWith("/sign-in?from=%2Fdashboard%2Fpn");
  });
});
