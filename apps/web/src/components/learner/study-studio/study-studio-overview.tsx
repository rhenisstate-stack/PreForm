"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileQuestion,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchStudyOverview, StudyOverview } from "@/lib/study-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * `/dashboard/study` — Studio overview. Renders only real counts returned by
 * the backend study module; if the studio is unavailable a retry affordance
 * is shown instead of fabricated numbers.
 */

interface StudioStats {
  deckCount: number;
  cardCount: number;
  dueCount: number;
  reviewedToday: number;
}

export function StudyStudioOverview() {
  const auth = useAuth();
  const [stats, setStats] = React.useState<StudioStats | null>(null);
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "unavailable">("loading");
  const [reloadKey, setReloadKey] = React.useState<number>(0);

  const authed = Boolean(auth?.isAuthenticated && auth?.user);

  React.useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setLoadState("loading");
    fetchStudyOverview()
      .then((overview: StudyOverview) => {
        if (cancelled) return;
        setStats(overview);
        setLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [authed, reloadKey]);

  const subPages = [
    {
      href: "/dashboard/study/flashcards",
      icon: Layers,
      title: "Flashcard Decks",
      description: "Create personal decks manually or generate cards from the curated PrepFord study guide.",
    },
    {
      href: "/dashboard/study/review",
      icon: RotateCcw,
      title: "Review Session",
      description: "Work through cards that are scheduled for today with server-side spaced repetition (SM-2).",
    },
    {
      href: "/dashboard/study/quizzes",
      icon: FileQuestion,
      title: "Topic Quizzes",
      description: "Unscored quick drills across NCLEX client-need domains with immediate clinical rationales.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section
        data-testid="study-studio-overview-header"
        className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-teal-500/10 p-6 sm:p-8 shadow-xs"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI Study Studio</span>
            </span>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              Phase 1 · Active Recall
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
            Your active-recall study workspace.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
            PrepFord&apos;s Studio applies proven active-recall techniques to your {auth?.user?.pathway === "pn" ? "NCLEX-PN" : "NCLEX-RN"} preparation: personal
            flashcards with spaced-repetition scheduling computed server-side, and quick topic drills built from
            authentic clinical scenarios.
          </p>
        </div>
      </section>

      {/* Real progress summary */}
      <section data-testid="study-studio-overview-stats" className="space-y-4" aria-label="Study progress summary">
        {loadState === "loading" && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 text-sm text-muted-foreground">
            Loading your study progress…
          </div>
        )}

        {loadState === "unavailable" && (
          <div
            data-testid="study-studio-overview-unavailable"
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200 space-y-2"
          >
            <p className="font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Study progress is unavailable right now
            </p>
            <p className="text-xs leading-relaxed">
              The study service could not be reached, so no progress numbers are shown (PrepFord never
              fabricates learner metrics). You can still open your decks, or try again below.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-1 rounded-xl"
            >
              Retry
            </Button>
          </div>
        )}

        {loadState === "ready" && stats && (
          <>
            {stats.dueCount > 0 ? (
              <div
                data-testid="study-studio-due-banner"
                className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h2 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    {stats.dueCount} {stats.dueCount === 1 ? "card is" : "cards are"} scheduled for review today
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Consistent daily review is what makes spaced repetition work — a short session is enough.
                  </p>
                </div>
                <Button asChild className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl">
                  <Link href="/dashboard/study/review">
                    <span>Start review session</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div
                data-testid="study-studio-clear-banner"
                className="rounded-2xl border border-border/80 bg-card p-5"
              >
                <h2 className="font-serif font-bold text-base text-foreground">Review schedule is clear</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Nothing is due right now. Add new cards in your decks, or run a quick topic drill.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Decks", value: stats.deckCount, href: "/dashboard/study/flashcards" },
                { label: "Active cards", value: stats.cardCount, href: "/dashboard/study/flashcards" },
                { label: "Due today", value: stats.dueCount, href: "/dashboard/study/review" },
                { label: "Reviewed today", value: stats.reviewedToday, href: "/dashboard/study/review" },
              ].map((tile) => (
                <Link
                  key={tile.label}
                  href={tile.href}
                  data-testid={`study-studio-stat-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-xl border border-border/80 bg-card p-4 hover:border-teal-500/50 hover:shadow-xs transition-all"
                >
                  <p className="text-2xl font-serif font-bold text-foreground">{tile.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wide">{tile.label}</p>
                </Link>
              ))}
            </div>

            {stats.deckCount === 0 && (
              <div
                data-testid="study-studio-empty-first-deck"
                className="rounded-2xl border border-dashed border-border p-6 text-center bg-card/50 space-y-3"
              >
                <h3 className="font-serif font-bold text-foreground">Create your first flashcard deck</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Start with a curated PrepFord study-guide deck (one tap, cards generated from reviewed
                  clinical content) or a blank deck for your own notes.
                </p>
                <Button asChild className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl">
                  <Link href="/dashboard/study/flashcards">
                    <Layers className="mr-2 h-4 w-4" />
                    <span>Create a deck</span>
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Studio tools */}
      <section data-testid="study-studio-tools" className="space-y-4" aria-label="Study studio tools">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-bold text-foreground">Studio Tools</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Three focused tools — decks, review and drills — built around active recall
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subPages.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-xl border border-border/80 bg-card p-5 hover:border-teal-500/50 hover:shadow-sm transition-all flex flex-col justify-between space-y-2"
            >
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <tool.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif font-bold text-foreground">{tool.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
              </div>
              <span className="pt-3 inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400">
                Open tool
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Honest scope disclosure */}
      <section
        data-testid="study-studio-scope-note"
        className="rounded-xl border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-3"
      >
        <BookOpen className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">What the AI Study Studio is today</p>
          <p className="leading-relaxed">
            Phase 1 provides personal flashcards, server-side spaced-repetition scheduling, curated-guide
            card generation and quick drills. The conversational AI tutor, AI flashcard generation from
            learner-uploaded documents and AI-generated study plans are <span className="font-semibold text-foreground">planned for later
            phases</span> and are not part of this release.
          </p>
        </div>
      </section>
    </div>
  );
}
