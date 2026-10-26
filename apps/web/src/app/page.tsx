import Link from "next/link";
import { HeroSection } from "@/components/home/hero-section";
import { ExamPathwayCards } from "@/components/home/exam-pathway-cards";
import { FeatureShowcase } from "@/components/home/feature-showcase";
import { HowItWorks } from "@/components/home/how-it-works";
import { CourseFinderQuiz } from "@/components/home/course-finder";
import { TestimonialsPreview } from "@/components/home/testimonials-preview";
import { FAQPreview } from "@/components/home/faq-preview";
import { FinalCTA } from "@/components/home/final-cta";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { useProgrammes } from "@/hooks/use-api";

export const metadata = {
  title: "PREform NCLEX | Prepare with clarity",
  description:
    "A focused learning platform for NCLEX-RN and NCLEX-PN candidates, being built with clinical accuracy and transparent assessment at its core.",
};

export default function Home() {
  const { data: programmes, isLoading } = useProgrammes();

  return (
    <>
      <HeroSection />
      <ExamPathwayCards />
      {isLoading ? (
        <div className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <SubscriptionCards programmes={programmes ?? []} />
      )}
      <FeatureShowcase />
      <HowItWorks />
      <CourseFinderQuiz />
      <TestimonialsPreview />
      <FAQPreview />
      <FinalCTA />
    </>
  );
}

function SubscriptionCards({ programmes }: { programmes: Array<{ code: string; displayName: string; isActive: boolean }> }) {
  return (
    <section id="subscriptions" className="pt-20 pb-24 px-4 bg-white lg:pt-32 lg:pb-32 lg:px-8 border-y border-line">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-green">
            Choose your preparation
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
            Pathways built for your exam
          </h2>
          <p className="mt-6 text-muted max-w-xl mx-auto lg:text-lg">
            Select the pathway that matches your licensure exam. Each pathway
            includes original questions, detailed rationales, and progress
            tracking.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {programmes.map((p) => (
            <Card key={p.code} className="flex flex-col h-full">
              <CardHeader>
                <div className="flex items-start gap-2">
                  <Badge variant="outline">{p.code}</Badge>
                  {p.isActive && (
                    <Badge variant="success" className="ml-2">
                      Available
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-2xl font-serif">{p.displayName}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted">
                  Start preparing for the {p.displayName} with original
                  NCLEX-style questions and detailed rationales.
                </p>
              </CardContent>
              <CardFooter>
                <Link
                  href={`/nclex-${p.code.toLowerCase()}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-green transition-colors"
                >
                  Explore {p.displayName}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1 text-sm font-medium text-green transition-colors"
          >
            View all plans <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
