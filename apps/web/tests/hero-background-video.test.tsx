import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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

import { HeroBackgroundVideo } from "@/components/video/hero-background-video";
import { HeroSection } from "@/components/home/hero-section";
import { NCLEXRNPageClient } from "@/app/nclex-rn/page-client";
import { NCLEXPNPageClient } from "@/app/nclex-pn/page-client";
import {
  HOME_PLATFORM_VIDEO,
  RN_PLATFORM_VIDEO,
  PN_PLATFORM_VIDEO,
} from "@/lib/hero-videos";

describe("HeroBackgroundVideo & All 3 Autoplay Hero Routes", () => {
  const originalMatchMedia = window.matchMedia;
  const originalPlay = HTMLMediaElement.prototype.play;

  beforeEach(() => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    HTMLMediaElement.prototype.play = originalPlay;
    vi.restoreAllMocks();
  });

  it("renders homepage hero with autoplay muted looping inline background video and no modal required", async () => {
    render(<HeroSection />);

    const video = screen.getByTestId("home-hero-background-video") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("poster", HOME_PLATFORM_VIDEO.posterSrc);

    const sources = video.querySelectorAll("source");
    expect(sources).toHaveLength(2);
    expect(sources[0]).toHaveAttribute("src", HOME_PLATFORM_VIDEO.webmSrc);
    expect(sources[0]).toHaveAttribute("type", "video/webm");
    expect(sources[1]).toHaveAttribute("src", HOME_PLATFORM_VIDEO.mp4Src);
    expect(sources[1]).toHaveAttribute("type", "video/mp4");

    await waitFor(() => {
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    });

    // No click-to-play laptop frame in hero
    expect(screen.queryByTestId("home-hero-video-frame")).not.toBeInTheDocument();
    // Hero CTAs remain accessible above video
    expect(screen.getByTestId("home-cta-explore-rn")).toBeInTheDocument();
    expect(screen.getByTestId("home-cta-explore-pn")).toBeInTheDocument();
  });

  it("renders NCLEX-RN hero with RN-specific autoplay background video", async () => {
    render(<NCLEXRNPageClient />);

    const video = screen.getByTestId("rn-hero-background-video") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("poster", RN_PLATFORM_VIDEO.posterSrc);

    const sources = video.querySelectorAll("source");
    expect(sources[0]).toHaveAttribute("src", RN_PLATFORM_VIDEO.webmSrc);
    expect(sources[1]).toHaveAttribute("src", RN_PLATFORM_VIDEO.mp4Src);

    expect(screen.queryByTestId("rn-hero-video-frame")).not.toBeInTheDocument();
    expect(screen.getByTestId("rn-hero-dashboard-cta")).toBeInTheDocument();
  });

  it("renders NCLEX-PN hero with PN-specific autoplay background video", async () => {
    render(<NCLEXPNPageClient />);

    const video = screen.getByTestId("pn-hero-background-video") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("poster", PN_PLATFORM_VIDEO.posterSrc);

    const sources = video.querySelectorAll("source");
    expect(sources[0]).toHaveAttribute("src", PN_PLATFORM_VIDEO.webmSrc);
    expect(sources[1]).toHaveAttribute("src", PN_PLATFORM_VIDEO.mp4Src);

    expect(screen.queryByTestId("pn-hero-video-frame")).not.toBeInTheDocument();
    expect(screen.getByTestId("pn-hero-dashboard-cta")).toBeInTheDocument();
  });

  it("respects prefers-reduced-motion: reduce by rendering static poster without video", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<HeroBackgroundVideo video={HOME_PLATFORM_VIDEO} testId="bg-vid" />);

    expect(screen.getByTestId("bg-vid-poster")).toBeInTheDocument();
    expect(screen.queryByTestId("bg-vid")).not.toBeInTheDocument();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("gracefully falls back to poster when autoplay is rejected by browser policy", async () => {
    HTMLMediaElement.prototype.play = vi
      .fn()
      .mockRejectedValue(new DOMException("Autoplay blocked", "NotAllowedError"));

    render(<HeroBackgroundVideo video={RN_PLATFORM_VIDEO} testId="bg-vid-blocked" />);

    await waitFor(() => {
      expect(screen.queryByTestId("bg-vid-blocked")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("bg-vid-blocked-poster")).toBeInTheDocument();
  });

  it("gracefully falls back to poster when media fails to load", () => {
    render(<HeroBackgroundVideo video={PN_PLATFORM_VIDEO} testId="bg-vid-err" />);

    const video = screen.getByTestId("bg-vid-err");
    fireEvent.error(video);

    expect(screen.queryByTestId("bg-vid-err")).not.toBeInTheDocument();
    expect(screen.getByTestId("bg-vid-err-poster")).toBeInTheDocument();
  });
});
