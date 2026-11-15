"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { HeroVideoConfig } from "@/lib/hero-videos";

export interface HeroBackgroundVideoProps {
  video: HeroVideoConfig;
  testId?: string;
  overlayClassName?: string;
  className?: string;
}

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener?.("change", callback);
  return () => mq.removeEventListener?.("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeMobileViewport(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener?.("change", callback);
  return () => mq.removeEventListener?.("change", callback);
}

function getMobileViewportSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Full-bleed, muted, looping background video for PrepFord hero sections.
 * Renders poster-first to prevent CLS, respects prefers-reduced-motion,
 * and gracefully falls back to the static poster if autoplay is blocked or media fails.
 */
export function HeroBackgroundVideo({
  video,
  testId = "hero-background-video",
  overlayClassName,
  className,
}: HeroBackgroundVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const playAttemptedForSrcRef = React.useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = React.useState(false);

  const prefersReducedMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  const isMobileViewport = React.useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    () => true
  );

  const sourceKey = `${video.webmSrc}|${video.mp4Src}`;

  React.useEffect(() => {
    setHasError(false);
    setAutoplayBlocked(false);
    setIsPlaying(false);
    playAttemptedForSrcRef.current = null;
  }, [sourceKey]);

  React.useEffect(() => {
    if (isMobileViewport || prefersReducedMotion || hasError) {
      return;
    }

    const el = videoRef.current;
    if (!el) {
      return;
    }

    let cancelled = false;

    // Ensure muted property is enforced on the DOM element for browser autoplay policies
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;

    const attemptPlay = () => {
      if (cancelled || playAttemptedForSrcRef.current === sourceKey) {
        return;
      }
      playAttemptedForSrcRef.current = sourceKey;

      try {
        const playPromise = el.play?.();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise
            .then(() => {
              if (!cancelled) {
                setIsPlaying(true);
                setAutoplayBlocked(false);
              }
            })
            .catch(() => {
              if (!cancelled) {
                setAutoplayBlocked(true);
                setIsPlaying(false);
              }
            });
        } else {
          setIsPlaying(true);
        }
      } catch {
        if (!cancelled) {
          setAutoplayBlocked(true);
          setIsPlaying(false);
        }
      }
    };

    const handleCanPlay = () => {
      attemptPlay();
    };

    const handlePlaying = () => {
      if (!cancelled) {
        setIsPlaying(true);
        setAutoplayBlocked(false);
      }
    };

    const handleError = () => {
      if (!cancelled) {
        setHasError(true);
        setIsPlaying(false);
      }
    };

    el.addEventListener("canplay", handleCanPlay);
    el.addEventListener("playing", handlePlaying);
    el.addEventListener("error", handleError);

    attemptPlay();

    return () => {
      cancelled = true;
      el.removeEventListener("canplay", handleCanPlay);
      el.removeEventListener("playing", handlePlaying);
      el.removeEventListener("error", handleError);
    };
  }, [isMobileViewport, prefersReducedMotion, hasError, sourceKey]);

  const showVideo = !isMobileViewport && !prefersReducedMotion && !hasError && !autoplayBlocked;

  return (
    <div
      aria-hidden="true"
      data-testid={`${testId}-container`}
      className={cn(
        "absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#142B4A]",
        className
      )}
    >
      {/* Poster-first base layer: prevents CLS and serves as reduced-motion / mobile / error / blocked fallback */}
      <Image
        src={video.posterSrc}
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="(max-width: 640px) 480px, 100vw"
        data-testid={`${testId}-poster`}
        className="object-cover object-center"
      />

      {showVideo && (
        <video
          ref={videoRef}
          data-testid={testId}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={video.posterSrc}
          tabIndex={-1}
          aria-hidden="true"
          onError={() => setHasError(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 motion-reduce:hidden",
            isPlaying ? "opacity-100" : "opacity-0"
          )}
        >
          <source src={video.webmSrc} type="video/webm" />
          <source src={video.mp4Src} type="video/mp4" />
        </video>
      )}

      {/* Controlled brand scrim + directional gradient for WCAG-compliant text contrast */}
      <div
        className={cn(
          "absolute inset-0 bg-[#142B4A]/70",
          overlayClassName
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#142B4A]/90 via-[#142B4A]/75 to-[#0D9488]/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#142B4A]/85 via-transparent to-[#142B4A]/45" />
    </div>
  );
}
