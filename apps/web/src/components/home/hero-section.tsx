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
  Activity,
  ShieldCheck,
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

  const activeSlide = HERO_SLIDES[currentSlide];

  return (
    <section
      id="main-content"
      className="relative w-full overflow-hidden bg-gradient-to-b from-slate-950/80 via-slate-900/40 to-background text-foreground pt-14 pb-20 sm:pt-20 sm:pb-28"
      aria-label="PrepFord NCLEX Hero"
    >
      {/* Background High-Resolution Nursing Photo Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-15 mix-blend-luminosity overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing-page-nurse.jpg"
          alt=""
          className="w-full h-full object-cover object-center filter saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09111E] via-[#0E1B2D]/85 to-background" />
      </div>

      {/* Animated Electrocardiogram (ECG) Heartbeat Line */}
      <div className="absolute inset-x-0 top-1/4 pointer-events-none opacity-25 overflow-hidden flex justify-center">
        <svg className="w-full max-w-6xl h-24" viewBox="0 0 1000 100" fill="none" preserveAspectRatio="none">
          <path
            d="M0,50 L250,50 L270,50 L280,30 L290,70 L300,10 L310,90 L320,50 L340,50 L600,50 L620,50 L630,30 L640,70 L650,10 L660,90 L670,50 L690,50 L1000,50"
            stroke="#0D9488"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-ecg"
          />
        </svg>
      </div>

      {/* Floating Healthcare Badges (Hidden on mobile) */}
      <div className="hidden xl:flex items-center gap-3 absolute left-10 top-36 px-4 py-2.5 rounded-2xl bg-card/85 dark:bg-slate-900/80 backdrop-blur-md border border-teal-500/30 shadow-lg animate-float-slow z-20">
        <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
          <HeartPulse className="h-5 w-5 animate-heartbeat" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">18 Question Formats</p>
          <p className="text-[10px] text-muted-foreground">Bowtie, Matrix & Trend</p>
        </div>
      </div>

      <div
        className="hidden xl:flex items-center gap-3 absolute right-10 top-48 px-4 py-2.5 rounded-2xl bg-card/85 dark:bg-slate-900/80 backdrop-blur-md border border-teal-500/30 shadow-lg animate-float-slow z-20"
        style={{ animationDelay: "1.8s" }}
      >
        <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Authentic EHR Charts</p>
          <p className="text-[10px] text-muted-foreground">Dynamic Lab Trends & Vitals</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Text Content */}
        <div className="text-center lg:max-w-4xl lg:mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            For NCLEX-RN and NCLEX-PN Candidates
          </div>

          <h1 className="mt-5 text-4xl font-serif font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Prepare with clarity.{" "}
            <span className="block text-secondary italic">Progress with purpose.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed lg:mx-auto lg:text-xl">
            A focused learning platform for future nurses—engineered with authentic Next Generation NCLEX case studies, comprehensive clinical rationales, and honest measures of test readiness.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
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
              className="w-full sm:w-auto font-semibold px-8 py-6 text-base border-2 rounded-xl bg-card/50 backdrop-blur-xs hover:bg-muted"
            >
              <Link href="#demo">
                <Play className="mr-2 h-5 w-5 text-secondary fill-secondary/20" />
                Try Free
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Independent preparation platform. Not affiliated with or endorsed by NCSBN.
          </p>
        </div>

        {/* Interactive Hero Carousel */}
        <div
          className="mt-12 lg:mt-16 relative rounded-3xl border border-border/80 bg-card/85 dark:bg-slate-900/75 backdrop-blur-md shadow-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-secondary/50"
          tabIndex={0}
          role="region"
          aria-label="PrepFord Feature Carousel"
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center min-h-[420px] lg:min-h-[480px]">
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
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
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
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next slide"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
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
