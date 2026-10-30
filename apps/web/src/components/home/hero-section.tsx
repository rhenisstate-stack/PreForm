"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Compass,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FULLWIDTH_ECG_PATH =
  "M0,68 L140,68 L175,68 L192,48 L208,82 L226,18 L244,98 L262,56 L285,68 L520,68 L555,68 L572,48 L588,82 L606,18 L624,98 L642,56 L665,68 L900,68 L935,68 L952,48 L968,82 L986,18 L1004,98 L1022,56 L1045,68 L1260,68 L1295,68 L1312,48 L1328,82 L1346,18 L1364,98 L1382,56 L1405,68 L1440,68";

interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  secondaryCta: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  capabilities: string[];
  disclaimer: string;
  image: {
    src: string;
    alt: string;
    testid?: string;
  };
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-pathways",
    eyebrow: "NCLEX-RN & NCLEX-PN Exam Preparation",
    title: "Prepare for NCLEX with greater clarity and confidence.",
    description:
      "Practice nursing questions, strengthen your understanding with rationales, and organize your preparation with PrepFord's available study resources.",
    primaryCta: {
      label: "Explore NCLEX Prep",
      href: "#nursing-pathways",
      icon: Compass,
    },
    secondaryCta: {
      label: "Explore Study Guide",
      href: "/study-guide",
      icon: BookOpen,
    },
    capabilities: [
      "Dedicated NCLEX-RN & NCLEX-PN Pathways",
      "Step-by-Step Clinical Answer Rationales",
      "7-Domain Nursing Study Guide & Notes",
      "Adaptive CAT & NGN Case Study Practice",
    ],
    disclaimer: "Independent preparation platform. Not affiliated with or endorsed by NCSBN.",
    image: {
      src: "/images/illustrations/prepford-landing-hero.png",
      alt: "Nursing candidate preparing for NCLEX licensure with PrepFord digital learning workspace",
      testid: "hero-nurse-image",
    },
  },
  {
    id: "slide-ngn",
    eyebrow: "Next Generation NCLEX (NGN)",
    title: "Master Clinical Judgment with EHR Unfolding Cases.",
    description:
      "Analyze realistic electronic health records, monitor vital sign trajectories, and prioritize life-saving nursing actions across NCSBN's 6 cognitive decision steps.",
    primaryCta: {
      label: "Explore Nursing Courses",
      href: "/courses",
      icon: Compass,
    },
    secondaryCta: {
      label: "Compare RN Plans",
      href: "/nclex-rn#rn-study-plans",
      icon: BookOpen,
    },
    capabilities: [
      "Multi-Tab Patient EHR Charts & Labs",
      "6-Step NCSBN Clinical Judgment Model",
      "Option-by-Option Distractor Rationales",
      "Client Safety & Prioritization Focus",
    ],
    disclaimer: "Built for registered nurse and practical nurse clinical reasoning development.",
    image: {
      src: "/images/illustrations/prepford-ehr-unfolding-case.png",
      alt: "PrepFord electronic health record unfolding clinical case simulation for Next Gen NCLEX",
      testid: "hero-slide-image-ngn",
    },
  },
  {
    id: "slide-study-guide",
    eyebrow: "Comprehensive Nursing Curriculum",
    title: "Master High-Yield Clinical Concepts Across 7 Nursing Domains.",
    description:
      "From pharmacology mechanisms and cardiovascular emergencies to pediatric milestones and prioritization frameworks, review organized clinical notes anytime.",
    primaryCta: {
      label: "Browse Study Guides",
      href: "/study-guide",
      icon: BookOpen,
    },
    secondaryCta: {
      label: "Explore RN Pathway",
      href: "/nclex-rn",
      icon: Compass,
    },
    capabilities: [
      "7 Core NCSBN Client Needs Domains",
      "Organized Clinical Review Sheets",
      "High-Alert Medication Safety Quick-Ref",
      "Distraction-Free Mobile Study Format",
    ],
    disclaimer: "Organized around NCSBN Client Needs and safety competencies.",
    image: {
      src: "/images/illustrations/prepford-study-guide-overview.png",
      alt: "Structured PrepFord 7-domain nursing study guide with core clinical topics and high-yield notes",
      testid: "hero-slide-image-studyguide",
    },
  },
  {
    id: "slide-analytics",
    eyebrow: "Personalized Assessment & Analytics",
    title: "Transparent Clinical Readiness Insights for Confident Exam Day.",
    description:
      "Track mastery across Client Needs categories, benchmark passing probability with timed readiness assessments, and focus review where it counts most.",
    primaryCta: {
      label: "View Study Plans",
      href: "/subscriptions",
      icon: Compass,
    },
    secondaryCta: {
      label: "Go to Learner Dashboard",
      href: "/dashboard",
      icon: BookOpen,
    },
    capabilities: [
      "Timed Readiness Assessment Scoring",
      "Client Needs Percentage Breakdown",
      "High-Yield Topic Strength Identification",
      "Transparent, Honest Readiness Signals",
    ],
    disclaimer: "Data-driven study feedback designed to eliminate exam-day surprises.",
    image: {
      src: "/images/illustrations/prepford-readiness-analytics.png",
      alt: "PrepFord clinical readiness dashboard showing Client Needs domain proficiency and exam confidence metrics",
      testid: "hero-slide-image-analytics",
    },
  },
];

