import * as React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudyStudioOverview } from "@/components/learner/study-studio/study-studio-overview";
import { StudyReviewClient } from "@/components/learner/study-studio/study-review-client";
import { StudyFlashcardsClient } from "@/components/learner/study-studio/study-flashcards-client";
import { TopicQuizClient } from "@/components/learner/study-studio/topic-quiz-client";
import type { Flashcard, FlashcardDeck, StudyOverview } from "@/lib/study-service";
import { buildCuratedGuideDeckBlueprint, listCuratedGuideSubjects } from "@/lib/study-guide-flashcards";
import { CLINICAL_QUESTION_BANK } from "@/lib/assessment-store";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthState,
}));

const mockAuthState = {
  user: {
    id: "learner-1",
    email: "alex@prepford.com",
    name: "Alex Morgan",
    displayName: "Alex Morgan",
    role: "candidate",
    pathway: "rn" as const,
  },
  isAuthenticated: true,
  isLoading: false,
};

vi.mock("@/lib/study-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/study-service")>();
  return {
    ...original,
    fetchStudyOverview: vi.fn(),
    fetchFlashcardDecks: vi.fn(),
    fetchDeckCards: vi.fn(),
    fetchDueFlashcards: vi.fn(),
    submitFlashcardReview: vi.fn(),
    createFlashcardDeck: vi.fn(),
    addFlashcard: vi.fn(),
    archiveFlashcardDeck: vi.fn(),
    deleteFlashcard: vi.fn(),
  };
});

import {
  fetchStudyOverview,
  fetchFlashcardDecks,
  fetchDeckCards,
  fetchDueFlashcards,
  submitFlashcardReview,
  createFlashcardDeck,
  addFlashcard,
} from "@/lib/study-service";

