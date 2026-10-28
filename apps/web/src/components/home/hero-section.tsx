"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Compass,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FULLWIDTH_ECG_PATH =
  "M0,68 L140,68 L175,68 L192,48 L208,82 L226,18 L244,98 L262,56 L285,68 L520,68 L555,68 L572,48 L588,82 L606,18 L624,98 L642,56 L665,68 L900,68 L935,68 L952,48 L968,82 L986,18 L1004,98 L1022,56 L1045,68 L1260,68 L1295,68 L1312,48 L1328,82 L1346,18 L1364,98 L1382,56 L1405,68 L1440,68";

export function HeroSection() {
  return (
    <section
      id="main-content"
      className="relative isolate w-full min-h-[580px] lg:min-h-[650px] flex items-center overflow-hidden bg-gradient-to-b from-slate-100/95 via-teal-50/45 to-background dark:from-slate-950 dark:via-slate-900/90 dark:to-background text-foreground pt-12 pb-24 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32"
      aria-label="PrepFord NCLEX Hero"
    >
      {/* Subtle Ambient Tonal Glows (z-0, decorative, pointer-events-none) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
      >
        <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 dark:bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-12 -left-24 h-80 w-80 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
      </div>

      {/* Full-Width Left-to-Right Animated Heartbeat / ECG Line (z-10, spans full hero width, pointer-events-none) */}
      <div
        aria-hidden="true"
        data-testid="hero-fullwidth-heartbeat"
        className="absolute inset-x-0 bottom-3 sm:bottom-5 z-10 w-full pointer-events-none select-none overflow-hidden"
      >
        <div
          data-testid="hero-ecg-container"
          className="w-full"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-[11px] font-mono text-teal-800/75 dark:text-teal-300/80 mb-1">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 motion-safe:animate-heartbeat" />
              PREPFORD CLINICAL RHYTHM • LEAD II
            </span>
            <span className="font-semibold text-teal-700 dark:text-emerald-300">
              NORMAL SINUS • LEFT-TO-RIGHT PULSE
            </span>
          </div>
          <svg
            className="w-full h-14 sm:h-16 lg:h-20 block"
            viewBox="0 0 1440 120"
            fill="none"
            preserveAspectRatio="none"
          >
            {/* Static baseline waveform (visible in light & dark mode and prefers-reduced-motion) */}
            <path
              data-testid="hero-ecg-baseline"
              d={FULLWIDTH_ECG_PATH}
              pathLength={1000}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-700/20 dark:text-teal-400/25"
            />
            {/* Travelling left-to-right heartbeat pulse wave */}
            <path
              data-testid="hero-ecg-pulse-ltr"
              d={FULLWIDTH_ECG_PATH}
              pathLength={1000}
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-600 dark:text-teal-300 drop-shadow-[0_0_8px_rgba(13,148,136,0.55)] dark:drop-shadow-[0_0_10px_rgba(45,212,191,0.85)] motion-safe:animate-ecg-ltr"
            />
          </svg>
        </div>
      </div>

      {/* Foreground Content Container (z-20) */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 relative z-20">
        <div
          data-testid="hero-split-layout"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          {/* Left Column: Eyebrow, Headline, Supporting Copy, Primary & Secondary CTAs */}
          <div
            data-testid="hero-left-column"
            className="lg:col-span-6 text-left flex flex-col items-start"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              <span className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400 motion-safe:animate-pulse" />
              NCLEX-RN &amp; NCLEX-PN Exam Preparation
            </div>

            <h1 className="mt-5 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] leading-[1.12] text-left">
              Prepare for NCLEX with greater clarity and confidence.
            </h1>

            <p className="mt-5 max-w-xl text-left text-base sm:text-lg text-muted-foreground leading-relaxed">
              Practice nursing questions, strengthen your understanding with rationales, and organize your preparation with PrepFord&apos;s available study resources.
            </p>

            {/* Primary & Secondary Action Buttons (Left-Aligned) */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 w-full sm:w-auto">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md px-8 py-6 text-base rounded-xl"
              >
                <Link href="#nursing-pathways">
                  <Compass className="mr-2 h-5 w-5" />
                  Explore NCLEX Prep
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto font-semibold px-8 py-6 text-base border-2 border-input rounded-xl bg-card/90 text-foreground backdrop-blur-xs hover:bg-muted hover:text-foreground shadow-sm"
              >
                <Link href="/study-guide">
                  <BookOpen className="mr-2 h-5 w-5 text-secondary" />
                  Explore Study Guide
                </Link>
              </Button>
            </div>

            {/* Real PrepFord Capability Indicators */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm font-medium text-foreground/90 w-full max-w-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>Dedicated NCLEX-RN &amp; NCLEX-PN Pathways</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>Step-by-Step Clinical Answer Rationales</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>7-Domain Nursing Study Guide &amp; Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>Adaptive CAT &amp; NGN Case Study Practice</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground text-left">
              Independent preparation platform. Not affiliated with or endorsed by NCSBN.
            </p>
          </div>

          {/* Right Column: Integrated Nursing Visual (Softly Blended, Uncluttered) */}
          <div
            data-testid="hero-right-column"
            className="lg:col-span-6 relative"
          >
            <div className="relative mx-auto max-w-xl lg:max-w-none">
              {/* Soft ambient radial backlight behind nursing image */}
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-teal-500/20 via-primary/10 to-transparent blur-2xl pointer-events-none select-none"
              />

              {/* Integrated Nursing Image Surface */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/illustrations/prepford-landing-hero.png"
                  alt="Nursing candidate preparing for NCLEX licensure with PrepFord digital learning workspace"
                  data-testid="hero-nurse-image"
                  className="w-full h-[340px] sm:h-[420px] lg:h-[460px] object-contain sm:object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