export function HeroSection() {
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = React.useState(true);

  // Check prefers-reduced-motion
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsPlaying(!mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => {
        setIsPlaying(!e.matches);
      };
      mediaQuery.addEventListener?.("change", listener);
      return () => mediaQuery.removeEventListener?.("change", listener);
    }
  }, []);

  // Pause autoplay when document/tab is hidden
  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Automatic Carousel Playback (7000ms display interval)
  React.useEffect(() => {
    if (!isPlaying || isHovered || isFocused || !isDocumentVisible) {
      return;
    }

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered, isFocused, isDocumentVisible]);

  // Optional keyboard arrow navigation for power users/accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }
  };

  const currentSlide = HERO_SLIDES[activeSlide];
  const PrimaryIcon = currentSlide.primaryCta.icon;
  const SecondaryIcon = currentSlide.secondaryCta.icon;

  return (
    <section
      id="main-content"
      data-testid="hero-section"
      className="relative isolate w-full min-h-[580px] lg:min-h-[660px] flex items-center overflow-hidden bg-gradient-to-b from-teal-50/50 via-slate-50/35 to-background dark:from-slate-950 dark:via-slate-900/90 dark:to-background text-foreground pt-10 pb-20 sm:pt-14 sm:pb-24 lg:pt-18 lg:pb-28"
      aria-label="PrepFord NCLEX Hero"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
    >
      {/* Subtle Ambient Tonal Glows (z-0, decorative, pointer-events-none) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
      >
        <div className="absolute -top-28 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 dark:bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-12 -left-20 h-80 w-80 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
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
            {/* Static baseline waveform */}
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
        {/* Unified Editorial Split Layout (Archer Review-Inspired) */}
        <div
          key={currentSlide.id}
          data-testid="hero-split-layout"
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${activeSlide + 1} of ${HERO_SLIDES.length}: ${currentSlide.title}`}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
        >
          {/* Left Column: Eyebrow, Headline, Supporting Copy, Primary & Secondary CTAs */}
          <div
            data-testid="hero-left-column"
            className="lg:col-span-6 text-left flex flex-col items-start"
          >
            {/* Slide Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              <span className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400 motion-safe:animate-pulse" />
              <span>{currentSlide.eyebrow}</span>
            </div>

            {/* Headline */}
            <h1 className="mt-5 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] leading-[1.14] text-left">
              {currentSlide.title}
            </h1>

            {/* Supporting Description */}
            <p className="mt-5 max-w-xl text-left text-base sm:text-lg text-muted-foreground leading-relaxed">
              {currentSlide.description}
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 w-full sm:w-auto">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md px-8 py-6 text-base rounded-xl"
              >
                <Link href={currentSlide.primaryCta.href}>
                  <PrimaryIcon className="mr-2 h-5 w-5" />
                  {currentSlide.primaryCta.label}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto font-semibold px-8 py-6 text-base border-2 border-input rounded-xl bg-card/90 text-foreground backdrop-blur-xs hover:bg-muted hover:text-foreground shadow-sm"
              >
                <Link href={currentSlide.secondaryCta.href}>
                  <SecondaryIcon className="mr-2 h-5 w-5 text-secondary" />
                  {currentSlide.secondaryCta.label}
                </Link>
              </Button>
            </div>

            {/* Capability Indicators */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm font-medium text-foreground/90 w-full max-w-lg">
              {currentSlide.capabilities.map((cap) => (
                <div key={cap} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground text-left">
              {currentSlide.disclaimer}
            </p>
          </div>

          {/* Right Column: Seamlessly Integrated Visual (Archer Review-Inspired, No Separate White Card Frame) */}
          <div
            data-testid="hero-right-column"
            className="lg:col-span-6 relative w-full flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-xl lg:max-w-none">
              {/* Subtle ambient backlight glow behind visual */}
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-teal-500/15 via-primary/5 to-transparent blur-2xl pointer-events-none select-none"
              />

              {/* Seamless Integrated Image Surface without artificial white card frame */}
              <div className="relative w-full overflow-hidden transition-all duration-700 ease-out">
                <Image
                  src={currentSlide.image.src}
                  alt={currentSlide.image.alt}
                  data-testid={currentSlide.image.testid ?? "hero-slide-image"}
                  width={1376}
                  height={768}
                  priority={activeSlide === 0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 640px"
                  className={cn(
                    "w-full h-auto transition-transform duration-700",
                    // Commercial photography hero: natural soft rounded corners and subtle depth
                    currentSlide.id === "slide-pathways" && "object-cover aspect-[16/10] sm:aspect-video rounded-3xl shadow-xl shadow-teal-950/5",
                    // Unfolding EHR, study guide, and readiness analytics mockups: natural device presentation with transparent drop shadow
                    currentSlide.id !== "slide-pathways" && "object-contain drop-shadow-2xl"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
