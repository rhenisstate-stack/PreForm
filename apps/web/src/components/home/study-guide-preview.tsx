"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, FileText } from "lucide-react";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function StudyGuidePreview() {
  return (
    <section
      id="study-guide-preview"
      aria-labelledby="study-guide-preview-heading"
      className="py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-background"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Study Guide &amp; Nursing Notes
            </p>
            <h2
              id="study-guide-preview-heading"
              className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl"
            >
              High-Yield Clinical Notes Organized by Nursing Subject
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Review structured nursing concepts, pathophysiology summaries, pharmacology alerts, and priority clinical takeaways across all seven PrepFord study domains.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm rounded-xl"
            >
              <Link href="/study-guide">
                <BookOpen className="mr-2 h-4 w-4" />
                Open Full Study Guide
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STUDY_GUIDE_CATEGORIES.slice(0, 6).map((category) => (
            <Card
              key={category.id}
              data-testid={`study-guide-preview-${category.slug}`}
              className="flex flex-col justify-between bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="border-secondary/30 bg-secondary/10 text-secondary text-xs font-semibold"
                    >
                      {category.badge}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {category.subjects.length}{" "}
                      {category.subjects.length === 1 ? "Topic" : "Topics"}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-serif font-bold text-foreground">
                    <Link
                      href={`/study-guide/${category.slug}`}
                      className="hover:text-secondary transition-colors"
                    >
                      {category.title}
                    </Link>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    {category.subjects.slice(0, 2).map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/study-guide/${category.slug}/${subject.slug}`}
                        className="flex items-center gap-2 text-xs font-medium text-foreground/85 hover:text-secondary transition-colors py-1"
                      >
                        <FileText className="h-3.5 w-3.5 text-secondary shrink-0" />
                        <span className="truncate">{subject.title}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </div>

              <CardFooter className="pt-4">
                <Link
                  href={`/study-guide/${category.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                >
                  Browse {category.shortTitle} Notes
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Seventh Domain Callout + All Categories Link */}
        {STUDY_GUIDE_CATEGORIES[6] && (
          <div className="mt-6 rounded-2xl bg-card p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-secondary/30 bg-secondary/10 text-secondary text-xs font-semibold"
                >
                  {STUDY_GUIDE_CATEGORIES[6].badge}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {STUDY_GUIDE_CATEGORIES[6].subjects.length} Topics
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-foreground">
                {STUDY_GUIDE_CATEGORIES[6].title}
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {STUDY_GUIDE_CATEGORIES[6].description}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 rounded-xl font-semibold">
              <Link href={`/study-guide/${STUDY_GUIDE_CATEGORIES[6].slug}`}>
                Browse {STUDY_GUIDE_CATEGORIES[6].shortTitle} Notes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
