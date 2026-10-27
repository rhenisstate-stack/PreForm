"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Pill,
  BookOpen,
  ArrowRight,
  Share2,
  Printer,
  Sparkles,
  Layers,
} from "lucide-react";
import type { StudyGuideCategory, StudyGuideSubject, StudyGuideSection } from "@/lib/study-guide-data";

interface Props {
  category: StudyGuideCategory;
  subject: StudyGuideSubject;
}

export function SubjectPageClient({ category, subject }: Props) {
  const currentSubjectIndex = category.subjects.findIndex((s) => s.id === subject.id);
  const prevSubject = currentSubjectIndex > 0 ? category.subjects[currentSubjectIndex - 1] : null;
  const nextSubject =
    currentSubjectIndex < category.subjects.length - 1
      ? category.subjects[currentSubjectIndex + 1]
      : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <article className="w-full bg-background min-h-screen">
      {/* Subject Header */}
      <section className="w-full bg-gradient-to-b from-teal-950/20 via-background to-background border-b border-border/60 pt-10 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-xs text-muted-foreground flex-wrap">
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
              <li>
                <Link
                  href={`/study-guide/${category.slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {category.shortTitle}
                </Link>
              </li>
              <li>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="text-foreground font-medium truncate max-w-xs" aria-current="page">
                {subject.title}
              </li>
            </ol>
          </nav>

          {/* Badges & Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/study-guide/${category.slug}`}
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
            >
              {category.title}
            </Link>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-foreground">
              {subject.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {subject.readTime}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground tracking-tight leading-tight">
            {subject.title}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {subject.summary}
          </p>

          <div className="pt-2 flex items-center justify-between border-t border-border/40 text-xs text-muted-foreground">
            <Link
              href={`/study-guide/${category.slug}`}
              className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to {category.shortTitle} Topics</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                aria-label="Print study notes"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Notes</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Clinical Key Takeaways Banner */}
        {subject.clinicalKeyTakeaways && subject.clinicalKeyTakeaways.length > 0 && (
          <div className="p-6 rounded-2xl bg-teal-500/10 border border-teal-500/30 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-base sm:text-lg font-bold font-serif text-foreground">
                High-Yield Clinical Takeaways & NCLEX Priorities
              </h2>
            </div>
            <ul className="space-y-2.5">
              {subject.clinicalKeyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Sections */}
        <div className="space-y-10">
          {subject.sections.map((section: StudyGuideSection, index: number) => (
            <div key={index} className="space-y-5 pb-8 border-b border-border/60 last:border-0">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                {section.heading}
              </h2>

              <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.body}
              </p>

              {/* Key points list */}
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="p-5 rounded-xl bg-card border border-border/60 space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Essential Nursing Action Items:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {section.keyPoints.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <span className="text-teal-500 font-bold shrink-0">•</span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clinical Alert Box */}
              {section.clinicalAlert && (
                <div
                  className={`p-5 rounded-2xl border ${
                    section.clinicalAlert.type === "critical"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                      : section.clinicalAlert.type === "pharmacology"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                    {section.clinicalAlert.type === "critical" && (
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    )}
                    {section.clinicalAlert.type === "pharmacology" && (
                      <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {section.clinicalAlert.type === "exam-tip" && (
                      <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>{section.clinicalAlert.title}</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                    {section.clinicalAlert.text}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Next / Previous Navigation */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prevSubject ? (
            <Link
              href={`/study-guide/${category.slug}/${prevSubject.slug}`}
              className="p-4 rounded-xl border border-border/60 hover:border-teal-500/40 bg-card/60 hover:bg-card transition-all text-left group"
            >
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                Previous Topic
              </span>
              <p className="text-sm font-semibold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 mt-1 line-clamp-1">
                {prevSubject.title}
              </p>
            </Link>
          ) : (
            <div />
          )}

          {nextSubject ? (
            <Link
              href={`/study-guide/${category.slug}/${nextSubject.slug}`}
              className="p-4 rounded-xl border border-border/60 hover:border-teal-500/40 bg-card/60 hover:bg-card transition-all text-right group sm:col-start-2"
            >
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-end gap-1">
                Next Topic
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
              <p className="text-sm font-semibold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 mt-1 line-clamp-1">
                {nextSubject.title}
              </p>
            </Link>
          ) : null}
        </div>

        {/* Question Bank Practice Callout */}
        <div className="p-8 rounded-3xl bg-card border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-bold text-foreground">
              Ready to test this topic on Next Gen NCLEX items?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Access clinical case studies, Bowtie questions, and complete rationale breakdowns.
            </p>
          </div>
          <Link
            href="/courses?type=practice"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium text-xs hover:bg-teal-700 transition-colors shadow-sm"
          >
            Practice Next Gen Questions
          </Link>
        </div>
      </section>
    </article>
  );
}
