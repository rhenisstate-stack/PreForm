"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NursingPathwayData {
  id: string;
  code: "RN" | "PN";
  title: string;
  audience: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  features: string[];
  detailsHref: string;
  ctaLabel: string;
  plansHref: string;
}

const NURSING_PATHWAYS: NursingPathwayData[] = [
  {
    id: "nclex-rn-pathway",
    code: "RN",
    title: "NCLEX-RN Exam Preparation",
    audience: "Registered Nurse preparation (BSN & ADN candidates)",
    description:
      "Built for future Registered Nurses preparing to evaluate complex client cues, prioritize acute interventions, and master Next Generation NCLEX clinical judgment.",
    imageSrc: "/image1.jpg",
    imageAlt: "NCLEX-RN candidate engaging in clinical judgment simulation",
    features: [
      "3,500+ original NGN-style practice questions",
      "Unfolding 6-part clinical case studies with EHR tabs",
      "Step-by-step pathophysiologic & distractor rationales",
      "Full-length adaptive CAT mock exams & readiness tracking",
    ],
    detailsHref: "/nclex-rn",
    ctaLabel: "Explore NCLEX-RN",
    plansHref: "/subscriptions?programme=RN",
  },
  {
    id: "nclex-pn-pathway",
    code: "PN",
    title: "NCLEX-PN Exam Preparation",
    audience: "Practical / Vocational Nurse preparation (LPN & LVN candidates)",
    description:
      "Designed for future Practical and Vocational Nurses focusing on focused client data collection, safe medication administration, and coordinated clinical care.",
    imageSrc: "/image2.jpg",
    imageAlt: "NCLEX-PN candidate reviewing patient charts and medication safety",
    features: [
      "2,800+ practical nursing practice questions",
      "Focused data collection & patient safety case scenarios",
      "Clear clinical rationales for every answer option",
      "Adaptive CAT simulation exams & topic proficiency analytics",
    ],
    detailsHref: "/nclex-pn",
    ctaLabel: "Explore NCLEX-PN",
    plansHref: "/subscriptions?programme=PN",
  },
];

export function ExamPathwayCards() {
  return (
    <section
      id="nursing-pathways"
      aria-labelledby="nursing-pathways-heading"
      className="scroll-mt-20 pt-20 pb-24 px-4 sm:px-6 lg:pt-28 lg:pb-28 lg:px-8 bg-background"
    >
      <div id="products" className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Choose Your Nursing Exam Path
          </p>
          <h2
            id="nursing-pathways-heading"
            className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Focused Preparation for NCLEX-RN &amp; NCLEX-PN
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Select your nursing licensure pathway to access exam-specific practice questions, clinical judgment case studies, and structured study tools.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {NURSING_PATHWAYS.map((pathway) => (
            <Card
              key={pathway.id}
              data-testid={`pathway-card-${pathway.code.toLowerCase()}`}
              className="flex flex-col h-full relative transition-all duration-300 hover:shadow-xl overflow-hidden bg-card rounded-3xl shadow-md"
            >
              {/* Pathway Image Header */}
              <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pathway.imageSrc}
                  alt={pathway.imageAlt}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
                <Badge
                  variant="outline"
                  className="absolute bottom-4 left-6 bg-card/95 backdrop-blur-xs border-secondary/30 text-secondary font-bold text-xs px-3 py-1 rounded-full"
                >
                  <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
                  NCLEX-{pathway.code} Pathway
                </Badge>
              </div>

              <CardHeader className="px-6 sm:px-8 pb-3 pt-4">
                <CardTitle className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
                  {pathway.title}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-secondary font-semibold mt-1">
                  {pathway.audience}
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 sm:px-8 pt-0 flex-1 space-y-5">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {pathway.description}
                </p>

                <div className="pt-1">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-3">
                    What&apos;s Included for NCLEX-{pathway.code}:
                  </span>
                  <ul className="space-y-2.5">
                    {pathway.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="px-6 sm:px-8 pt-6 pb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm rounded-xl"
                >
                  <Link href={pathway.detailsHref}>
                    {pathway.ctaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto font-semibold rounded-xl"
                >
                  <Link href={pathway.plansHref}>View {pathway.code} Plans</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-secondary" />
            Looking for combined RN &amp; PN access or institutional options?
          </span>
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1 font-semibold text-secondary hover:underline"
          >
            Compare all preparation plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
