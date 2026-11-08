"use client";

import * as React from "react";
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  Edit3,
  ArrowUpDown,
  MoveRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  BookOpen,
  HelpCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminStudyService,
  AdminFlashcardDeck,
  AdminFlashcard,
} from "@/lib/admin-study-service";
import { notify as toast } from "@/lib/notifications";

export function AdminFlashcardsClient() {
  const [decks, setDecks] = React.useState<AdminFlashcardDeck[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [search, setSearch] = React.useState<string>("");
  const [programmeFilter, setProgrammeFilter] = React.useState<string>("all");

  // Deck Modal State
  const [isDeckModalOpen, setIsDeckModalOpen] = React.useState<boolean>(false);
  const [editingDeckId, setEditingDeckId] = React.useState<string | null>(null);
  const [deckTitle, setDeckTitle] = React.useState<string>("");
  const [deckDescription, setDeckDescription] = React.useState<string>("");
  const [deckProgramme, setDeckProgramme] = React.useState<"rn" | "pn" | "both">("rn");
  const [deckTopicTitle, setDeckTopicTitle] = React.useState<string>("");
  const [deckTags, setDeckTags] = React.useState<string>("");
  const [deckIsOfficial, setDeckIsOfficial] = React.useState<boolean>(true);
  const [deckIsPublished, setDeckIsPublished] = React.useState<boolean>(false);
  const [isSavingDeck, setIsSavingDeck] = React.useState<boolean>(false);

  // Card Manager State (Deck selected)
  const [selectedDeck, setSelectedDeck] = React.useState<AdminFlashcardDeck | null>(null);
  const [deckCards, setDeckCards] = React.useState<AdminFlashcard[]>([]);
  const [loadingCards, setLoadingCards] = React.useState<boolean>(false);

  // Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = React.useState<boolean>(false);
  const [editingCardId, setEditingCardId] = React.useState<string | null>(null);
  const [cardFront, setCardFront] = React.useState<string>("");
  const [cardBack, setCardBack] = React.useState<string>("");
  const [cardExplanation, setCardExplanation] = React.useState<string>("");
  const [cardStyle, setCardStyle] = React.useState<string>("qa");
  const [cardDifficulty, setCardDifficulty] = React.useState<string>("medium");
  const [cardProgramme, setCardProgramme] = React.useState<string>("rn");
  const [cardTags, setCardTags] = React.useState<string>("");
  const [cardSourceRef, setCardSourceRef] = React.useState<string>("");
  const [isSavingCard, setIsSavingCard] = React.useState<boolean>(false);

  // Move Card Dialog State
  const [movingCardId, setMovingCardId] = React.useState<string | null>(null);
  const [targetDeckId, setTargetDeckId] = React.useState<string>("");
  const [isMovingCard, setIsMovingCard] = React.useState<boolean>(false);

  // Deletion States
  const [deleteDeckId, setDeleteDeckId] = React.useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = React.useState<string | null>(null);

  const fetchDecks = React.useCallback(async () => {
    try {
      setLoading(true);
      const prog = programmeFilter === "all" ? undefined : programmeFilter;
      const res = await adminStudyService.getDecks(prog, search.trim() || undefined);
      setDecks(res.decks);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load flashcard decks");
    } finally {
      setLoading(false);
    }
  }, [programmeFilter, search]);

  React.useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const fetchCardsForDeck = async (deckId: string) => {
    try {
      setLoadingCards(true);
      const res = await adminStudyService.getDeckCards(deckId);
      setDeckCards(res.cards);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load deck cards");
    } finally {
      setLoadingCards(false);
    }
  };

  const handleOpenDeckManager = (deck: AdminFlashcardDeck) => {
    setSelectedDeck(deck);
    fetchCardsForDeck(deck.id);
  };

  const handleOpenDeckModal = (deck?: AdminFlashcardDeck) => {
    if (deck) {
      setEditingDeckId(deck.id);
      setDeckTitle(deck.title);
      setDeckDescription(deck.description || "");
      setDeckProgramme(deck.programme);
      setDeckTopicTitle(deck.topicTitle || "");
      setDeckTags(deck.tags.join(", "));
      setDeckIsOfficial(deck.isOfficial);
      setDeckIsPublished(deck.isPublished);
    } else {
      setEditingDeckId(null);
      setDeckTitle("");
      setDeckDescription("");
      setDeckProgramme("rn");
      setDeckTopicTitle("");
      setDeckTags("");
      setDeckIsOfficial(true);
      setDeckIsPublished(false);
    }
    setIsDeckModalOpen(true);
  };

  const handleSaveDeck = async () => {
    if (!deckTitle.trim()) {
      toast.error("Please enter a deck title.");
      return;
    }

    try {
      setIsSavingDeck(true);
      const tagsArray = deckTags.split(",").map((t) => t.trim()).filter(Boolean);

      if (editingDeckId) {
        await adminStudyService.updateDeck(editingDeckId, {
          title: deckTitle.trim(),
          description: deckDescription.trim(),
          programme: deckProgramme,
          topicTitle: deckTopicTitle.trim() || null,
          tags: tagsArray,
          isOfficial: deckIsOfficial,
        });
        toast.success("Deck updated successfully");
      } else {
        await adminStudyService.createDeck({
          title: deckTitle.trim(),
          description: deckDescription.trim(),
          programme: deckProgramme,
          topicTitle: deckTopicTitle.trim() || null,
          tags: tagsArray,
          isOfficial: deckIsOfficial,
          isPublished: deckIsPublished,
        });
        toast.success("Deck created successfully");
      }

      setIsDeckModalOpen(false);
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save deck");
    } finally {
      setIsSavingDeck(false);
    }
  };

  const handleDuplicateDeck = async (id: string) => {
    try {
      await adminStudyService.duplicateDeck(id);
      toast.success("Deck duplicated successfully");
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate deck");
    }
  };

  const handlePublishDeckToggle = async (deck: AdminFlashcardDeck) => {
    try {
      await adminStudyService.publishDeck(deck.id, !deck.isPublished);
      toast.success(deck.isPublished ? "Deck unpublished" : "Deck published to learners");
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle deck publication");
    }
  };

  const handleDeleteDeckConfirm = async () => {
    if (!deleteDeckId) return;
    try {
      await adminStudyService.deleteDeck(deleteDeckId);
      toast.success("Deck deleted successfully");
      setDeleteDeckId(null);
      if (selectedDeck?.id === deleteDeckId) {
        setSelectedDeck(null);
      }
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete deck");
    }
  };

  // Card Actions
  const handleOpenCardModal = (card?: AdminFlashcard) => {
    if (card) {
      setEditingCardId(card.id);
      setCardFront(card.front);
      setCardBack(card.back);
      setCardExplanation(card.explanation || "");
      setCardStyle(card.cardStyle);
      setCardDifficulty(card.difficulty);
      setCardProgramme(card.programme);
      setCardTags(card.tags.join(", "));
    } else {
      setEditingCardId(null);
      setCardFront("");
      setCardBack("");
      setCardExplanation("");
      setCardStyle("qa");
      setCardDifficulty("medium");
      setCardProgramme(selectedDeck?.programme || "rn");
      setCardTags("");
    }
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async () => {
    if (!cardFront.trim() || !cardBack.trim()) {
      toast.error("Both card front and back are required.");
      return;
    }
    if (!selectedDeck) return;

    try {
      setIsSavingCard(true);
      const tagsArray = cardTags.split(",").map((t) => t.trim()).filter(Boolean);

      if (editingCardId) {
        await adminStudyService.updateCard(editingCardId, {
          front: cardFront.trim(),
          back: cardBack.trim(),
          explanation: cardExplanation.trim(),
          cardStyle,
          difficulty: cardDifficulty,
          programme: cardProgramme,
          tags: tagsArray,
          sourceReference: cardSourceRef.trim(),
        });
        toast.success("Card updated successfully");
      } else {
        await adminStudyService.createCard(selectedDeck.id, {
          front: cardFront.trim(),
          back: cardBack.trim(),
          explanation: cardExplanation.trim(),
          cardStyle,
          difficulty: cardDifficulty,
          programme: cardProgramme,
          tags: tagsArray,
          sourceReference: cardSourceRef.trim(),
        });
        toast.success("Card added to deck");
      }

      setIsCardModalOpen(false);
      fetchCardsForDeck(selectedDeck.id);
      fetchDecks(); // refresh count
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDuplicateCard = async (cardId: string) => {
    try {
      await adminStudyService.duplicateCard(cardId);
      toast.success("Card duplicated");
      if (selectedDeck) fetchCardsForDeck(selectedDeck.id);
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate card");
    }
  };

  const handleDeleteCardConfirm = async () => {
    if (!deleteCardId) return;
    try {
      await adminStudyService.deleteCard(deleteCardId);
      toast.success("Card deleted");
      setDeleteCardId(null);
      if (selectedDeck) fetchCardsForDeck(selectedDeck.id);
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete card");
    }
  };

  const handleMoveCard = async () => {
    if (!movingCardId || !targetDeckId) {
      toast.error("Please select a target deck.");
      return;
    }
    try {
      setIsMovingCard(true);
      await adminStudyService.moveCard(movingCardId, targetDeckId);
      toast.success("Card moved to target deck");
      setMovingCardId(null);
      setTargetDeckId("");
      if (selectedDeck) fetchCardsForDeck(selectedDeck.id);
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to move card");
    } finally {
      setIsMovingCard(false);
    }
  };

  const handleReorder = async (cardIndex: number, direction: "up" | "down") => {
    if (!selectedDeck) return;
    const newCards = [...deckCards];
    const targetIndex = direction === "up" ? cardIndex - 1 : cardIndex + 1;
    if (targetIndex < 0 || targetIndex >= newCards.length) return;

    const temp = newCards[cardIndex];
    newCards[cardIndex] = newCards[targetIndex];
    newCards[targetIndex] = temp;

    setDeckCards(newCards);

    try {
      await adminStudyService.reorderCards(
        selectedDeck.id,
        newCards.map((c) => c.id)
      );
      toast.success("Card order saved");
    } catch {
      toast.error("Failed to persist card order");
      fetchCardsForDeck(selectedDeck.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Flashcard Decks Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Author clinical flashcard decks, configure card styles, reorder cards, and manage SM-2 spacing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpenDeckModal()} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Deck
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search decks by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div>
          <select
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          >
            <option value="all">All Programmes (RN & PN)</option>
            <option value="rn">NCLEX-RN</option>
            <option value="pn">NCLEX-PN</option>
            <option value="both">Both (RN & PN)</option>
          </select>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading flashcard decks...
            </div>
          </div>
        ) : decks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card">
            No flashcard decks match the selected criteria.
          </div>
        ) : (
          decks.map((deck) => (
            <div
              key={deck.id}
              className={`rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                selectedDeck?.id === deck.id ? "ring-2 ring-primary border-primary" : ""
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-foreground text-base leading-snug">
                    {deck.title}
                  </div>
                  <Badge variant="outline" className="text-xs uppercase font-mono shrink-0">
                    {deck.programme}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                  {deck.description || "No description provided."}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                  <span className="font-semibold text-primary">{deck.cardCount} cards</span>
                  <span>•</span>
                  {deck.isPublished ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                  )}
                  {deck.isOfficial && (
                    <Badge variant="outline" className="border-primary/40 text-primary text-xs">
                      Official
                    </Badge>
                  )}
                </div>
              </div>

              {/* Deck Actions */}
              <div className="mt-5 pt-4 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDeckManager(deck)}
                  className="text-xs gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Manage Cards ({deck.cardCount})
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDeckModal(deck)}
                    title="Edit Deck"
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateDeck(deck.id)}
                    title="Duplicate Deck"
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePublishDeckToggle(deck)}
                    title={deck.isPublished ? "Unpublish Deck" : "Publish Deck"}
                    className={`h-8 w-8 p-0 ${
                      deck.isPublished ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDeckId(deck.id)}
                    title="Delete Deck"
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Deck Card Manager Drawer / Section */}
      {selectedDeck && (
        <div className="rounded-lg border bg-card p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Cards in &ldquo;{selectedDeck.title}&rdquo;
                </h2>
                <Badge variant="outline" className="text-xs uppercase">
                  {selectedDeck.programme}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reorder cards with up/down controls, edit clinical rationale, and move between decks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDeck(null)}
                className="text-xs"
              >
                Close Deck View
              </Button>
              <Button
                onClick={() => handleOpenCardModal()}
                size="sm"
                className="flex items-center gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Card
              </Button>
            </div>
          </div>

          {/* Cards Table */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs uppercase font-medium text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-12 text-center">#</th>
                  <th className="px-4 py-2">Front (Question / Stem)</th>
                  <th className="px-4 py-2">Back (Answer / Explanation)</th>
                  <th className="px-3 py-2">Style</th>
                  <th className="px-3 py-2">Difficulty</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingCards ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading cards...
                    </td>
                  </tr>
                ) : deckCards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No cards in this deck yet. Click &ldquo;Add Card&rdquo; above to author cards.
                    </td>
                  </tr>
                ) : (
                  deckCards.map((card, idx) => (
                    <tr key={card.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground font-mono">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleReorder(idx, "up")}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <span>{idx + 1}</span>
                          <button
                            disabled={idx === deckCards.length - 1}
                            onClick={() => handleReorder(idx, "down")}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs sm:max-w-sm">
                        <div className="font-medium text-foreground line-clamp-2 text-xs">
                          {card.front}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs sm:max-w-sm">
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {card.back}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-xs capitalize font-mono">
                          {card.cardStyle}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="secondary"
                          className={`text-xs capitalize ${
                            card.difficulty === "hard"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : card.difficulty === "easy"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : ""
                          }`}
                        >
                          {card.difficulty}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCardModal(card)}
                            title="Edit Card"
                            className="h-7 w-7 p-0"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateCard(card.id)}
                            title="Duplicate Card"
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMovingCardId(card.id);
                              setTargetDeckId("");
                            }}
                            title="Move Card to Deck"
                            className="h-7 w-7 p-0 text-blue-600"
                          >
                            <MoveRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteCardId(card.id)}
                            title="Delete Card"
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Deck Dialog */}
      <Dialog open={isDeckModalOpen} onOpenChange={setIsDeckModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDeckId ? "Edit Flashcard Deck" : "Create Flashcard Deck"}
            </DialogTitle>
            <DialogDescription>
              Configure deck title, clinical program, and publication status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-foreground block mb-1">Deck Title *</label>
              <Input
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                placeholder="e.g. Pharmacology: Cardiac Glycosides & Antihypertensives"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Description</label>
              <textarea
                value={deckDescription}
                onChange={(e) => setDeckDescription(e.target.value)}
                placeholder="Brief summary of what this deck reinforces..."
                className="w-full h-20 rounded-md border border-input bg-background p-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Programme *</label>
                <select
                  value={deckProgramme}
                  onChange={(e) => setDeckProgramme(e.target.value as "rn" | "pn" | "both")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                  <option value="both">Both (RN & PN)</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Topic</label>
                <Input
                  value={deckTopicTitle}
                  onChange={(e) => setDeckTopicTitle(e.target.value)}
                  placeholder="e.g. Pharmacology"
                />
              </div>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Tags (comma-separated)</label>
              <Input
                value={deckTags}
                onChange={(e) => setDeckTags(e.target.value)}
                placeholder="Cardiac, High Yield, Digoxin"
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={deckIsOfficial}
                  onChange={(e) => setDeckIsOfficial(e.target.checked)}
                  className="rounded border-input"
                />
                Official PrepFord Deck
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={deckIsPublished}
                  onChange={(e) => setDeckIsPublished(e.target.checked)}
                  className="rounded border-input"
                />
                Published to Learners
              </label>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeckModalOpen(false)}
              disabled={isSavingDeck}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveDeck} disabled={isSavingDeck}>
              {isSavingDeck ? "Saving..." : "Save Deck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Card Dialog */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCardId ? "Edit Flashcard" : "Add Flashcard"}</DialogTitle>
            <DialogDescription>
              Author high-yield flashcard content with clinical explanation and style.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-foreground block mb-1">Front (Prompt / Question) *</label>
              <textarea
                value={cardFront}
                onChange={(e) => setCardFront(e.target.value)}
                placeholder="e.g. What is the therapeutic serum digoxin range, and what pulse rate requires withholding?"
                className="w-full h-20 rounded-md border border-input bg-background p-2 text-sm"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Back (Answer / Key Fact) *</label>
              <textarea
                value={cardBack}
                onChange={(e) => setCardBack(e.target.value)}
                placeholder="e.g. Therapeutic range: 0.8 - 2.0 ng/mL. Hold medication if apical pulse is < 60 bpm in adults."
                className="w-full h-20 rounded-md border border-input bg-background p-2 text-sm"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Clinical Explanation / Rationale</label>
              <textarea
                value={cardExplanation}
                onChange={(e) => setCardExplanation(e.target.value)}
                placeholder="Detailed rationale explaining toxicity signs (halos, nausea) and potassium monitoring..."
                className="w-full h-16 rounded-md border border-input bg-background p-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Style</label>
                <select
                  value={cardStyle}
                  onChange={(e) => setCardStyle(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                >
                  <option value="qa">Q&A</option>
                  <option value="term-definition">Term & Definition</option>
                  <option value="clinical-scenario">Clinical Scenario</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Difficulty</label>
                <select
                  value={cardDifficulty}
                  onChange={(e) => setCardDifficulty(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">Programme</label>
                <select
                  value={cardProgramme}
                  onChange={(e) => setCardProgramme(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Tags (comma-separated)</label>
              <Input
                value={cardTags}
                onChange={(e) => setCardTags(e.target.value)}
                placeholder="Digoxin, Potassium, Apical Pulse"
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCardModalOpen(false)}
              disabled={isSavingCard}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveCard} disabled={isSavingCard}>
              {isSavingCard ? "Saving..." : "Save Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Card Dialog */}
      <Dialog open={!!movingCardId} onOpenChange={(open) => !open && setMovingCardId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Flashcard</DialogTitle>
            <DialogDescription>
              Select the destination flashcard deck to transfer this card to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <label className="font-medium text-foreground block mb-2 text-xs">Destination Deck</label>
            <select
              value={targetDeckId}
              onChange={(e) => setTargetDeckId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">Select destination deck...</option>
              {decks
                .filter((d) => d.id !== selectedDeck?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.programme.toUpperCase()})
                  </option>
                ))}
            </select>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMovingCardId(null)}
              disabled={isMovingCard}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleMoveCard} disabled={isMovingCard || !targetDeckId}>
              {isMovingCard ? "Moving..." : "Move Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Deck Dialog */}
      <Dialog open={!!deleteDeckId} onOpenChange={(open) => !open && setDeleteDeckId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Deck & Cards?</DialogTitle>
            <DialogDescription>
              This will permanently delete this deck and all of its associated flashcards from PostgreSQL.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteDeckId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteDeckConfirm}>
              Delete Deck
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Dialog */}
      <Dialog open={!!deleteCardId} onOpenChange={(open) => !open && setDeleteCardId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Flashcard?</DialogTitle>
            <DialogDescription>
              This will remove this flashcard from the deck permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteCardId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteCardConfirm}>
              Delete Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
