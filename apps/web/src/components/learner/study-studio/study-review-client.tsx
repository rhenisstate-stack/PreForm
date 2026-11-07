"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ChevronRight,
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
import { studyService, ReviewSession, ReviewSessionSummaryReport, FlashcardDeck } from "@/lib/study-client-service";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const RATING_OPTIONS = [
  {
    rating: 0,
    label: "Again (1)",
    hint: "Recall failed · Returns tomorrow",
    icon: Frown,
    className: "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300",
  },
  {
    rating: 1,
    label: "Hard (2)",
    hint: "Recalled with difficulty · Shorter interval",
    icon: Meh,
    className: "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
  {
    rating: 2,
    label: "Good (3)",
    hint: "Recalled correctly · Standard interval stretch",
    icon: Smile,
    className: "border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300",
  },
  {
    rating: 3,
    label: "Easy (4)",
    hint: "Instant clinical recall · Accelerated growth",
    icon: Star,
    className: "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
];

export function StudyReviewClient() {
  const [programme, setProgramme] = React.useState<string>("rn");
  const [session, setSession] = React.useState<ReviewSession | null>(null);
  const [summary, setSummary] = React.useState<ReviewSessionSummaryReport | null>(null);
  const [decks, setDecks] = React.useState<FlashcardDeck[]>([]);
  const [cards, setCards] = React.useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [revealed, setRevealed] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  // Config modal state
  const [isConfigOpen, setIsConfigOpen] = React.useState<boolean>(false);
  const [selectedDeckId, setSelectedDeckId] = React.useState<string>("all");
  const [selectedMode, setSelectedMode] = React.useState<"all_due" | "deck" | "difficult" | "favourites" | "random">("all_due");
  const [cardLimit, setCardLimit] = React.useState<number>(20);

  // Load initial data
  const init = React.useCallback(async () => {
    try {
      setLoading(true);
      const [dueRes, decksRes] = await Promise.all([
        studyService.getDueCards(programme, 20),
        studyService.getDecks(),
      ]);
      setCards(dueRes.cards);
      setDecks(decksRes.decks);
    } catch (err: any) {
      toast.error(err.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  }, [programme]);

  React.useEffect(() => {
    init();
  }, [init]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfigOpen || !session || summary) return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        setRevealed((prev) => !prev);
      } else if (revealed && !submitting) {
        if (e.key === "1") handleRate(0);
        else if (e.key === "2") handleRate(1);
        else if (e.key === "3") handleRate(2);
        else if (e.key === "4") handleRate(3);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [revealed, submitting, session, summary, isConfigOpen, currentIndex, cards]);

  const handleStartSession = async () => {
    try {
      setLoading(true);
      const sessionRes = await studyService.startReviewSession({
        deckId: selectedDeckId === "all" ? undefined : selectedDeckId,
        mode: selectedMode,
        programme,
        cardLimit,
      });

      // Load session cards
      let sessionCards: any[] = [];
      if (selectedDeckId !== "all") {
        const deckCardsRes = await studyService.getDeckCards(selectedDeckId);
        sessionCards = deckCardsRes.cards;
      } else {
        const dueRes = await studyService.getDueCards(programme, cardLimit);
        sessionCards = dueRes.cards;
      }

      setSession(sessionRes.session);
      setCards(sessionCards);
      setCurrentIndex(0);
      setRevealed(false);
      setSummary(null);
      setIsConfigOpen(false);

      if (sessionCards.length === 0) {
        toast.info("No cards match your filter criteria right now.");
      } else {
        toast.success(`Started review session with ${sessionCards.length} cards.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start review session.");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!session || currentIndex >= cards.length || submitting) return;
    const currentCard = cards[currentIndex];

    try {
      setSubmitting(true);
      const updatedSession = await studyService.submitReviewSessionRating(session.id, currentCard.id, rating);
      setSession(updatedSession.session);

      if (currentIndex + 1 >= cards.length) {
        // Complete session
        const report = await studyService.getReviewSessionSummary(session.id);
        setSummary(report.report);
        toast.success("Review session completed!");
      } else {
        setCurrentIndex((prev) => prev + 1);
        setRevealed(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit recall rating.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? Math.round(((currentIndex + 1) / cards.length) * 100) : 0;

  return (
    <div data-testid="review-session-runner" className="space-y-6 max-w-4xl mx-auto">
      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-teal-600" />
            <h1 className="font-serif font-bold text-xl text-foreground">Spaced Repetition Review</h1>
            <Badge variant="outline" className="text-xs uppercase">
              SM-2 Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Server-authoritative scheduling. Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Space</kbd> to flip, keys <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">1-4</kbd> to rate recall.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Programme selector */}
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            {["rn", "pn"].map((p) => (
              <button
                key={p}
                onClick={() => setProgramme(p)}
                className={`px-3 py-1 font-medium rounded-md uppercase transition-all ${
                  programme === p ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button onClick={() => setIsConfigOpen(true)} size="sm" variant="outline" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            <span>Configure</span>
          </Button>
        </div>
      </div>

      {/* ── Active Session or Launch Screen ── */}
      {summary ? (
        /* Summary Report View */
        <div data-testid="review-summary-report" className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-foreground">Session Completed</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your recall ratings have been persisted into the server SM-2 scheduling engine.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
              <div className="text-2xl font-bold text-foreground">{summary.session.cardsReviewed}</div>
              <div className="text-xs text-muted-foreground">Reviewed</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
              <div className="text-2xl font-bold text-teal-600">{summary.session.accuracyPercentage}%</div>
              <div className="text-xs text-muted-foreground">Recall Accuracy</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
              <div className="text-2xl font-bold text-amber-600">{summary.session.cardsDifficult}</div>
              <div className="text-xs text-muted-foreground">Rated Hard</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
              <div className="text-2xl font-bold text-rose-600">{summary.session.cardsMissed}</div>
              <div className="text-xs text-muted-foreground">Rated Again</div>
            </div>
          </div>

          {/* Retention Recommendation Alert */}
          <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/10 space-y-1">
            <h4 className="font-bold text-teal-900 dark:text-teal-200 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>PrepFord Clinical Retention Recommendation</span>
            </h4>
            <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">
              {summary.retentionRecommendation}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button onClick={() => setIsConfigOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
              Start Another Review
            </Button>
            <Link href="/dashboard/study/notes">
              <Button variant="outline" className="rounded-xl">
                Open Personal Notes
              </Button>
            </Link>
          </div>
        </div>
      ) : session && currentCard ? (
        /* Active Card Review View */
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Card {currentIndex + 1} of {cards.length}</span>
              <span>{progressPercent}% Complete</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 3D Flashcard Canvas */}
          <div
            onClick={() => setRevealed(!revealed)}
            className="group relative min-h-[360px] rounded-2xl border border-border bg-card p-8 flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-md transition-all select-none"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {currentCard.cardStyle || "Q&A"}
              </Badge>
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="h-3 w-3" />
                <span>Interval: {currentCard.intervalDays || 0}d</span>
              </span>
            </div>

            {/* Front & Back Content */}
            <div className="my-auto text-center space-y-4 max-w-2xl mx-auto py-6">
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-foreground leading-snug">
                {currentCard.front}
              </h3>

              {revealed ? (
                <div className="space-y-3 pt-4 border-t border-border/60 animate-in fade-in duration-200">
                  <div className="font-serif text-lg text-teal-700 dark:text-teal-300 font-semibold">
                    {currentCard.back}
                  </div>
                  {currentCard.explanation && (
                    <p className="text-xs text-muted-foreground leading-relaxed italic max-w-lg mx-auto">
                      Why: {currentCard.explanation}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Click card or press Space to reveal answer</span>
                </p>
              )}
            </div>

            <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-4 border-t border-border/30">
              <span className="capitalize">{currentCard.difficulty || "medium"} difficulty</span>
              <span>{revealed ? "Now rate your recall below" : "Review in progress"}</span>
            </div>
          </div>

          {/* Rating Buttons */}
          {revealed ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-200">
              {RATING_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.rating}
                    disabled={submitting}
                    onClick={() => handleRate(opt.rating)}
                    className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${opt.className} disabled:opacity-50`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-bold text-xs">{opt.label}</span>
                    <span className="text-[10px] opacity-80 leading-tight">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Button
              onClick={() => setRevealed(true)}
              className="w-full py-6 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs"
            >
              <Eye className="h-4 w-4" />
              <span>Reveal Clinical Answer (Space)</span>
            </Button>
          )}
        </div>
      ) : (
        /* Empty / Idle Launch Screen */
        <div className="p-8 sm:p-12 rounded-2xl border border-border bg-card text-center space-y-4 shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
            <Layers className="h-8 w-8" />
          </div>
          <h2 className="font-serif font-bold text-2xl text-foreground">Ready for Spaced Repetition?</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {cards.length > 0
              ? `You have ${cards.length} flashcard${cards.length === 1 ? "" : "s"} due for recall today.`
              : "No cards are currently due for review. You can run a custom drill from any deck."}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => {
                if (cards.length > 0) {
                  setSession({
                    id: "local-quick-session",
                    mode: "all_due",
                    programme,
                    totalCards: cards.length,
                    cardsReviewed: 0,
                    cardsCorrect: 0,
                    cardsDifficult: 0,
                    cardsMissed: 0,
                    accuracyPercentage: 0,
                    durationSeconds: 0,
                    status: "in_progress",
                    startedAt: new Date().toISOString(),
                  });
                  setCurrentIndex(0);
                  setRevealed(false);
                } else {
                  setIsConfigOpen(true);
                }
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 px-6 py-2.5"
            >
              <Play className="h-4 w-4" />
              <span>{cards.length > 0 ? "Start Review Drill" : "Configure Custom Drill"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog: Session Configuration ── */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Review Session</DialogTitle>
            <DialogDescription>
              Select review mode and card scope for this drill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Mode selection */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Review Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "all_due", label: "All Due Today" },
                  { id: "deck", label: "Specific Deck" },
                  { id: "difficult", label: "Difficult Cards Only" },
                  { id: "favourites", label: "Favourites Only" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMode(m.id as any)}
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

            {/* Deck selection */}
            {selectedMode === "deck" && (
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Select Deck</label>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs"
                >
                  <option value="all">Select a deck...</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.cardCount} cards)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Card limit */}
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
            <Button onClick={handleStartSession} className="bg-teal-600 hover:bg-teal-700 text-white">
              Launch Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
