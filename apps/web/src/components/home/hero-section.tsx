"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Play,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackgroundVideo } from "@/components/video/hero-background-video";
import { ProductVideoPlayer } from "@/components/video/product-video-player";
import { HOME_PLATFORM_VIDEO } from "@/lib/hero-videos";

const FULLWIDTH_ECG_PATH =
  "M0,68 L140,68 L175,68 L192,48 L208,82 L226,18 L244,98 L262,56 L285,68 L520,68 L555,68 L572,48 L588,82 L606,18 L624,98 L642,56 L665,68 L900,68 L935,68 L952,48 L968,82 L986,18 L1004,98 L1022,56 L1045,68 L1260,68 L1295,68 L1312,48 L1328,82 L1346,18 L1364,98 L1382,56 L1405,68 L1440,68";

const HERO_CAPABILITIES = [
  "Dedicated NCLEX-RN & NCLEX-PN Pathways",
  "Step-by-Step Clinical Answer Rationales",
  "7-Domain Nursing Study Guide & Notes",
  "Adaptive CAT & NGN Case Study Practice",
];

export function HeroSection() {
  const [isVideoOpen, setIsVideoOpen] = React.useState(false);

  return (
    <section
      id="main-content"
      data-testid="hero-section"
      aria-labelledby="home-hero-heading"
      className="relative isolate w-full min-h-[640px] lg:min-h-[700px] flex flex-col justify-between overflow-hidden bg-[#142B4A] text-white pt-10 sm:pt-14 lg:pt-16 pb-2 sm:pb-3"
    >
      {/* Full-Bleed Autoplay Hero Background Video */}
      <HeroBackgroundVideo
        video={HOME_PLATFORM_VIDEO}
        testId="home-hero-background-video"
      />

      {/* Main Hero Content */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 relative z-20 flex-1 flex items-center mb-6 sm:mb-8 lg:mb-10">
        <div
          data-testid="hero-split-layout"
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-2 sm:py-4"
        >
          {/* Left Column: Headline, Copy, Pathway CTAs, Optional Tour Modal */}
          <div
            data-testid="hero-left-column"
            className="lg:col-span-8 xl:col-span-7 text-left flex flex-col items-start"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-400/15 backdrop-blur-xs px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-200 border border-teal-300/30">
              <span className="h-2 w-2 rounded-full bg-[#0D9488] motion-safe:animate-pulse" />
              <span>NCLEX-RN &amp; NCLEX-PN Learning Platform</span>
            </div>

            <h1
              id="home-hero-heading"
              className="mt-5 text-3xl font-serif font-bold tracking-tight text-white sm:text-5xl lg:text-[3.35rem] leading-[1.12] drop-shadow-sm text-left"
            >
              Prepare for NCLEX with greater clarity and confidence.
            </h1>

            <p className="mt-5 max-w-xl text-left text-base sm:text-lg text-slate-200 leading-relaxed">
              Practice nursing questions, strengthen your clinical judgment, understand every answer
              and track your preparation through a dedicated learning platform built for NCLEX-RN
              and NCLEX-PN candidates.
            </p>

            {/* Pathway & Optional Full-Screen Video Tour Actions */}
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-start gap-3.5 w-full sm:w-auto">
              <Button
                size="lg"
                asChild
                data-testid="home-cta-explore-rn"
                className="w-full sm:w-auto bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold shadow-md px-6 h-12 text-base rounded-xl"
              >
                <Link href="/nclex-rn">
                  <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                  Explore NCLEX-RN
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                asChild
                data-testid="home-cta-explore-pn"
                className="w-full sm:w-auto font-semibold px-6 h-12 text-base border-2 border-white/40 rounded-xl bg-white/10 backdrop-blur-xs text-white hover:bg-white/20 hover:text-white shadow-xs"
              >
                <Link href="/nclex-pn">
                  <Stethoscope className="mr-2 h-4 w-4 text-teal-300" aria-hidden="true" />
                  Explore NCLEX-PN
                </Link>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="lg"
                data-testid="home-cta-watch-tour"
                onClick={() => setIsVideoOpen(true)}
                className="w-full sm:w-auto font-semibold px-4 h-12 text-sm text-teal-200 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <Play className="mr-2 h-4 w-4 fill-current" aria-hidden="true" />
                Watch Platform Tour
              </Button>
            </div>

            {/* Verified Capability Indicators */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm font-medium text-slate-100 w-full max-w-lg">
              {HERO_CAPABILITIES.map((cap) => (
                <div key={cap} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-300 shrink-0" aria-hidden="true" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground !text-slate-300 text-left">
              Independent preparation platform. Not affiliated with or endorsed by NCSBN.
            </p>
          </div>

          {/* Optional Secondary Full-Screen Tour Modal (does not obscure background video) */}
          <ProductVideoPlayer
            video={HOME_PLATFORM_VIDEO}
            open={isVideoOpen}
            onOpenChange={setIsVideoOpen}
            modalOnly
            modalTestId="home-hero-video-modal"
          />
        </div>
      </div>

      {/* Full-Width Left-to-Right Animated Heartbeat / ECG Line */}
      <div
        aria-hidden="true"
        data-testid="hero-fullwidth-heartbeat"
        className="relative inset-x-0 w-full z-10 pointer-events-none select-none overflow-hidden mt-4 sm:mt-6 lg:mt-8"
      >
        <div data-testid="hero-ecg-container" className="w-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-teal-200/85 mb-1 gap-2">
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <Activity className="h-3.5 w-3.5 text-teal-300 motion-safe:animate-heartbeat" />
              <span className="hidden sm:inline">PREPFORD CLINICAL RHYTHM • LEAD II</span>
              <span className="sm:hidden">RHYTHM • LEAD II</span>
            </span>
            <span className="font-semibold text-emerald-300 text-right shrink-0">
              <span className="hidden sm:inline">NORMAL SINUS • LEFT-TO-RIGHT PULSE</span>
              <span className="sm:hidden">NORMAL SINUS</span>
            </span>
          </div>
          <svg
            className="w-full h-12 sm:h-14 lg:h-16 block"
            viewBox="0 0 1440 120"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              data-testid="hero-ecg-baseline"
              d={FULLWIDTH_ECG_PATH}
              pathLength={1000}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-300/30"
            />
            <path
              data-testid="hero-ecg-pulse-ltr"
              d={FULLWIDTH_ECG_PATH}
              pathLength={1000}
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-300 drop-shadow-[0_0_10px_rgba(45,212,191,0.85)] motion-safe:animate-ecg-ltr"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
