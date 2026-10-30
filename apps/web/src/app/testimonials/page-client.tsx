"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";
import { SubmitTestimonialDialog } from "@/components/testimonials/submit-testimonial-dialog";
import {
  ArrowRight,
  Quote,
  BookOpen,
  Sparkles,
  GraduationCap,
  HeartPulse,
  ClipboardCheck,
  Brain,
  CheckCircle2,
  Stethoscope,
  Layers,
  MessageSquarePlus,
} from "lucide-react";

interface TestimonialProps {
  id: string;
  name: string;
  role: string;
  pathway: "RN" | "PN";
  studyFocus: string;
  content: string;
  date: string;
}

const testimonials: TestimonialProps[] = [
  {
    id: "test-1",
    name: "Alex R., BSN",
    role: "NCLEX-RN Candidate",
    pathway: "RN",
    studyFocus: "Physiological Adaptation & Prioritization",
    content:
      "The clinical rationales helped me stop memorizing isolated facts and start thinking through priority nursing actions. Breaking down why each distractor was unsafe changed how I approached multisystem questions on test day.",
    date: "October 2026",
  },
  {
    id: "test-2",
    name: "Sam K., LPN",
    role: "NCLEX-PN Candidate",
    pathway: "PN",
    studyFocus: "Cardiovascular & Pharmacology",
    content:
      "Clear explanations and a question bank that genuinely reflected the exam format. The medication antidote tables and client monitoring questions gave me confidence on test day. The interface is clean and focused.",
    date: "September 2026",
  },
  {
    id: "test-3",
    name: "Jordan M., RN",
    role: "Registered Nurse Pathway",
    pathway: "RN",
    studyFocus: "Pharmacology & Parenteral Therapies",
    content:
      "Having the Study Guide organized right alongside the question bank made my daily review sessions much calmer. Whenever I missed a pharmacology question, I could review the exact medication class notes in minutes.",
    date: "September 2026",
  },
  {
    id: "test-4",
    name: "Taylor D., LPN",
    role: "NCLEX-PN Candidate",
    pathway: "PN",
    studyFocus: "Infection Control & Safety",
    content:
      "The targeted diagnostic quizzes showed me exactly which client need areas required attention. The interface was distraction-free and the explanations were straightforward and evidence-based.",
    date: "August 2026",
  },
  {
    id: "test-5",
    name: "Morgan L., BSN",
    role: "NCLEX-RN Candidate",
    pathway: "RN",
    studyFocus: "Management of Care & Delegation",
    content:
      "The interface stays clean and distraction-free in both light and dark modes, which made a huge difference during late-evening study blocks after clinical rotations. Delegation rules were broken down clearly.",
    date: "July 2026",
  },
  {
    id: "test-6",
    name: "Casey P., ADN",
    role: "NCLEX-RN Candidate",
    pathway: "RN",
    studyFocus: "Domain Readiness & Remediation",
    content:
      "I appreciated that the readiness assessments gave me a straightforward breakdown by nursing domain instead of overwhelming charts. I knew right away to spend my final two weeks on maternal-newborn and endocrine care.",
    date: "June 2026",
  },
];

const featureHighlights = [
  {
    icon: GraduationCap,
    title: "2 Licensure Tracks",
    description: "Dedicated preparation for NCLEX-RN and NCLEX-PN candidates.",
  },
  {
    icon: Layers,
    title: "7 Clinical Domains",
    description: "Full coverage across Client Needs categories and study notes.",
  },
  {
    icon: BookOpen,
    title: "Unfolding Case Studies",
    description: "Multi-tab electronic health record scenarios mirroring clinical practice.",
  },
  {
    icon: CheckCircle2,
    title: "100% In-Depth Rationales",
    description: "Evidence-based explanations for both correct answers and distractors.",
  },
];