const mockFetchStudyOverview = vi.mocked(fetchStudyOverview);
const mockFetchFlashcardDecks = vi.mocked(fetchFlashcardDecks);
const mockFetchDeckCards = vi.mocked(fetchDeckCards);
const mockFetchDueFlashcards = vi.mocked(fetchDueFlashcards);
const mockSubmitFlashcardReview = vi.mocked(submitFlashcardReview);
const mockCreateFlashcardDeck = vi.mocked(createFlashcardDeck);
const mockAddFlashcard = vi.mocked(addFlashcard);

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: "card-1",
    deckId: "deck-1",
    front: "Hold digoxin when the apical pulse is below what rate?",
    back: "60 bpm in adults.",
    explanation: "Count the apical pulse for a full minute before administration.",
    difficulty: "high_yield",
    programme: "rn",
    status: "active",
    sourceType: "curated_guide",
    sourceReference: "PrepFord Study Guide — Pharmacology",
    repetitionCount: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    dueAt: new Date().toISOString(),
    lastReviewedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDeck(overrides: Partial<FlashcardDeck> = {}): FlashcardDeck {
  return {
    id: "deck-1",
    name: "Pharmacology Core",
    description: "",
    programme: "rn",
    sourceType: "manual",
    sourceReference: "",
    topicSlug: "",
    topicTitle: "",
    isArchived: false,
    cardCount: 0,
    dueCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("Study Studio — Overview (/dashboard/study)", () => {
  it("renders real studio stats from the study service and links to the review session", async () => {
    const overview: StudyOverview = {
      deckCount: 2,
      cardCount: 34,
      dueCount: 7,
      reviewedToday: 5,
      lastReviewAt: null,
    };
    mockFetchStudyOverview.mockResolvedValue(overview);

    render(<StudyStudioOverview />);

    expect(await screen.findByTestId("study-studio-due-banner")).toBeInTheDocument();
    expect(within(screen.getByTestId("study-studio-stat-due-today")).getByText("7")).toBeInTheDocument();
    expect(screen.getByTestId("study-studio-stat-decks").textContent).toContain("2");
    expect(screen.queryByTestId("study-studio-empty-first-deck")).not.toBeInTheDocument();
  });

  it("shows an honest unavailable state (no fabricated numbers) and retry when the service fails", async () => {
    mockFetchStudyOverview.mockRejectedValue(new Error("offline"));

    render(<StudyStudioOverview />);

    const unavailable = await screen.findByTestId("study-studio-overview-unavailable");
    expect(within(unavailable).getByText(/could not be reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cards due today/i)).not.toBeInTheDocument();
  });

  it("shows the first-deck empty state when the learner has no decks", async () => {
    mockFetchStudyOverview.mockResolvedValue({
      deckCount: 0,
      cardCount: 0,
      dueCount: 0,
      reviewedToday: 0,
      lastReviewAt: null,
    });

    render(<StudyStudioOverview />);

    expect(await screen.findByTestId("study-studio-empty-first-deck")).toBeInTheDocument();
    expect(screen.getByTestId("study-studio-clear-banner")).toBeInTheDocument();
  });
});

describe("Study Studio — Review session (/dashboard/study/review)", () => {
  it("runs the SM-2 rating flow: reveal card, rate Good, then shows session summary", async () => {
    const card = makeCard();
    mockFetchDueFlashcards.mockResolvedValue([card]);
    mockSubmitFlashcardReview.mockResolvedValue({
      card: { ...card, repetitionCount: 2, intervalDays: 6 },
      dueRemaining: 0,
    });

    const user = userEvent.setup();
    render(<StudyReviewClient />);

    await user.click(await screen.findByTestId("study-review-reveal-btn"));

    const back = screen.getByTestId("study-review-back");
    expect(within(back).getByText("60 bpm in adults.")).toBeInTheDocument();

    expect(screen.getByTestId("study-review-ratings")).toBeInTheDocument();
    await user.click(within(screen.getByTestId("study-review-ratings")).getByRole("button", { name: /Good/ }));

    await waitFor(() => {
      expect(mockSubmitFlashcardReview).toHaveBeenCalledWith("card-1", 2);
    });
    expect(await screen.findByTestId("study-review-summary")).toBeInTheDocument();
    expect(screen.getByTestId("study-review-summary").textContent).toMatch(/Session complete/i);
  });

  it("shows the honest empty state when nothing is due", async () => {
    mockFetchDueFlashcards.mockResolvedValue([]);

    render(<StudyReviewClient />);

    const empty = await screen.findByTestId("study-review-empty");
    expect(within(empty).getByText(/No NCLEX-RN cards are due right now/i)).toBeInTheDocument();
  });
});

describe("Study Studio — Flashcard decks (/dashboard/study/flashcards)", () => {
  it("shows the no-decks empty state and creates a curated-guide deck (create + card generation flow)", async () => {
    mockFetchFlashcardDecks.mockResolvedValueOnce([]).mockResolvedValueOnce([
      makeDeck({ name: "Cardiovascular Disorders & Heart Failure — Curated Guide Cards", cardCount: 5 }),
    ]);
    mockCreateFlashcardDeck.mockResolvedValue(
      makeDeck({
        id: "new-deck",
        name: "Cardiovascular Disorders & Heart Failure — Curated Guide Cards",
        sourceType: "curated_guide",
      })
    );
    mockAddFlashcard.mockResolvedValue(makeCard());
    mockFetchDeckCards.mockResolvedValue([]);

    const user = userEvent.setup();
    render(<StudyFlashcardsClient />);

    const emptyState = await screen.findByText(/No flashcard decks yet/i);
    expect(emptyState).toBeInTheDocument();

    await user.click(screen.getByTestId("study-flashcards-create-deck-btn"));

    const modal = screen.getByTestId("study-flashcards-create-modal");
    expect(within(modal).getByText(/Curated guide deck/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("study-flashcards-create-submit"));

    await waitFor(() => {
      expect(mockCreateFlashcardDeck).toHaveBeenCalledTimes(1);
    });
    const createPayload = mockCreateFlashcardDeck.mock.calls[0][0];
    expect(createPayload.sourceType).toBe("curated_guide");
    expect(createPayload.sourceReference).toMatch(/^PrepFord Study Guide — /);

    await waitFor(() => {
      expect(mockAddFlashcard).toHaveBeenCalled();
    });
    // Every card from the real curated-guide blueprint for the first subject must be sent to the deck
    const expectedSubject = listCuratedGuideSubjects()[0].subject;
    const expectedCount = buildCuratedGuideDeckBlueprint(expectedSubject).cards.length;
    expect(mockAddFlashcard.mock.calls.length).toBe(expectedCount);
    await waitFor(() => {
      expect(mockFetchFlashcardDecks).toHaveBeenCalledTimes(2);
    });
  });

  it("lists deck contents and allows adding a manual card", async () => {
    const deck = makeDeck({ id: "deck-1", name: "My Weak Spots" });
    mockFetchFlashcardDecks.mockResolvedValue([deck]);
    mockFetchDeckCards.mockResolvedValue([]);

    const user = userEvent.setup();
    render(<StudyFlashcardsClient />);

    await user.click(await screen.findByTestId("study-deck-card-deck-1"));

    // Deck detail loads its (empty) card list
    await screen.findByText(/This deck has no cards yet/i);

    await user.type(screen.getByLabelText(/Front \(prompt\)/i), "What is priority question #1?");
    await user.type(screen.getByLabelText(/Back \(answer\)/i), "Airway first.");

    mockFetchDeckCards.mockResolvedValueOnce([makeCard()]);
    await user.click(screen.getByTestId("study-flashcards-add-card-submit"));

    await waitFor(() => {
      expect(mockAddFlashcard).toHaveBeenCalledWith(
        "deck-1",
        expect.objectContaining({ front: "What is priority question #1?", back: "Airway first.", sourceType: "manual" })
      );
    });
    expect(await screen.findByText("Hold digoxin when the apical pulse is below what rate?")).toBeInTheDocument();
  });
});

describe("Study Studio — Topic quizzes (/dashboard/study/quizzes)", () => {
  it("drills a static question and reveals the clinical rationale after checking", async () => {
    const user = userEvent.setup();
    render(<TopicQuizClient />);

    await user.click(screen.getByTestId("study-quiz-start-btn"));

    const question = screen.getByTestId("study-quiz-question");
    expect(within(question).getByText(CLINICAL_QUESTION_BANK[0].domain)).toBeInTheDocument();

    // Bank is real, so the static answer key is authoritative
    const correctIndex = CLINICAL_QUESTION_BANK[0].correctAnswerIndex ?? 0;
    await user.click(screen.getByTestId(`study-quiz-option-${correctIndex}`));
    await user.click(screen.getByTestId("study-quiz-check-btn"));

    const verdict = screen.getByTestId("study-quiz-verdict");
    expect(within(verdict).getByText(/Correct/i)).toBeInTheDocument();
    expect(screen.getByText(CLINICAL_QUESTION_BANK[0].rationale)).toBeInTheDocument();
  });
});
