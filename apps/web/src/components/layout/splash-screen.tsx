"use client";

import * as React from "react";
import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth-context";

interface SplashScreenProps {
  /** Maximum milliseconds to wait for initialization before graceful fallback (default: 3500ms) */
  maxTimeoutMs?: number;
}

const ECG_WAVEFORM_PATH =
  "M0,35 L60,35 L75,35 L85,20 L93,48 L103,5 L113,60 L123,28 L133,35 L190,35 L205,35 L215,20 L223,48 L233,5 L243,60 L253,28 L263,35 L320,35";

export function SplashScreen({ maxTimeoutMs = 3500 }: SplashScreenProps) {
  const { isLoading } = useAuth();
  const [visible, setVisible] = React.useState(true);
  const [fadingOut, setFadingOut] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("Initializing PrepFord clinical workspace...");

  React.useEffect(() => {
    // If auth state resolved or initial load finished
    if (!isLoading) {
      setFadingOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Timeout guard: never hang indefinitely if backend is unresponsive
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (visible) {
        setFadingOut(true);
        setTimeout(() => setVisible(false), 300);
      }
    }, maxTimeoutMs);

    // Dynamic status messages for purposeful feedback
    const messageTimer1 = setTimeout(() => {
      setStatusMessage("Verifying secure session...");
    }, 1200);

    const messageTimer2 = setTimeout(() => {
      setStatusMessage("Preparing learning environment...");
    }, 2400);

    return () => {
      clearTimeout(timeout);
      clearTimeout(messageTimer1);
      clearTimeout(messageTimer2);
    };
  }, [maxTimeoutMs, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      data-testid="prepford-splash-screen"
      role="status"
      aria-live="polite"
      aria-label={statusMessage}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#142B4A] text-white transition-opacity duration-300 ease-in-out ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
        {/* Ambient Teal Glow */}
        <div className="absolute -top-12 h-36 w-36 rounded-full bg-[#0D9488]/20 blur-2xl pointer-events-none motion-safe:animate-pulse" />

        {/* Brand Logo Container */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 p-3 shadow-2xl backdrop-blur-md border border-white/15 mb-6">
          <Image
            src={BRAND.logo.assetPath}
            alt={BRAND.logo.alt}
            width={88}
            height={88}
            priority
            className="h-full w-full rounded-2xl object-contain drop-shadow"
          />
        </div>

        {/* Brand Wordmark: Prep in Teal (#0D9488), Ford in White */}
        <h1 className="font-serif font-bold text-3xl tracking-tight leading-none mb-1">
          <span className="text-[#0D9488]">Prep</span>
          <span className="text-white">Ford</span>
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#0D9488] font-semibold mb-6">
          NCLEX-RN &amp; NCLEX-PN Preparation
        </p>

        {/* Clinical ECG Waveform Animation */}
        <div className="w-64 h-12 relative flex items-center justify-center mb-4 overflow-hidden">
          <svg
            className="w-full h-full block"
            viewBox="0 0 320 70"
            fill="none"
            preserveAspectRatio="none"
          >
            {/* Background trace line */}
            <path
              d={ECG_WAVEFORM_PATH}
              stroke="rgba(13, 148, 136, 0.25)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Animated ECG Pulse */}
            <path
              data-testid="splash-ecg-pulse"
              d={ECG_WAVEFORM_PATH}
              stroke="#0D9488"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(13,148,136,0.8)] motion-safe:animate-ecg-ltr"
              pathLength={500}
            />
          </svg>
        </div>

        {/* Status text */}
        <p className="text-xs text-slate-300/90 font-medium tracking-wide">
          {statusMessage}
        </p>

        {/* Accessible fallback skip button for assistive technology or extreme lag */}
        <button
          type="button"
          onClick={() => {
            setFadingOut(true);
            setTimeout(() => setVisible(false), 300);
          }}
          className="mt-6 text-[11px] text-slate-400 hover:text-white underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded py-1 px-2"
        >
          Skip initialization
        </button>
      </div>
    </div>
  );
}