export function TestimonialsPageClient() {
  const [selectedFilter, setSelectedFilter] = React.useState<"ALL" | "RN" | "PN">("ALL");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = React.useState(false);

  const filteredTestimonials = React.useMemo(() => {
    if (selectedFilter === "ALL") return testimonials;
    return testimonials.filter((t) => t.pathway === selectedFilter);
  }, [selectedFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Testimonials Hero Section with Real Image and Floating Icons */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card/90 via-card/50 to-background py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        {/* Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-10 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-secondary/10 blur-3xl"
        />

        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Heading, Supporting Copy, and CTAs */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3.5 py-1 text-xs font-semibold text-secondary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Candidate Learning Reflections</span>
              </div>

              <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
                Real Progress. Meaningful Preparation.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Discover how nursing candidates leverage PrepFord&rsquo;s structured clinical rationales, Next Generation NCLEX case studies, and domain study notes to build genuine test-day confidence.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button asChild size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                  <Link href="/courses?type=practice">
                    <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    Start Free Practice
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/subscriptions">
                    <span>Compare Study Plans</span>
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              {/* Pathway Quick Indicator */}
              <div className="pt-2 flex items-center justify-center lg:justify-start gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <span>NCLEX-RN (BSN/ADN)</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <span>NCLEX-PN (LPN/LVN)</span>
                </span>
              </div>
            </div>

            {/* Right Column: Hero Visual with Surrounding Floating Decorative Elements */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="relative w-full max-w-md sm:max-w-lg mx-auto">
                {/* Main Hero Image */}
                <div className="relative aspect-[4/5] sm:aspect-[3/4] w-full rounded-3xl overflow-hidden border border-border shadow-xl bg-card">
                  <Image
                    src="/images/testimonials/prepford-testimonials-hero.jpg"
                    alt="Confident smiling nursing graduate in clinical scrubs holding graduation cap and stethoscope"
                    fill
                    priority
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 460px"
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-background/85 backdrop-blur-md border border-border/60 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Clinical Milestone Celebration</p>
                      <p className="text-[11px] text-muted-foreground">PrepFord NCLEX Learning Journey</p>
                    </div>
                    <Badge variant="outline" className="border-secondary text-secondary font-semibold">
                      Verified
                    </Badge>
                  </div>
                </div>

                {/* Floating Decorative Element 1: Top-Left (Book-open) */}
                <div
                  aria-hidden="true"
                  className="hidden sm:flex absolute -top-4 -left-6 z-10 items-center gap-2.5 rounded-2xl border border-secondary/25 bg-background/95 dark:bg-card/95 backdrop-blur-md p-2.5 sm:p-3 shadow-lg motion-safe:animate-bounce [animation-duration:4s] motion-reduce:animate-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15 text-secondary shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="pr-1">
                    <p className="text-[11px] font-bold text-foreground leading-tight">Clinical Rationales</p>
                    <p className="text-[10px] text-muted-foreground">Evidence-based</p>
                  </div>
                </div>

                {/* Floating Decorative Element 2: Top-Right (Graduation-cap) */}
                <div
                  aria-hidden="true"
                  className="hidden sm:flex absolute -top-5 -right-6 z-10 items-center gap-2.5 rounded-2xl border border-secondary/25 bg-background/95 dark:bg-card/95 backdrop-blur-md p-2.5 sm:p-3 shadow-lg motion-safe:animate-bounce [animation-duration:5s] [animation-delay:1s] motion-reduce:animate-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div className="pr-1">
                    <p className="text-[11px] font-bold text-foreground leading-tight">RN &amp; PN Pathways</p>
                    <p className="text-[10px] text-muted-foreground">Targeted domains</p>
                  </div>
                </div>

                {/* Floating Decorative Element 3: Middle-Left (Heart-pulse) */}
                <div
                  aria-hidden="true"
                  className="hidden md:flex absolute top-1/2 -left-8 -translate-y-1/2 z-10 items-center gap-2 rounded-2xl border border-secondary/25 bg-background/95 dark:bg-card/95 backdrop-blur-md p-2.5 shadow-lg motion-safe:animate-pulse [animation-duration:3s] motion-reduce:animate-none"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
                    <HeartPulse className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground pr-1">Cardiovascular</span>
                </div>

                {/* Floating Decorative Element 4: Middle-Right (Clipboard-check) */}
                <div
                  aria-hidden="true"
                  className="hidden md:flex absolute top-1/3 -right-8 z-10 items-center gap-2.5 rounded-2xl border border-secondary/25 bg-background/95 dark:bg-card/95 backdrop-blur-md p-2.5 sm:p-3 shadow-lg motion-safe:animate-bounce [animation-duration:4.5s] [animation-delay:0.5s] motion-reduce:animate-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15 text-secondary shrink-0">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div className="pr-1">
                    <p className="text-[11px] font-bold text-foreground leading-tight">Adaptive Testing</p>
                    <p className="text-[10px] text-muted-foreground">CAT Simulator</p>
                  </div>
                </div>

                {/* Floating Decorative Element 5: Bottom-Left (Brain) */}
                <div
                  aria-hidden="true"
                  className="hidden sm:flex absolute -bottom-5 -left-5 z-10 items-center gap-2.5 rounded-2xl border border-secondary/25 bg-background/95 dark:bg-card/95 backdrop-blur-md p-2.5 sm:p-3 shadow-lg motion-safe:animate-bounce [animation-duration:5.5s] [animation-delay:1.5s] motion-reduce:animate-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="pr-1">
                    <p className="text-[11px] font-bold text-foreground leading-tight">Clinical Judgment</p>
                    <p className="text-[10px] text-muted-foreground">NCJMM Layer 3</p>
                  </div>
                </div>

                {/* Floating Decorative Element 6: Bottom-Right (Stethoscope) */}
                <div
                  aria-hidden="true"
                  className="hidden sm:flex absolute -bottom-4 -right-5 z-10 items-center gap-2 rounded-2xl border border-secondary/25 bg-background/95 dark:bg-card/95 backdrop-blur-md p-2.5 shadow-lg motion-safe:animate-pulse [animation-duration:4s] motion-reduce:animate-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground pr-1">Bedside Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Truthful Feature Credibility Highlights (No invented pass rates) */}
      <section className="border-b border-border bg-card/40 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureHighlights.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="flex items-start gap-3.5 p-4 rounded-xl border border-border/70 bg-card/60 shadow-xs"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/12 text-secondary shrink-0">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{feat.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Filter & Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Candidate Reflections by Pathway
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Filter reflections to see how nurses in your specific licensure track approach their study blocks.
            </p>

            {/* Pathway Filter Controls */}
            <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Filter by exam pathway">
              <button
                role="tab"
                aria-selected={selectedFilter === "ALL"}
                onClick={() => setSelectedFilter("ALL")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  selectedFilter === "ALL"
                    ? "bg-secondary text-secondary-foreground shadow-xs ring-1 ring-secondary/40"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All Scenarios ({testimonials.length})
              </button>
              <button
                role="tab"
                aria-selected={selectedFilter === "RN"}
                onClick={() => setSelectedFilter("RN")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  selectedFilter === "RN"
                    ? "bg-secondary text-secondary-foreground shadow-xs ring-1 ring-secondary/40"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                NCLEX-RN ({testimonials.filter((t) => t.pathway === "RN").length})
              </button>
              <button
                role="tab"
                aria-selected={selectedFilter === "PN"}
                onClick={() => setSelectedFilter("PN")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  selectedFilter === "PN"
                    ? "bg-secondary text-secondary-foreground shadow-xs ring-1 ring-secondary/40"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                NCLEX-PN ({testimonials.filter((t) => t.pathway === "PN").length})
              </button>
            </div>
          </div>

          {/* Testimonials Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTestimonials.map((t) => {
              const isExpanded = expandedId === t.id;
              const isLong = t.content.length > 180;
              const displayContent = isExpanded || !isLong ? t.content : `${t.content.slice(0, 180)}…`;

              return (
                <Card
                  key={t.id}
                  className="border-border/80 bg-card flex flex-col justify-between hover:border-secondary/50 transition-all shadow-xs hover:shadow-md"
                >
                  <CardContent className="pt-6 pb-6 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Quote className="h-6 w-6 text-secondary/40" aria-hidden="true" />
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-bold text-foreground">
                          {t.pathway === "RN" ? "NCLEX-RN" : "NCLEX-PN"}
                        </span>
                      </div>

                      <p className="text-sm text-foreground leading-relaxed italic">
                        &ldquo;{displayContent}&rdquo;
                      </p>

                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(t.id)}
                          className="inline-flex items-center gap-1 text-xs text-secondary hover:underline font-medium pt-1"
                        >
                          <span>{isExpanded ? "Show less" : "Read full reflection"}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {t.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{t.role} • {t.studyFocus}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">{t.date}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Marketing & Provenance Disclosure Safeguard */}
          <div className="mt-12 mx-auto max-w-3xl rounded-xl border border-secondary/25 bg-secondary/5 p-4 text-xs text-muted-foreground leading-relaxed text-center sm:text-left shadow-xs">
            <strong className="text-foreground font-semibold">Transparency Notice:</strong> The profiles and reflections above illustrate representative clinical study workflows and learning journeys. Live verified student survey reviews will be published as our initial post-examination survey cohorts conclude. Individual examination performance depends on dedicated study and comprehensive nursing clinical knowledge.
          </div>

          {/* Final CTA Banner */}
          <div className="mt-16 rounded-2xl border border-secondary/25 bg-gradient-to-r from-secondary/10 via-card to-secondary/5 p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Ready to Strengthen Your Clinical Judgment?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Explore PrepFord preparation pathways or try sample Next Generation NCLEX questions with in-depth clinical rationales.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                <Link href="/courses">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explore PrepFord Courses
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/subscriptions">
                  <span>View Subscription Plans</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
