"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextImageSection } from "@/components/ui/text-image-section";

export function AboutPageClient() {
  return (
    <div className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Editorial Hero */}
      <section className="border-b border-border bg-card/60 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nurse Educator-Led Mission</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground">
            Dedicated to Clinical Excellence in Nursing Licensure
          </h1>
          <p className="mt-6 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            PrepFord provides rigorous, evidence-based preparation for both NCLEX-RN and NCLEX-PN candidates.
            We focus on developing authentic clinical judgment—not just test-taking tricks.
          </p>
        </div>
      </section>

      {/* Core Educational Pillars */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Our Core Educational Principles
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Every practice item, study guide note, and simulated case study is constructed around four non-negotiable principles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-2xl border-border/60 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary mb-4">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">Clinical Authenticity</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Questions mirror genuine clinical bedside scenarios with unfolding patient cues, realistic vital signs, and plausible distractors.
                </p>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/60 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary mb-4">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">Layer 3 CJMM Alignment</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Structured around the NCSBN Clinical Judgment Measurement Model to test recognizing cues, analyzing patterns, and prioritizing care.
                </p>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/60 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">Transparent Rationales</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Option-by-option rationale breakdowns explain not only why the correct answer is safe, but exactly why incorrect choices compromise patient safety.
                </p>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/60 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary mb-4">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground">Honest Benchmarking</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We provide objective readiness domain metrics without fabricated pass predictions or misleading marketing guarantees.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pathways Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Preparation Built for Your Licensure Pathway
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Choose the program designed specifically for your nursing scope of practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="rounded-3xl border-border p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
              <div>
                <Badge className="bg-secondary/15 text-secondary border-none mb-3">RN Licensure</Badge>
                <h3 className="text-2xl font-serif font-bold text-foreground">NCLEX-RN Pathway</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Comprehensive review for BSN and ADN candidates focusing on advanced clinical judgment, complex case management, delegation, and hemodynamic stabilization.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-foreground/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>Full Next Generation NCLEX question bank</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>CAT exam simulator &amp; timed readiness packs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>7-domain nursing study guides &amp; pharmacology cheat sheets</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60">
                <Link
                  href="/nclex-rn"
                  className="inline-flex items-center justify-center w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span>Explore NCLEX-RN Prep</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </Card>

            <Card className="rounded-3xl border-border p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
              <div>
                <Badge className="bg-secondary/15 text-secondary border-none mb-3">PN/VN Licensure</Badge>
                <h3 className="text-2xl font-serif font-bold text-foreground">NCLEX-PN Pathway</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Focused review for LPN and LVN candidates emphasizing client needs, coordinated care, safe medication administration, and essential physiological adaptation.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-foreground/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>Dedicated practical nurse practice question items</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>Client Needs category readiness feedback</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>High-alert medication &amp; clinical calculation drills</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-border/60">
                <Link
                  href="/nclex-pn"
                  className="inline-flex items-center justify-center w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span>Explore NCLEX-PN Prep</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Support & Contact Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-serif font-bold text-foreground">Have Questions About PrepFord?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Our nurse educators and candidate support team are here to help you navigate study plans, subscription access, and platform tools.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors shadow-sm"
            >
              <span>Contact Educator Support</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <span>Read Exam FAQs</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
