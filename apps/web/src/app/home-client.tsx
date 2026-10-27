"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useProgrammes } from "@/hooks/use-api";
import { HeroSection } from "@/components/home/hero-section";
import { ExamPathwayCards } from "@/components/home/exam-pathway-cards";
import { FeatureShowcase } from "@/components/home/feature-showcase";
import { HowItWorks } from "@/components/home/how-it-works";
import { CourseFinderQuiz } from "@/components/home/course-finder";
import { LearningResources } from "@/components/home/learning-resources";
import { TestimonialsPreview } from "@/components/home/testimonials-preview";
import { FAQPreview } from "@/components/home/faq-preview";
import { FinalCTA } from "@/components/home/final-cta";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HomeClient() {
  const { data: programmes, isLoading } = useProgrammes();

  return (
    <>
      <HeroSection />
      <ExamPathwayCards />
      {isLoading ? (
        <div className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <p className="text-sm text-muted-foreground">Loading licensure pathways…</p>
          </div>
        </div>
      ) : (
        <SubscriptionCards programmes={programmes ?? []} />
      )}
      <FeatureShowcase />
      <HowItWorks />
      <CourseFinderQuiz />
      <LearningResources />
      <TestimonialsPreview />
      <FAQPreview />
      <FinalCTA />
    </>
  );
}

function SubscriptionCards({
  programmes,
}: {
  programmes: Array<{ code: string; displayName: string; isActive: boolean }>;
}) {
  return (
    <section id="subscriptions" className="pt-20 pb-24 px-4 bg-card lg:pt-32 lg:pb-32 lg:px-8 border-y border-border">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">
            Verified Licensure Plans
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
            Pathways built for your exam
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto lg:text-lg">
            Select the pathway that matches your licensure exam. Each pathway includes authentic NGN questions, detailed rationales, and progress tracking.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {programmes.map((p) => {
            const isRn = p.code.toUpperCase() === "RN";
            const planId = isRn ? "rn-pro" : "pn-pro";
            const detailHref = `/nclex-${p.code.toLowerCase()}`;
            const cartHref = `/cart?add=${planId}`;

            return (
              <Card key={p.code} className="flex flex-col h-full border-border bg-card shadow-sm hover:shadow transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-secondary/40 text-secondary font-bold text-xs">
                      {p.code} Pathway
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      $59 / month
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-2xl font-serif text-foreground">
                    {p.displayName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Comprehensive preparation for the {p.displayName} with original NCLEX-style questions, adaptive CAT mock tests, and actionable clinical rationales.
                  </p>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                      <span>{isRn ? "3,500+" : "2,800+"} practice questions with NGN items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                      <span>Topic-level clinical judgment analytics</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-2.5">
                  <Button asChild className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                    <Link href={cartHref} className="flex items-center justify-center gap-1.5">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Enroll in {p.code} Pro</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href={detailHref} className="flex items-center justify-center gap-1">
                      <span>Explore Pathway</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline transition-colors"
          >
            <span>Compare all preparation plans &amp; pricing</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
