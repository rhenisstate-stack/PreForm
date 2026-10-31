"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Archive,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addFlashcard,
  archiveFlashcardDeck,
  createFlashcardDeck,
  deleteFlashcard,
  fetchDeckCards,
  fetchFlashcardDecks,
  Flashcard,
  FlashcardDeck,
  StudyServiceError,
} from "@/lib/study-service";
import {
  buildCuratedGuideDeckBlueprint,
  listCuratedGuideSubjects,
} from "@/lib/study-guide-flashcards";

/**
 * `/dashboard/study/flashcards` — deck manager for the PrepFord AI Study
 * Studio. Learners create blank personal decks or generate decks from the
 * curated PrepFord study guide (no AI synthesis involved) and manage the
 * cards inside each deck.
 */

type DeckSource = "manual" | "curated_guide";

const CURATED_SUBJECTS = listCuratedGuideSubjects();

function formatDueAt(dueAt: string): string {
  const date = new Date(dueAt);
  const now = new Date();
  if (date.getTime() <= now.getTime()) return "Due now";
  const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return days <= 7 ? `Due in ${Math.max(days, 1)} day${days === 1 ? "" : "s"}` : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function StudyFlashcardsClient() {
  const [decks, setDecks] = React.useState<FlashcardDeck[]>([]);
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "unavailable">("loading");
  const [selectedDeckId, setSelectedDeckId] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState<number>(0);

  React.useEffect(() => {
    let cancelled = false;
    fetchFlashcardDecks()
      .then((list) => {
        if (cancelled) return;
        setDecks(list);
        setLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId) ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
            <Layers className="h-3.5 w-3.5" />
            <span>Flashcard Decks</span>
          </span>
          <Badge variant="outline" className="font-mono text-xs uppercase">
            {selectedDeck ? "Deck contents" : "Manage decks"}
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
          {selectedDeck ? selectedDeck.name : "Your personal flashcard decks"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {selectedDeck
            ? "Add your own cards, or remove cards that no longer help. Review scheduling stays on the server."
            : "Build decks your way: blank manual decks for your own notes, or decks generated from the curated PrepFord study guide — reviewed clinical content, never AI-fabricated."}
        </p>
      </section>

      {loadState === "loading" && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 text-sm text-muted-foreground">
          Loading your decks…
        </div>
      )}

      {loadState === "unavailable" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200 space-y-2">
          <p className="font-semibold">Decks are unavailable right now</p>
          <p className="text-xs leading-relaxed">
            The study service could not be reached. Please try again shortly.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} className="mt-1 rounded-xl">
            Retry
          </Button>
        </div>
      )}

      {loadState === "ready" && !selectedDeck && (
        <DeckList
          decks={decks}
          onOpenDeck={(id) => setSelectedDeckId(id)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}

      {loadState === "ready" && selectedDeck && (
        <DeckDetail deck={selectedDeck} onBack={() => setSelectedDeckId(null)} onChanged={() => setReloadKey((k) => k + 1)} />
      )}
    </div>
  );
}

// ── Deck list ──

function DeckList({
  decks,
  onOpenDeck,
  onChanged,
}: {
  decks: FlashcardDeck[];
  onOpenDeck: (deckId: string) => void;
  onChanged: () => void;
}) {
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const sorted = [...decks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <section data-testid="study-flashcards-deck-list" className="space-y-4" aria-label="Decks">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-foreground">Decks</h2>
          <p className="text-xs text-muted-foreground">
            {decks.length === 0
              ? "No decks yet"
              : `${decks.length} active ${decks.length === 1 ? "deck" : "decks"} · RN and PN material stay separated`}
          </p>
        </div>
        <Button
          type="button"
          data-testid="study-flashcards-create-deck-btn"
          onClick={() => setCreateModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Create a deck</span>
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50 space-y-3">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="font-serif font-bold text-foreground">No flashcard decks yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Create your first deck — generate one from a curated PrepFord study-guide subject in one
            step, or start blank and add your own cards.
          </p>
          <Button type="button" onClick={() => setCreateModalOpen(true)} className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            <span>Create your first deck</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((deck) => (
            <button
              key={deck.id}
              type="button"
              data-testid={`study-deck-card-${deck.id}`}
              onClick={() => onOpenDeck(deck.id)}
              className="text-left rounded-xl border border-border/80 bg-card p-5 hover:border-teal-500/50 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] uppercase ${
                      deck.programme === "pn"
                        ? "text-sky-700 dark:text-sky-300 border-sky-500/30"
                        : "text-teal-700 dark:text-teal-300 border-teal-500/30"
                    }`}
                  >
                    {deck.programme === "pn" ? "NCLEX-PN" : "NCLEX-RN"}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    {deck.sourceType === "curated_guide" ? (
                      <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400">
                        <BookOpen className="h-3 w-3" /> Curated guide
                      </span>
                    ) : (
                      "Manual"
                    )}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-sm text-foreground leading-snug line-clamp-2">{deck.name}</h3>
                {deck.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{deck.description}</p>
                )}
              </div>
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
                </span>
                <span className={`font-mono font-semibold ${deck.dueCount > 0 ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`}>
                  {deck.dueCount > 0 ? `${deck.dueCount} due now` : "Nothing due"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {createModalOpen && (
        <CreateDeckModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={() => {
            setCreateModalOpen(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

// ── Create deck modal ──

function CreateDeckModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [source, setSource] = React.useState<DeckSource>("curated_guide");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [programme, setProgramme] = React.useState<"rn" | "pn">("rn");
  const [subjectSlug, setSubjectSlug] = React.useState<string>(CURATED_SUBJECTS[0]?.subjectSlug ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [progress, setProgress] = React.useState<{ created: number; total: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedSubject = CURATED_SUBJECTS.find((s) => s.subjectSlug === subjectSlug)?.subject ?? null;
  const blueprint = selectedSubject && source === "curated_guide"
    ? buildCuratedGuideDeckBlueprint(selectedSubject)
    : null;

  const submit = async () => {
    if (submitting) return;
    const deckName = source === "curated_guide" ? (blueprint?.name ?? "").trim() : name.trim();
    if (!deckName) {
      setError("Please give the deck a name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (source === "curated_guide" && blueprint) {
        const deck = await createFlashcardDeck({
          name: blueprint.name,
          description: `Active-recall cards generated from the ${blueprint.topicTitle} subject of the curated PrepFord study guide.`,
          programme,
          sourceType: "curated_guide",
          sourceReference: blueprint.sourceReference,
          topicSlug: blueprint.topicSlug,
          topicTitle: blueprint.topicTitle,
        });
        setProgress({ created: 0, total: blueprint.cards.length });
        let created = 0;
        for (const card of blueprint.cards) {
          await addFlashcard(deck.id, {
            front: card.front,
            back: card.back,
            sourceType: "curated_guide",
            sourceReference: blueprint.sourceReference,
            programme,
          });
          created += 1;
          setProgress({ created, total: blueprint.cards.length });
        }
        onCreated();
      } else {
        await createFlashcardDeck({
          name: name.trim(),
          description: description.trim(),
          programme,
          sourceType: "manual",
        });
        onCreated();
      }
    } catch (err) {
      setError(
        err instanceof StudyServiceError
          ? err.message
          : "The deck could not be created right now. Please try again."
      );
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div data-testid="study-flashcards-create-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-foreground">Create New Flashcard Deck</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deck source determines how cards enter the deck. Review scheduling is computed server-side.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Deck Source</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSource("curated_guide")}
              className={`p-4 rounded-xl border text-left transition-all ${
                source === "curated_guide"
                  ? "border-teal-500 bg-teal-500/10 shadow-2xs"
                  : "border-border hover:border-border/80 text-muted-foreground"
              }`}
            >
              <p className="font-bold text-sm text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Curated guide deck
              </p>
              <p className="text-xs mt-1.5 leading-snug text-muted-foreground">
                Generate recall cards directly from a reviewed PrepFord study-guide subject. Cards start
                as personal unreviewed material.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSource("manual")}
              className={`p-4 rounded-xl border text-left transition-all ${
                source === "manual"
                  ? "border-teal-500 bg-teal-500/10 shadow-2xs"
                  : "border-border hover:border-border/80 text-muted-foreground"
              }`}
            >
              <p className="font-bold text-sm text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Blank manual deck
              </p>
              <p className="text-xs mt-1.5 leading-snug text-muted-foreground">
                An empty personal deck you fill with your own questions and answers.
              </p>
            </button>
          </div>
        </div>

        {/* Curated-subject picker */}
        {source === "curated_guide" && (
          <div className="space-y-2">
            <label htmlFor="study-curated-subject" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Study Guide Subject
            </label>
            <select
              id="study-curated-subject"
              data-testid="study-flashcards-subject-select"
              value={subjectSlug}
              onChange={(e) => setSubjectSlug(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CURATED_SUBJECTS.map((opt) => (
                <option key={opt.subjectSlug} value={opt.subjectSlug}>
                  {opt.categoryTitle} — {opt.subjectTitle}
                </option>
              ))}
            </select>
            {blueprint && (
              <p className="text-xs text-teal-700 dark:text-teal-300 flex items-center gap-1.5 pt-1">
                <Sparkles className="h-3.5 w-3.5" />
                Will create “{blueprint.name}” with {blueprint.cards.length} active-recall cards.
              </p>
            )}
          </div>
        )}

        {/* Manual fields */}
        {source === "manual" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="study-deck-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Deck Name
              </label>
              <input
                id="study-deck-name"
                data-testid="study-flashcards-deck-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={160}
                placeholder="e.g. My fluid & electrolyte weak spots"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="study-deck-description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Description (optional)
              </label>
              <input
                id="study-deck-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={512}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Programme */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Programme Focus</label>
          <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium w-fit">
            {(["rn", "pn"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProgramme(p)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  programme === p ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "rn" ? "NCLEX-RN" : "NCLEX-PN"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {progress && (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-800 dark:text-teal-200">
            Generating curated deck… {progress.created} of {progress.total} cards added.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="rounded-xl">
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="study-flashcards-create-submit"
            onClick={submit}
            disabled={submitting}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
          >
            {submitting ? "Creating…" : source === "curated_guide" ? "Generate deck from guide" : "Create deck"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Deck detail ──

function DeckDetail({
  deck,
  onBack,
  onChanged,
}: {
  deck: FlashcardDeck;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [cards, setCards] = React.useState<Flashcard[]>([]);
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "unavailable">("loading");
  const [front, setFront] = React.useState("");
  const [back, setBack] = React.useState("");
  const [explanation, setExplanation] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"fundamental" | "medium" | "high_yield">("medium");
  const [addError, setAddError] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);

  const reloadCards = React.useCallback(async () => {
    setLoadState("loading");
    try {
      setCards(await fetchDeckCards(deck.id));
      setLoadState("ready");
    } catch {
      setLoadState("unavailable");
    }
  }, [deck.id]);

  React.useEffect(() => {
    void reloadCards();
  }, [reloadCards]);

  const submitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    if (!front.trim() || !back.trim()) {
      setAddError("Both the front and the back of the card are required.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await addFlashcard(deck.id, {
        front: front.trim(),
        back: back.trim(),
        explanation: explanation.trim() || undefined,
        difficulty,
        sourceType: "manual",
      });
      setFront("");
      setBack("");
      setExplanation("");
      await reloadCards();
      onChanged();
    } catch (err) {
      setAddError(
        err instanceof StudyServiceError ? err.message : "The card could not be added right now."
      );
    } finally {
      setAdding(false);
    }
  };

  const confirmDeleteCard = async (card: Flashcard) => {
    if (!window.confirm(`Delete the card “${card.front.slice(0, 60)}…”? This cannot be undone.`)) return;
    try {
      await deleteFlashcard(card.id);
      await reloadCards();
      onChanged();
    } catch {
      // leave list unchanged on failure; user can retry
    }
  };

  const confirmArchiveDeck = async () => {
    if (!window.confirm(`Archive deck “${deck.name}”? Archived decks are hidden from your active decks.`)) return;
    try {
      await archiveFlashcardDeck(deck.id);
      onChanged();
      onBack();
    } catch {
      // ignore; user can retry
    }
  };

  return (
    <section data-testid="study-flashcards-deck-detail" className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>All decks</span>
      </button>

      {/* Deck summary */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`font-mono text-[10px] uppercase ${
                deck.programme === "pn" ? "text-sky-700 dark:text-sky-300 border-sky-500/30" : "text-teal-700 dark:text-teal-300 border-teal-500/30"
              }`}
            >
              {deck.programme === "pn" ? "NCLEX-PN" : "NCLEX-RN"}
            </Badge>
            {deck.sourceType === "curated_guide" && (
              <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-mono text-[10px] uppercase">
                <BookOpen className="h-3 w-3 mr-1 inline" />
                Curated guide · {deck.sourceReference}
              </Badge>
            )}
          </div>
          <h2 className="font-serif font-bold text-xl text-foreground">{deck.name}</h2>
          <p className="text-xs text-muted-foreground">
            {cards.length} {cards.length === 1 ? "card" : "cards"} ·{" "}
            {cards.filter((c) => c.status === "personal_unreviewed").length} awaiting first review
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={confirmArchiveDeck}
          className="rounded-xl text-xs"
        >
          <Archive className="mr-2 h-4 w-4" />
          <span>Archive deck</span>
        </Button>
      </div>

      {/* Add-card form */}
      <form onSubmit={submitCard} data-testid="study-flashcards-add-card-form" className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
        <h3 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          Add a new card
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="study-card-front" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Front (prompt)
            </label>
            <textarea
              id="study-card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              maxLength={512}
              placeholder="Ask the question you want to recall."
              className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="study-card-back" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Back (answer)
            </label>
            <textarea
              id="study-card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              maxLength={1024}
              placeholder="The recall target."
              className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="study-card-explanation" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Explanation (optional)
            </label>
            <input
              id="study-card-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              maxLength={1024}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="study-card-difficulty" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Yield Level
            </label>
            <select
              id="study-card-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="fundamental">Fundamental</option>
              <option value="medium">Medium</option>
              <option value="high_yield">High yield</option>
            </select>
          </div>
        </div>
        {addError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            {addError}
          </div>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            data-testid="study-flashcards-add-card-submit"
            disabled={adding}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
          >
            {adding ? "Adding…" : "Add card to deck"}
          </Button>
        </div>
      </form>

      {/* Card list */}
      <div data-testid="study-flashcards-card-list" className="space-y-3">
        {loadState === "loading" && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 text-sm text-muted-foreground">Loading cards…</div>
        )}
        {loadState === "unavailable" && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200">
            Card list could not be loaded. Please retry later.
          </div>
        )}
        {loadState === "ready" && cards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50 space-y-2">
            <h3 className="font-serif font-bold text-foreground">This deck has no cards yet</h3>
            <p className="text-xs text-muted-foreground">
              {deck.sourceType === "curated_guide"
                ? "Your curated-guide cards will appear here automatically as they finish generating."
                : "Add your first card with the form above."}
            </p>
          </div>
        )}
        {loadState === "ready" &&
          cards.map((card) => (
            <div
              key={card.id}
              data-testid="study-flashcards-card-row"
              className="rounded-xl border border-border/80 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  {card.status === "personal_unreviewed" ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">Not yet reviewed</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Scheduled
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    Rep {card.repetitionCount} · ease {card.easeFactor.toFixed(2)} · interval {card.intervalDays}d
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">{card.front}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{card.back}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-mono text-muted-foreground">{formatDueAt(card.dueAt)}</span>
                <button
                  type="button"
                  onClick={() => confirmDeleteCard(card)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  aria-label="Delete card"
                  title="Delete card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Archive className="h-3 w-3" />
        Archiving hides a deck from your active list without deleting your review history.
      </p>
    </section>
  );
}
