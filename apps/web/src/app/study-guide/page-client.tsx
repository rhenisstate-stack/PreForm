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
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Clock,
  ChevronRight,
} from "lucide-react";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";

function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case "Stethoscope":
      return <Stethoscope className="h-6 w-6 text-teal-600 dark:text-teal-400" />;
    case "Pill":
      return <Pill className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
    case "Baby":
      return <Baby className="h-6 w-6 text-rose-500 dark:text-rose-400" />;
    case "Smile":
      return <Smile className="h-6 w-6 text-amber-500 dark:text-amber-400" />;
    case "Brain":
      return <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />;
    case "HeartPulse":
      return <HeartPulse className="h-6 w-6 text-sky-600 dark:text-sky-400" />;
    case "Layers":
      return <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />;
    default:
      return <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400" />;
  }
}

export function StudyGuideIndexClient() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState<string>("all");

  const filteredCategories = React.useMemo(() => {
    return STUDY_GUIDE_CATEGORIES.map((cat) => {
      // Filter subjects within this category based on search query
      const matchingSubjects = cat.subjects.filter((s) => {
        const matchesSearch =
          searchQuery.trim() === "" ||
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.clinicalKeyTakeaways.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTag =
          selectedFilter === "all" ||
          (selectedFilter === "high-yield" && s.difficulty === "High-Yield") ||
          (selectedFilter === cat.slug);

        return matchesSearch && matchesTag;
      });

      return {
        ...cat,
        matchingSubjects,
      };
    }).filter((cat) => cat.matchingSubjects.length > 0 || (searchQuery === "" && selectedFilter === "all"));
  }, [searchQuery, selectedFilter]);

  const totalSubjects = STUDY_GUIDE_CATEGORIES.reduce((acc, cat) => acc + cat.subjects.length, 0);

  return (
    <div className="w-full bg-background min-h-screen">
      {/* Full-width Hero Banner */}
      <section className="w-full bg-gradient-to-b from-teal-50/80 via-background to-background dark:from-teal-950/25 dark:via-background dark:to-background pt-12 pb-16 px-4 sm:px-6 lg:px-8">
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
              <li className="text-foreground font-medium" aria-current="page">
                Study Guide
              </li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                <span>PrepFord Nursing Study Notes</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground tracking-tight leading-tight">
                Clinical Nursing Notes & High-Yield NCLEX Study Guide
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Condensed, evidence-based study notes organized by core nursing domains. Master pathophysiology, high-alert pharmacology, diagnostic labs, and prioritized interventions to ace the Next Generation NCLEX®.
              </p>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="p-3.5 rounded-xl bg-card/80 shadow-xs">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">7</p>
                  <p className="text-xs text-muted-foreground">Clinical Domains</p>
                </div>
                <div className="p-3.5 rounded-xl bg-card/80 shadow-xs">
                  <p className="text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-400">{totalSubjects}+</p>
                  <p className="text-xs text-muted-foreground">High-Yield Topics</p>
                </div>
                <div className="p-3.5 rounded-xl bg-card/80 shadow-xs">
                  <p className="text-xl sm:text-2xl font-bold text-foreground">100%</p>
                  <p className="text-xs text-muted-foreground">Free Study Notes</p>
                </div>
                <div className="p-3.5 rounded-xl bg-card/80 shadow-xs">
                  <p className="text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-400">NGN</p>
                  <p className="text-xs text-muted-foreground">Clinical Judgment Cues</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/illustrations/prepford-study-guide-overview.png"
                  alt="PrepFord Clinical Nursing Notes & High-Yield NCLEX Study Guide"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics (e.g. Heart Failure, Insulin, Triage)..."
              aria-label="Search study guide topics"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedFilter === "all"
                  ? "bg-secondary text-secondary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Topics
            </button>
            <button
              onClick={() => setSelectedFilter("high-yield")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedFilter === "high-yield"
                  ? "bg-secondary text-secondary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              High-Yield Only
            </button>
            {STUDY_GUIDE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedFilter(cat.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedFilter === cat.slug
                    ? "bg-secondary text-secondary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.shortTitle}
              </button>
            ))}
          </div>
        </div>

        {/* Categories & Subjects Grid */}
        <div className="py-10 space-y-12">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-16 px-4 bg-muted/20 rounded-2xl border border-dashed border-border">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No study notes found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                No clinical topics match &quot;{searchQuery}&quot;. Try searching for &quot;cardio&quot;, &quot;pharmacology&quot;, or &quot;delegation&quot;.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilter("all");
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
              >
                Reset Search
              </button>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const displaySubjects = category.matchingSubjects ?? category.subjects;

              return (
                <div key={category.id} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-card shadow-xs">
                        {getCategoryIcon(category.iconName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold font-serif text-foreground">
                            {category.title}
                          </h2>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400">
                            {category.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/study-guide/${category.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline group self-start sm:self-center"
                    >
                      <span>View category overview ({category.subjects.length} topics)</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>

                  {/* Subject Cards for this category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {displaySubjects.map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/study-guide/${category.slug}/${subject.slug}`}
                        className="group flex flex-col justify-between p-5 rounded-2xl bg-card/75 hover:bg-card transition-all duration-200 shadow-xs hover:shadow-md"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-medium text-teal-700 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                              {subject.difficulty}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {subject.readTime}
                            </span>
                          </div>

                          <h3 className="text-base font-semibold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                            {subject.title}
                          </h3>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {subject.summary}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 flex items-center justify-between text-xs font-medium text-teal-700 dark:text-teal-400">
                          <span>Read Study Notes</span>
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Banner: Practice Question CTA */}
        <div className="mt-8 p-8 rounded-3xl bg-gradient-to-r from-teal-50/90 via-teal-50/40 to-card dark:from-teal-950/40 dark:via-teal-900/20 dark:to-card border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              <GraduationCap className="h-4 w-4" />
              <span>Next Generation NCLEX Preparation</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
              Test your recall with realistic Next Gen practice items
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every study note connects directly to clinical scenario practice questions with option-by-option correct and distractor rationales.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href="/courses?type=practice"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/90 transition-colors shadow-sm text-center"
            >
              Try Practice Questions
            </Link>
            <Link
              href="/subscriptions"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors text-center"
            >
              View PrepFord Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
