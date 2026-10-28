"use client";

import * as React from "react";
import Link from "next/link";
import {
  Stethoscope,
  Pill,
  Baby,
  Smile,
  HeartPulse,
  Brain,
  Layers,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { STUDY_GUIDE_CATEGORIES, type StudyGuideCategory } from "@/lib/study-guide-data";

function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case "Stethoscope":
      return <Stethoscope className="h-7 w-7 text-teal-600 dark:text-teal-400" />;
    case "Pill":
      return <Pill className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />;
    case "Baby":
      return <Baby className="h-7 w-7 text-rose-500 dark:text-rose-400" />;
    case "Smile":
      return <Smile className="h-7 w-7 text-amber-500 dark:text-amber-400" />;
    case "Brain":
      return <Brain className="h-7 w-7 text-purple-600 dark:text-purple-400" />;
    case "HeartPulse":
      return <HeartPulse className="h-7 w-7 text-sky-600 dark:text-sky-400" />;
    case "Layers":
      return <Layers className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />;
    default:
      return <BookOpen className="h-7 w-7 text-teal-600 dark:text-teal-400" />;
  }
}

interface Props {
  category: StudyGuideCategory;
}

export function CategoryPageClient({ category }: Props) {
  const otherCategories = STUDY_GUIDE_CATEGORIES.filter((c) => c.id !== category.id);

  return (
    <div className="w-full bg-background min-h-screen">
      {/* Category Hero Banner */}
      <section className="w-full bg-gradient-to-b from-teal-50/80 via-background to-background dark:from-teal-950/25 dark:via-background dark:to-background pt-10 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center space-x-2 text-xs text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li>
                <Link href="/study-guide" className="hover:text-foreground transition-colors">
                  Study Guide
                </Link>
              </li>
              <li>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="text-foreground font-medium" aria-current="page">
                {category.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400">
                  {category.badge}
                </span>
                <span className="text-xs text-muted-foreground">
                  {category.subjects.length} comprehensive topics
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-card shadow-xs">
                  {getCategoryIcon(category.iconName)}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-foreground">
                  {category.title}
                </h1>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-1">
                {category.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 self-stretch md:self-auto">
              <Link
                href="/study-guide"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors shadow-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Categories</span>
              </Link>
              <Link
                href="/courses?type=practice"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/90 transition-colors shadow-xs"
              >
                <span>Practice Questions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Subjects in this category */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Subject List (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-lg font-serif font-bold text-foreground">
                Clinical Study Topics ({category.subjects.length})
              </h2>
              <span className="text-xs text-muted-foreground">
                Select a topic to open full clinical study notes
              </span>
            </div>

            <div className="space-y-5">
              {category.subjects.map((subject) => (
                <article
                  key={subject.id}
                  className="p-6 rounded-2xl bg-card/75 hover:bg-card transition-all duration-200 shadow-xs hover:shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-teal-700 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                      {subject.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {subject.readTime}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-serif font-bold text-foreground hover:text-teal-700 dark:hover:text-teal-400 transition-colors">
                      <Link href={`/study-guide/${category.slug}/${subject.slug}`}>
                        {subject.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {subject.summary}
                    </p>
                  </div>

                  {/* Clinical Key Takeaways Preview */}
                  {subject.clinicalKeyTakeaways && subject.clinicalKeyTakeaways.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                        <span>High-Yield Clinical Takeaways:</span>
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {subject.clinicalKeyTakeaways.slice(0, 2).map((takeaway, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                            <span className="text-teal-500 font-bold">•</span>
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {subject.sections.length} Clinical Sections Included
                    </span>
                    <Link
                      href={`/study-guide/${category.slug}/${subject.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary/10 hover:bg-secondary text-teal-700 dark:text-teal-400 hover:text-secondary-foreground text-xs font-semibold transition-all group"
                    >
                      <span>Read Full Notes</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Sidebar: Other Categories & NCLEX Strategy */}
          <aside className="space-y-6">
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Other Study Guide Categories
              </h3>
              <nav className="space-y-1.5">
                {otherCategories.map((other) => (
                  <Link
                    key={other.id}
                    href={`/study-guide/${other.slug}`}
                    className="flex items-center justify-between p-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span>{other.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {other.subjects.length}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50/90 to-card dark:from-teal-950/40 dark:to-card border border-teal-500/30 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">NCLEX Preparation Tip</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When studying {category.title}, always focus on recognizing cues, analyzing priority complications, and discerning what requires immediate provider notification versus independent nursing intervention.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline pt-1"
              >
                <span>Browse PrepFord Q-Bank</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
