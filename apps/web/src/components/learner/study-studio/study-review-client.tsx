"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Frown,
  Layers,
  Meh,
  RotateCcw,
  Smile,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchDueFlashcards,
  Flashcard,
  RecallRating,
  StudyServiceError,
  submitFlashcardReview,
} from "@/lib/study-service";

/**
 * `/dashboard/study/review` — spaced-repetition review session.
 *
 * The due queue and the schedule update are both computed by the backend
 * (SM-2 engine, `SpacedRepetitionService`); the client only collects the
 * learner's self-rating:
 *  - Again (0): full reset — card returns tomorrow
 *  - Hard (1): shortened interval
 *  - Good (2): standard SM-2 progression
 *  - Easy (3): accelerated interval
 */

const RATING_OPTIONS: Array<{
  rating: RecallRating;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = [
  {
    rating: 0,
    label: "Again",
    hint: "Full miss — review again tomorrow",
    icon: Frown,
    className: "bg-rose-600 hover:bg-rose-500 text-white",
  },
  {
    rating: 1,
    label: "Hard",
    hint: "Recalled with difficulty — shorter interval",
    icon: Meh,
    className: "bg-amber-500 hover:bg-amber-400 text-slate-950",
  },
  {
    rating: 2,
    label: "Good",
    hint: "Recalled correctly — standard interval stretch",
    icon: Smile,
    className: "bg-teal-600 hover:bg-teal-500 text-white",
  },
  {
    rating: 3,
    label: "Easy",
    hint: "Instant recall — accelerated interval",
    icon: Star,
    className: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
];

export function StudyReviewClient() {
  const [programme, setProgramme] = React.useState<"rn" | "pn">("rn");
  const [sessionState, setSessionState] = React.useState<"loading" | "ready" | "unavailable">("loading");
  const [queue, setQueue] = React.useState<Flashcard[]>([]);
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [submittingRating, setSubmittingRating] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = React.useState<{ reviewed: number; dueRemaining: number } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setSessionState("loading");
    fetchDueFlashcards(programme)
      .then((cards) => {
        if (cancelled) return;
        setQueue(cards);
        setIndex(0);
        setRevealed(false);
        setSessionSummary(null);
        setSessionState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setSessionState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [programme, reloadKey]);

  const currentCard = queue[index] ?? null;

  const handleRating = async (rating: RecallRating) => {
    if (!currentCard || submittingRating) return;
    setSubmittingRating(true);
    setSubmitError(null);
    try {
      const result = await submitFlashcardReview(currentCard.id, rating);
      const nextSummary = sessionSummary
        ? { reviewed: sessionSummary.reviewed + 1, dueRemaining: result.dueRemaining }
        : { reviewed: 1, dueRemaining: result.dueRemaining };
      setSessionSummary(nextSummary);
      if (index + 1 >= queue.length) {
        setIndex(queue.length); // end of queue → summary view
        setRevealed(false);
      } else {
        setIndex(index + 1);
        setRevealed(false);
      }
    } catch (err) {
      setSubmitError(
        err instanceof StudyServiceError
          ? err.message
          : "The review could not be saved right now. Please try again."
      );
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Review Session</span>
            </span>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              Server-side SM-2 scheduling
            </Badge>
          </div>
          {/* Programme separation */}
          <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setProgramme("rn")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                programme === "rn" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              NCLEX-RN
            </button>
            <button
              type="button"
              onClick={() => setProgramme("pn")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                programme === "pn" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              NCLEX-PN
            </button>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
          Active recall, scheduled by science.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Rate how well you recalled each card and the SM-2 scheduler decides exactly when you should
          see it again — computed on PrepFord&apos;s servers so your schedule is consistent across devices.
        </p>
      </section>

      {sessionState === "loading" && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 text-sm text-muted-foreground">Loading your review queue…</div>
      )}

      {sessionState === "unavailable" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200 space-y-2">
          <p className="font-semibold">The review queue is unavailable right now</p>
          <p className="text-xs leading-relaxed">The study service could not be reached. Please try again shortly.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} className="mt-1 rounded-xl">
            Retry
          </Button>
        </div>
      )}

      {sessionState === "ready" && queue.length === 0 && (
        <div data-testid="study-review-empty" className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50 space-y-3">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/70" aria-hidden="true" />
          <h2 className="font-serif font-bold text-foreground">
            {programme === "rn" ? "No NCLEX-RN" : "No NCLEX-PN"} cards are due right now
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your schedule is clear — future reviews will surface as cards come due. Keep decks healthy by
            adding new material, or run a quick topic drill instead.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/dashboard/study/flashcards">
                <Layers className="mr-2 h-4 w-4" />
                <span>Manage decks</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/dashboard/study/quizzes">
                <span>Take a topic quiz</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {sessionState === "ready" && currentCard && (
        <section data-testid="study-review-card" className="space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>
              Card {index + 1} of {queue.length}
            </span>
            {sessionSummary && (
              <span data-testid="study-review-session-progress">
                {sessionSummary.reviewed} reviewed this session
              </span>
            )}
          </div>

          {/* Card face */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                {currentCard.difficulty === "high_yield" ? "High yield" : currentCard.difficulty === "fundamental" ? "Fundamental" : "Medium"}
              </span>
              <span className="text-muted-foreground">
                {currentCard.programme === "pn" ? "NCLEX-PN" : "NCLEX-RN"} · rep {currentCard.repetitionCount} · ease {currentCard.easeFactor.toFixed(2)}
              </span>
            </div>

            <p className="text-base sm:text-lg font-sans font-medium text-foreground leading-relaxed">
              {currentCard.front}
            </p>

            {!revealed ? (
              <Button
                type="button"
                data-testid="study-review-reveal-btn"
                onClick={() => setRevealed(true)}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
              >
                <Eye className="mr-2 h-4 w-4" />
                <span>Reveal answer</span>
              </Button>
            ) : (
              <div data-testid="study-review-back" className="space-y-3 pt-2 border-t border-border/60">
                <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">{currentCard.back}</p>
                {currentCard.explanation && (
                  <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 p-3.5 text-xs text-teal-900 dark:text-teal-200 space-y-1">
                    <p className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Clinical explanation
                    </p>
                    <p className="leading-relaxed">{currentCard.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rating controls (only after reveal) */}
          {revealed && (
            <div data-testid="study-review-ratings" className="space-y-3">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">How well did you recall this?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.rating}
                    type="button"
                    disabled={submittingRating}
                    onClick={() => handleRating(opt.rating)}
                    title={opt.hint}
                    className={`rounded-xl p-3.5 text-left transition-all disabled:opacity-60 active:scale-[0.98] shadow-xs ${opt.className}`}
                  >
                    <opt.icon className="h-5 w-5 mb-2" />
                    <span className="block text-sm font-bold">{opt.label}</span>
                    <span className="block text-[11px] opacity-80 leading-snug mt-0.5">{opt.hint}</span>
                  </button>
                ))}
              </div>
              {submitError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {submitError}
                </div>
              )}
            </div>
          )}

          {/* End-of-load flag */}
          {submittingRating && <p className="text-xs text-muted-foreground">Saving your rating…</p>}
        </section>
      )}

      {sessionState === "ready" && !currentCard && queue.length > 0 && (
        <section data-testid="study-review-summary" className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-6 space-y-4">
          <h2 className="font-serif font-bold text-xl text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Session complete — {sessionSummary?.reviewed ?? 0} {sessionSummary?.reviewed === 1 ? "card" : "cards"} reviewed
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your ratings were saved and the scheduler updated each card&apos;s next due date server-side.
            {typeof sessionSummary?.dueRemaining === "number" && sessionSummary.dueRemaining > 0
              ? ` ${sessionSummary.dueRemaining} card${sessionSummary.dueRemaining === 1 ? " is" : "s are"} still due today`
              : " Nothing else is due right now"}
            {" "}— come back tomorrow for the next wave.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              variant="outline"
              className="rounded-xl"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Refresh queue</span>
            </Button>
            <Button asChild className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl">
              <Link href="/dashboard/study">
                <span>Back to studio overview</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
