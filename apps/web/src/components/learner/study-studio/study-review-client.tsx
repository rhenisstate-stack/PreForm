"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Clock,
  Eye,
  FileQuestion,
  Filter,
  Frown,
  Layers,
  Meh,
  Play,
  RotateCcw,
  Settings,
  Smile,
  Sparkles,
  Star,
  Zap,
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
import { studyService, FlashcardDeck } from "@/lib/study-client-service";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * `/dashboard/study/review` — spaced-repetition review session.
 *
 * Server-authoritative SM-2 scheduling:
 *  - Again (0): reset — card returns tomorrow
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
  const [sessionSummary, setSessionSummary] = React.useState<{ reviewed: number; dueRemaining: number; correct: number; difficult: number } | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Phase 2 drill customization modal state
  const [isConfigOpen, setIsConfigOpen] = React.useState<boolean>(false);
  const [decks, setDecks] = React.useState<FlashcardDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = React.useState<string>("all");
  const [selectedMode, setSelectedMode] = React.useState<string>("all_due");
  const [cardLimit, setCardLimit] = React.useState<number>(20);

  // Load due queue
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

  // Load decks for drill configuration
  React.useEffect(() => {
    studyService.getDecks().then((res) => setDecks(res.decks || [])).catch(() => {});
  }, []);

  const currentCard = queue[index] ?? null;

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfigOpen || !currentCard || submittingRating) return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        setRevealed((prev) => !prev);
      } else if (revealed) {
        if (e.key === "1") handleRating(0);
        else if (e.key === "2") handleRating(1);
        else if (e.key === "3") handleRating(2);
        else if (e.key === "4") handleRating(3);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [revealed, submittingRating, currentCard, isConfigOpen, index, queue]);

  const handleRating = async (rating: RecallRating) => {
    if (!currentCard || submittingRating) return;
    setSubmittingRating(true);
    setSubmitError(null);
    try {
      const result = await submitFlashcardReview(currentCard.id, rating);
      const isCorrect = rating >= 2;
      const isDifficult = rating === 1;

      const nextSummary = sessionSummary
        ? {
            reviewed: sessionSummary.reviewed + 1,
            dueRemaining: result.dueRemaining,
            correct: sessionSummary.correct + (isCorrect ? 1 : 0),
            difficult: sessionSummary.difficult + (isDifficult ? 1 : 0),
          }
        : {
            reviewed: 1,
            dueRemaining: result.dueRemaining,
            correct: isCorrect ? 1 : 0,
            difficult: isDifficult ? 1 : 0,
          };

      setSessionSummary(nextSummary);

      if (index + 1 >= queue.length) {
        setIndex(queue.length); // summary view
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

  const handleLaunchCustomDrill = async () => {
    try {
      setSessionState("loading");
      setIsConfigOpen(false);

      if (selectedDeckId !== "all") {
        const deckCards = await studyService.getDeckCards(selectedDeckId);
        setQueue(deckCards.cards as any[]);
      } else {
        const cards = await fetchDueFlashcards(programme, cardLimit);
        setQueue(cards);
      }
      setIndex(0);
      setRevealed(false);
      setSessionSummary(null);
      setSessionState("ready");
      toast.success("Custom drill launched.");
    } catch (err: any) {
      toast.error(err.message || "Failed to launch custom drill.");
      setSessionState("ready");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto" data-testid="review-session-runner">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Review Session</span>
            </span>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              Server-side SM-2 scheduling
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Programme separation */}
            <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setProgramme("rn")}
                className={`px-3 py-1 rounded-md uppercase font-semibold transition-all ${
                  programme === "rn"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                RN
              </button>
              <button
                type="button"
                onClick={() => setProgramme("pn")}
                className={`px-3 py-1 rounded-md uppercase font-semibold transition-all ${
                  programme === "pn"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                PN
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Configure Drill</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Loading state */}
      {sessionState === "loading" && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground animate-pulse">
          Loading spaced-repetition queue…
        </div>
      )}

      {/* Unavailable state */}
      {sessionState === "unavailable" && (
        <section className="rounded-2xl border border-border bg-card p-10 text-center space-y-4">
          <h2 className="font-serif font-bold text-xl text-foreground">Review session unavailable</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We couldn&apos;t reach the review service. Please check your connection and try again.
          </p>
          <Button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            variant="outline"
            className="rounded-xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            <span>Try again</span>
          </Button>
        </section>
      )}

      {/* Empty queue state */}
      {sessionState === "ready" && queue.length === 0 && (
        <section
          data-testid="study-review-empty"
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-4"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif font-bold text-xl text-foreground">You&apos;re completely caught up!</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No NCLEX-{programme.toUpperCase()} cards are due right now. The spaced-repetition scheduler will surface them again when it&apos;s time to reinforce your memory.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
            >
              <Play className="mr-2 h-4 w-4" />
              <span>Launch Custom Drill</span>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/dashboard/study/flashcards">
                <Layers className="mr-2 h-4 w-4" />
                <span>Manage Flashcards</span>
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Active review loop */}
      {sessionState === "ready" && currentCard && (
        <section className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Card {index + 1} of {queue.length}</span>
              <span>{Math.round(((index) / queue.length) * 100)}% complete</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300"
                style={{ width: `${((index) / queue.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard container */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs space-y-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wider">
                {currentCard.difficulty || "standard"}
              </span>
              <span className="font-mono text-[11px]">
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
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                How well did you recall this? (Press keys 1-4)
              </p>
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

          {submittingRating && <p className="text-xs text-muted-foreground">Saving your rating…</p>}
        </section>
      )}

      {/* Session summary */}
      {sessionState === "ready" && !currentCard && queue.length > 0 && (
        <section data-testid="study-review-summary" className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-6 space-y-4">
          <h2 className="font-serif font-bold text-xl text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Session complete — {sessionSummary?.reviewed ?? queue.length} {(sessionSummary?.reviewed ?? queue.length) === 1 ? "card" : "cards"} reviewed
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your ratings were saved and the scheduler updated each card&apos;s next due date server-side.
            {typeof sessionSummary?.dueRemaining === "number" && sessionSummary.dueRemaining > 0
              ? ` ${sessionSummary.dueRemaining} card${sessionSummary.dueRemaining === 1 ? " is" : "s are"} still due today`
              : " Nothing else is due right now"}
            {" "}— come back tomorrow for the next wave.
          </p>

          {/* Retention insights */}
          {sessionSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Accuracy</span>
                <span className="text-lg font-bold text-teal-600">
                  {Math.round(((sessionSummary.correct || 0) / Math.max(1, sessionSummary.reviewed)) * 100)}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Recalled</span>
                <span className="text-lg font-bold text-foreground">{sessionSummary.correct || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Difficult</span>
                <span className="text-lg font-bold text-amber-600">{sessionSummary.difficult || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Due Left</span>
                <span className="text-lg font-bold text-muted-foreground">{sessionSummary.dueRemaining || 0}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
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

      {/* Drill Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Custom Drill</DialogTitle>
            <DialogDescription>
              Launch a targeted review drill across your decks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Review Scope</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "all_due", label: "All Due Today" },
                  { id: "deck", label: "Specific Deck" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMode(m.id)}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                      selectedMode === m.id
                        ? "border-teal-600 bg-teal-500/10 text-teal-800 dark:text-teal-200"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedMode === "deck" && (
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Select Deck</label>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs"
                >
                  <option value="all">All Decks</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.cardCount} cards)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Card Limit</label>
              <div className="flex gap-2">
                {[10, 20, 30, 50].map((lim) => (
                  <button
                    key={lim}
                    onClick={() => setCardLimit(lim)}
                    className={`flex-1 py-1.5 rounded-lg border text-center font-medium ${
                      cardLimit === lim
                        ? "border-teal-600 bg-teal-500/10 text-teal-700 dark:text-teal-300"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {lim}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLaunchCustomDrill} className="bg-teal-600 hover:bg-teal-700 text-white">
              Start Drill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
