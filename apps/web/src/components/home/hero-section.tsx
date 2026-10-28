"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Play,
  HeartPulse,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    title: "Next Generation NCLEX Clinical Judgment",
    subtitle: "Master 6-part unfolding clinical case studies with authentic EHR charts, vital trends, and lab data tabs.",
    imageSrc: "/landing-page-nurse.jpg",
    imageAlt: "Nursing candidate preparing for Next Generation NCLEX licensure",
    badge: "Authentic NGN Scenarios",
    ctaLabel: "View Products",
    ctaHref: "#products",
  },
  {
    id: "slide-2",
    title: "Understand the Why Behind Every Option",
    subtitle: "In-depth pathophysiologic rationales explaining why the correct intervention is safe and why distractors are hazardous.",
    imageSrc: "/landing-page1.jpg",
    imageAlt: "Healthcare student reviewing detailed NCLEX rationales",
    badge: "Evidence-Based Rationales",
    ctaLabel: "Try Free Demo",
    ctaHref: "#demo",
  },
  {
    id: "slide-3",
    title: "High-Yield Pharmacology & Patient Safety",
    subtitle: "Focused medication antidote associations, critical lab value flags, and high-alert medication guidelines.",
    imageSrc: "/image4.jpg",
    imageAlt: "Pharmacology and medication administration study modules",
    badge: "Pharmacology Mastery",
    ctaLabel: "Explore RN Pathway",
    ctaHref: "/nclex-rn",
  },
  {
    id: "slide-4",
    title: "Realistic Computer Adaptive Testing (CAT)",
    subtitle: "Simulated mock examinations that adapt item difficulty to your ability level, identifying remedial topic gaps.",
    imageSrc: "/image5.jpg",
    imageAlt: "Computer adaptive testing question simulation",
    badge: "Adaptive Simulation",
    ctaLabel: "Explore PN Pathway",
    ctaHref: "/nclex-pn",
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [parallaxOffset, setParallaxOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-advance carousel
  React.useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "ArrowRight") {
      handleNext();
    }
  };

  const handleVisualPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setParallaxOffset({
      x: Math.round(relX * 14),
      y: Math.round(relY * 10),
    });
  };

  const handleVisualPointerLeave = () => {
    setParallaxOffset({ x: 0, y: 0 });
  };

  const activeSlide = HERO_SLIDES[currentSlide];

  return (
    <section
      id="main-content"
      className="relative isolate w-full overflow-hidden bg-gradient-to-b from-slate-100/95 via-teal-50/40 to-background dark:from-slate-950 dark:via-slate-900/85 dark:to-background text-foreground pt-10 pb-16 sm:pt-16 sm:pb-24"
      aria-label="PrepFord NCLEX Hero"
    >
      {/* Subtle Ambient Tonal Glows (z-0, decorative) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
      >
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-teal-500/10 dark:bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-12 -left-24 h-80 w-80 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-20">
        {/* Two-Sided Archer Review Inspired Hero Grid: Left Copy + CTAs, Right Nursing Visual + ECG + Healthcare Elements */}
        <div
          data-testid="hero-split-layout"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          {/* Left Column: Headline, Supporting Copy, and Primary CTAs (strictly left-aligned) */}
          <div
            data-testid="hero-left-column"
            className="lg:col-span-6 text-left flex flex-col items-start"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              <span className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400 motion-safe:animate-pulse" />
              For NCLEX-RN and NCLEX-PN Candidates
            </div>

            <h1 className="mt-5 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem] leading-[1.1] text-left">
              Prepare with clarity.{" "}
              <span className="block text-secondary italic mt-1">Progress with purpose.</span>
            </h1>

            <p className="mt-5 max-w-xl text-left text-base sm:text-lg text-muted-foreground leading-relaxed">
              A focused learning platform for future nurses—engineered with authentic Next Generation NCLEX case studies, comprehensive clinical rationales, and honest measures of test readiness.
            </p>

            {/* Clinical Value Highlights */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm font-medium text-foreground/90 w-full max-w-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>3,500+ Next Gen Clinical Items</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>Adaptive CAT Mock Simulations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>Unfolding 6-Part Case Studies</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>99% Pass-Rate Readiness Model</span>
              </div>
            </div>

            {/* Primary & Secondary Action Buttons (Left-Aligned) */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 w-full sm:w-auto">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md px-8 py-6 text-base rounded-xl"
              >
                <Link href="#products">
                  <BookOpen className="mr-2 h-5 w-5" />
                  View Products
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto font-semibold px-8 py-6 text-base border-2 border-input rounded-xl bg-card/90 text-foreground backdrop-blur-xs hover:bg-muted hover:text-foreground shadow-sm"
              >
                <Link href="#demo">
                  <Play className="mr-2 h-5 w-5 text-secondary fill-secondary/20" />
                  Try Free
                </Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground text-left">
              Independent preparation platform. Not affiliated with or endorsed by NCSBN.
            </p>
          </div>

          {/* Right Column: Prominent Nursing Visual, Left-to-Right ECG Pulse, and Interactive Healthcare Elements */}
          <div
            data-testid="hero-right-column"
            onPointerMove={handleVisualPointerMove}
            onPointerLeave={handleVisualPointerLeave}
            className="lg:col-span-6 relative group"
          >
            {/* Main Nursing Photograph Frame */}
            <div className="relative z-10 mx-auto max-w-xl lg:max-w-none rounded-3xl overflow-hidden shadow-2xl bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing-page-nurse.jpg"
                alt="Nursing candidate preparing for NCLEX licensure with PrepFord"
                data-testid="hero-nurse-image"
                className="w-full h-[340px] sm:h-[420px] lg:h-[470px] object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />

              {/* Subtle bottom gradient for telemetry & ECG legibility over the image base */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent pointer-events-none"
              />

              {/* Left-to-Right Animated Electrocardiogram (ECG) Heartbeat Overlay */}
              <div
                aria-hidden="true"
                data-testid="hero-ecg-container"
                className="absolute inset-x-0 bottom-4 z-10 px-5 pointer-events-none select-none"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-teal-300/90 mb-1 px-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-400 motion-safe:animate-heartbeat" />
                    CLINICAL TELEMETRY • LEAD II
                  </span>
                  <span className="font-semibold text-emerald-300">76 BPM • NORMAL SINUS</span>
                </div>
                <svg
                  className="w-full h-14 overflow-visible"
                  viewBox="0 0 1000 100"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  {/* Static baseline track (always visible, including reduced-motion) */}
                  <path
                    d="M0,55 L140,55 L165,55 L180,35 L195,70 L212,12 L228,88 L244,48 L265,55 L480,55 L505,55 L520,35 L535,70 L552,12 L568,88 L584,48 L605,55 L820,55 L845,55 L860,35 L875,70 L892,12 L908,88 L924,48 L945,55 L1000,55"
                    pathLength={1000}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-teal-400/25"
                  />
                  {/* Travelling left-to-right heartbeat pulse wave */}
                  <path
                    data-testid="hero-ecg-pulse-ltr"
                    d="M0,55 L140,55 L165,55 L180,35 L195,70 L212,12 L228,88 L244,48 L265,55 L480,55 L505,55 L520,35 L535,70 L552,12 L568,88 L584,48 L605,55 L820,55 L845,55 L860,35 L875,70 L892,12 L908,88 L924,48 L945,55 L1000,55"
                    pathLength={1000}
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.85)] motion-safe:animate-ecg-ltr"
                  />
                </svg>
              </div>
            </div>

            {/* Coordinated Floating Healthcare Elements on the Right Visual (z-10, pointer-events-none, responsive parallax) */}
            <div
              aria-hidden="true"
              style={{
                transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0)`,
              }}
              className="hidden sm:flex items-center gap-3 absolute -left-4 lg:-left-6 top-6 z-10 pointer-events-none select-none px-4 py-3 rounded-2xl bg-card/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl transition-transform duration-200 ease-out motion-safe:animate-float-slow"
            >
              <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-400">
                <HeartPulse className="h-5 w-5 motion-safe:animate-heartbeat" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">18 Question Formats</p>
                <p className="text-[10px] text-muted-foreground">Bowtie, Matrix & Trend</p>
              </div>
            </div>

            <div
              aria-hidden="true"
              style={{
                transform: `translate3d(${-parallaxOffset.x}px, ${-parallaxOffset.y}px, 0)`,
                animationDelay: "1.8s",
              }}
              className="hidden sm:flex items-center gap-3 absolute -right-3 lg:-right-5 top-24 z-10 pointer-events-none select-none px-4 py-3 rounded-2xl bg-card/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl transition-transform duration-200 ease-out motion-safe:animate-float-slow"
            >
              <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Authentic EHR Charts</p>
                <p className="text-[10px] text-muted-foreground">Dynamic Lab Trends & Vitals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Hero Feature Carousel (Seamless Surface) */}
        <div
          className="mt-14 lg:mt-20 relative rounded-3xl bg-card/95 dark:bg-slate-900/85 backdrop-blur-md shadow-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-secondary/50"
          tabIndex={0}
          role="region"
          aria-label="PrepFord Feature Carousel"
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center min-h-[380px] lg:min-h-[440px]">
            {/* Slide Information */}
            <div className="lg:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-between h-full space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  {activeSlide.badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground leading-tight">
                  {activeSlide.title}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {activeSlide.subtitle}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm rounded-xl"
                >
                  <Link href={activeSlide.ctaHref}>
                    {activeSlide.ctaLabel}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Controls and Indicators */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide indicators">
                  {HERO_SLIDES.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setCurrentSlide(idx)}
                      role="tab"
                      aria-selected={currentSlide === idx}
                      aria-label={`Go to slide ${idx + 1}: ${slide.badge}`}
                      className={`h-2.5 rounded-full transition-all ${
                        currentSlide === idx
                          ? "w-8 bg-secondary"
                          : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous slide"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70 text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next slide"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70 text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Slide Image */}
            <div className="lg:col-span-7 h-64 sm:h-80 lg:h-full relative overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeSlide.imageSrc}
                alt={activeSlide.imageAlt}
                className="w-full h-full object-cover transition-opacity duration-500"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
