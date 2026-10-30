import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  BookOpen,
  Stethoscope,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { TextImageSection } from "@/components/ui/text-image-section";

export const metadata: Metadata = {
  title: "Features | PrepFord NCLEX",
  description:
    "Explore PrepFord NCLEX features: unfolding EHR case studies, step-by-step pathophysiologic rationales, adaptive CAT assessments, and 7-domain study notes.",
  alternates: {
    canonical: "/features",
  },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Editorial Header */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:pt-24 lg:pb-18 lg:px-8 bg-gradient-to-b from-teal-50/60 via-background to-background dark:from-teal-950/20 dark:via-background dark:to-background border-b border-border/40">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Built for Modern Nursing Licensure</span>
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
            Designed for Authentic Clinical Judgment
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            PrepFord combines Next Generation NCLEX question formats, option-by-option distractor analysis, server-scored readiness assessments, and an integrated 7-domain nursing study guide into one cohesive learning system.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Link href="/courses">
                Explore Question Modules
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl font-semibold border-border">
              <Link href="/study-guide">
                <BookOpen className="mr-2 h-4 w-4 text-secondary" />
                Browse Free Study Guide
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature 1: NGN EHR Unfolding Cases (Image Right, Card Container) */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <TextImageSection
          id="ngn-case-studies"
          dataTestId="feature-ngn-cases"
          variant="card"
          imagePosition="right"
          columnRatio="60-40"
          imageAspectRatio="4/3"
          eyebrow="Next Gen NCLEX Format"
          heading="Master Clinical Judgment with Authentic EHR Unfolding Cases"
          description="Move beyond static multiple-choice questions. PrepFord immerses you in multi-tab electronic health records featuring progressive nurses' notes, dynamic vital sign flowsheets, and real-time laboratory panels."
          imageSrc="/images/illustrations/prepford-ehr-unfolding-case.png"
          imageAlt="Candidate reviewing unfolding EHR clinical case study for Next Gen NCLEX"
          imageBadge="NCSBN CJMM Layer 3"
          imageCaption="Interactive Next Gen EHR workstation displaying shift trends, vital charts, and diagnostic panels"
          primaryAction={{
            label: "Explore Nursing Courses",
            href: "/courses",
            icon: Compass,
          }}
          secondaryAction={{
            label: "Try Sample Question",
            href: "/nclex-rn#rn-question-experience",
            icon: Activity,
          }}
        >
          <ul className="space-y-3 pt-2 text-sm text-foreground/90">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Multi-Tab EHR Charts:</strong> Navigate Provider Orders, Vital Signs, Flowsheets, and Laboratory panels formatted just like hospital systems.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>6-Step NCSBN Decision Model:</strong> Progress systematically through recognizing cues, analyzing patterns, prioritizing hypotheses, and evaluating outcomes.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Diverse NGN Item Formats:</strong> Extended Multiple Response, Dropdown Cloze, Drag-and-Drop Matrix, and Highlight items mirroring test-day conditions.
              </span>
            </li>
          </ul>
        </TextImageSection>
      </div>

      {/* Feature 2: In-Depth Pathophysiologic Rationales (Image Left, Muted Container) */}
      <div className="py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <TextImageSection
          id="clinical-rationales"
          dataTestId="feature-rationales"
          variant="muted"
          imagePosition="left"
          columnRatio="60-40"
          imageAspectRatio="4/3"
          eyebrow="Deep Clinical Reasoning"
          heading="Understand the 'Why' with Option-by-Option Pathophysiology Rationales"
          description="Reviewing only the correct answer leaves dangerous gaps in clinical reasoning. PrepFord dissects every single option—explaining exactly why the keyed intervention is life-saving and why tempting distractors compromise patient safety."
          imageSrc="/images/illustrations/prepford-pathophysiology-rationales.png"
          imageAlt="Nurse candidate studying detailed clinical rationale and pharmacology guide"
          imageBadge="Clinical Pearls & Alerts"
          imageCaption="High-yield pathophysiology diagrams and distractor breakdowns for every question"
          primaryAction={{
            label: "Explore NCLEX-RN Prep",
            href: "/nclex-rn",
            icon: Stethoscope,
          }}
          secondaryAction={{
            label: "Explore NCLEX-PN Prep",
            href: "/nclex-pn",
            icon: Stethoscope,
          }}
        >
          <ul className="space-y-3 pt-2 text-sm text-foreground/90">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Option-by-Option Distractor Analysis:</strong> Learn why each distractor is incorrect—distinguishing premature interventions from true emergencies.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Pathophysiology Callouts:</strong> Integrated disease mechanism summaries clarify fluid shifts, acid-base imbalances, and autonomic dysreflexia.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Pharmacological Warning Pearls:</strong> High-alert black box warnings, therapeutic serum levels, antidotes, and administration protocols.
              </span>
            </li>
          </ul>
        </TextImageSection>
      </div>

      {/* Feature 3: CAT Mock Exams & Readiness Analytics (Image Right, Card Container) */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <TextImageSection
          id="readiness-analytics"
          dataTestId="feature-analytics"
          variant="card"
          imagePosition="right"
          columnRatio="60-40"
          imageAspectRatio="4/3"
          eyebrow="Honest Benchmarking"
          heading="Objective Readiness Assessments & Domain Accuracy Tracking"
          description="PrepFord provides rigorous, server-scored mock exams and domain-level analytics mapped directly to the NCSBN Client Needs categories—without misleading marketing guarantees or artificial score inflation."
          imageSrc="/images/illustrations/prepford-readiness-analytics.png"
          imageAlt="Candidate performance dashboard displaying readiness signals and topic proficiency"
          imageBadge="Computerized Adaptive Testing"
          imageCaption="Candidate accuracy tracking across Client Needs domains and pacing analytics"
          primaryAction={{
            label: "View Study Plans",
            href: "/subscriptions",
            icon: ShieldCheck,
          }}
          secondaryAction={{
            label: "Open Student Dashboard",
            href: "/dashboard",
            icon: BarChart3,
          }}
        >
          <ul className="space-y-3 pt-2 text-sm text-foreground/90">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Client Needs Category Reports:</strong> Track accuracy in Management of Care, Pharmacological Therapies, Physiological Adaptation, and Safety.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Adaptive CAT Simulation:</strong> Experience test-day pacing and variable question difficulty that mirrors actual NCSBN examination algorithms.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Targeted Remediation Queue:</strong> Flag tricky questions and automatically launch custom practice sessions focused on your weakest clinical domains.
              </span>
            </li>
          </ul>
        </TextImageSection>
      </div>

      {/* Feature 4: 7-Domain Study Guide (Image Left, Feature / Dark Container) */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <TextImageSection
          id="integrated-study-guide"
          dataTestId="feature-study-guide"
          variant="feature"
          imagePosition="left"
          columnRatio="60-40"
          imageAspectRatio="16/9"
          eyebrow="Structured Reference Notes"
          heading="Integrated 7-Domain Nursing Study Guide & High-Yield Notes"
          description="Close learning gaps immediately. When a practice question reveals an unfamiliar pharmacology mechanism or nursing protocol, jump directly into PrepFord's concise clinical study notes."
          imageSrc="/images/illustrations/prepford-study-guide-overview.png"
          imageAlt="Comprehensive nursing reference notes and clinical domain study guides"
          imageBadge="100% Free Open Access"
          imageCaption="7 clinical categories covering Med-Surg, Pharmacology, Maternal-Newborn, Pediatrics, and Leadership"
          primaryAction={{
            label: "Open Nursing Study Guide",
            href: "/study-guide",
            icon: BookOpen,
          }}
          secondaryAction={{
            label: "Read Educator Blog",
            href: "/blog",
            icon: FileText,
          }}
        >
          <ul className="space-y-3 pt-2 text-sm text-slate-200">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>7 Core Nursing Categories:</strong> Medical-Surgical, Pharmacology, Maternal & Newborn, Pediatrics, Mental Health, Fundamentals, and Leadership.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Clinical Red-Flag Alerts:</strong> Highlighting emergent nursing actions, critical lab limits, and triage delegation rules.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Fast Search & Filtering:</strong> Quickly look up specific disorders such as Heart Failure, DKA, Preeclampsia, and Anticoagulants.
              </span>
            </li>
          </ul>
        </TextImageSection>
      </div>

      {/* Feature 5: Dedicated Licensure Pathways (Image Right, Card Container) */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <TextImageSection
          id="licensure-pathways"
          dataTestId="feature-pathways"
          variant="card"
          imagePosition="right"
          columnRatio="50-50"
          imageAspectRatio="16/9"
          eyebrow="Targeted Licensure Prep"
          heading="Dedicated Question Banks Tailored to Your Nursing Scope"
          description="Registered Nurse (RN) and Practical/Vocational Nurse (PN) roles have fundamentally different scopes of practice. PrepFord provides two distinct curriculum tracks so candidates never practice out-of-scope questions."
          imageSrc="/images/illustrations/prepford-landing-hero.png"
          imageAlt="Nursing candidate preparing for NCLEX licensure with PrepFord digital learning workspace"
          imageBadge="RN & PN Pathways"
          imageCaption="Tailored clinical questions matched to NCSBN RN and PN Test Plans"
          primaryAction={{
            label: "Explore NCLEX-RN",
            href: "/nclex-rn",
            icon: Stethoscope,
          }}
          secondaryAction={{
            label: "Explore NCLEX-PN",
            href: "/nclex-pn",
            icon: Stethoscope,
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-muted/60 space-y-1">
              <p className="font-bold text-foreground">NCLEX-RN Pathway</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Focus on comprehensive assessment, IV titration, unstable client triage, and delegation to LPNs and UAPs.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/60 space-y-1">
              <p className="font-bold text-foreground">NCLEX-PN Pathway</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Focus on focused client data collection, safe medication administration, reporting changes, and coordinated care.
              </p>
            </div>
          </div>
        </TextImageSection>
      </div>

      {/* Summary Matrix Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30 border-t border-border/50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Core Platform Capabilities at a Glance
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Everything you need to master clinical reasoning and approach test day with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Stethoscope,
                title: "NCLEX-Style Question Bank",
                description: "Original clinical vignettes with unfolding client cues written by experienced nursing educators.",
                href: "/courses",
                cta: "Browse Courses",
              },
              {
                icon: FileText,
                title: "Detailed Answer Rationales",
                description: "Option-by-option distractor analysis and pathophysiologic mechanisms explaining the clinical safety rule.",
                href: "/nclex-rn#rn-question-experience",
                cta: "Try Sample Item",
              },
              {
                icon: ClipboardCheck,
                title: "Readiness Assessments",
                description: "Server-scored simulation exams with topic-level analytics and objective performance feedback.",
                href: "/subscriptions",
                cta: "View Assessments",
              },
              {
                icon: BarChart3,
                title: "Client Needs Analytics",
                description: "Domain accuracy tracking across Management of Care, Pharmacology, and Physiological Adaptation.",
                href: "/dashboard",
                cta: "Student Workspace",
              },
              {
                icon: Activity,
                title: "Clinical Judgment Practice",
                description: "EHR-based Next Gen NCLEX unfolding cases developing 6-step cognitive clinical reasoning.",
                href: "/courses",
                cta: "Explore NGN Cases",
              },
              {
                icon: BookOpen,
                title: "7-Domain Study Guide",
                description: "High-yield nursing study notes, pharmacology alerts, and essential bedside clinical pearls.",
                href: "/study-guide",
                cta: "Open Study Guide",
              },
            ].map((item) => (
              <Card key={item.title} className="flex flex-col justify-between rounded-2xl bg-card border-border/60 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary mb-3">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-serif font-bold text-foreground">{item.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2">
                  <Link href={item.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline">
                    <span>{item.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
