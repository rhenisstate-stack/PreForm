/**
 * PrepFord AI Study Studio (Phase 1) — browser client.
 *
 * All calls go through the same-origin BFF proxy at `/api/study/*`, which
 * enforces session authentication and re-signs requests for the verified
 * learner identity. Never hit the backend API directly from the browser.
 *
 * Envelope contract (mirrors the backend API): every payload is wrapped in
 * `{ "success": true, "<field>": ... }`, and error payloads carry an `error`
 * message string.
 */

export type StudyProgramme = "rn" | "pn";
export type RecallRating = 0 | 1 | 2 | 3; // Again | Hard | Good | Easy

export interface StudyOverview {
  deckCount: number;
  cardCount: number;
  dueCount: number;
  reviewedToday: number;
  lastReviewAt: string | null;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description: string;
  /** "rn" | "pn" | "both" */
  programme: string;
  /** "manual" | "curated_guide" */
  sourceType: string;
  sourceReference: string;
  topicSlug: string;
  topicTitle: string;
  isArchived: boolean;
  cardCount: number;
  dueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  explanation: string;
  difficulty: string;
  programme: string;
  /** "active" | "personal_unreviewed" | "archived" | "suspended" */
  status: string;
  sourceType: string;
  sourceReference: string;
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt: string | null;
  createdAt: string;
}

export interface FlashcardReviewRecord {
  id: string;
  flashcardId: string;
  recallRating: number;
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
  reviewedAt: string;
}

export interface CreateDeckInput {
  name: string;
  description?: string;
  programme?: string;
  sourceType?: "manual" | "curated_guide";
  sourceReference?: string;
  topicSlug?: string;
  topicTitle?: string;
}

export interface CreateCardInput {
  front: string;
  back: string;
  explanation?: string;
  difficulty?: "fundamental" | "medium" | "high_yield";
  programme?: string;
  sourceType?: "manual" | "curated_guide";
  sourceReference?: string;
}

export interface ReviewCardResult {
  card: Flashcard;
  dueRemaining: number;
}

export class StudyServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StudyServiceError";
    this.status = status;
  }
}

const BASE = "/api/study";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (body && typeof body.error === "string") return body.error;
  } catch {
    // non-JSON error body — fall through to a generic message
  }
  if (response.status === 401) return "Please sign in to use the Study Studio.";
  if (response.status === 503) return "Study studio is temporarily unavailable. Please try again.";
  return `Study studio request failed with status ${response.status}.`;
}

async function studyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new StudyServiceError("Study studio is temporarily unavailable. Please try again.", 503);
  }

  if (!response.ok) {
    throw new StudyServiceError(await readError(response), response.status);
  }

  return (await response.json()) as T;
}

// ── Overview ──

export async function fetchStudyOverview(): Promise<StudyOverview> {
  const envelope = await studyFetch<{ success: boolean; overview: StudyOverview }>("/overview");
  return envelope.overview;
}

// ── Decks ──

export async function fetchFlashcardDecks(): Promise<FlashcardDeck[]> {
  const envelope = await studyFetch<{ success: boolean; count: number; decks: FlashcardDeck[] }>(
    "/flashcards/decks"
  );
  return envelope.decks ?? [];
}

export async function fetchDeckCards(deckId: string): Promise<Flashcard[]> {
  const envelope = await studyFetch<{ success: boolean; count: number; cards: Flashcard[] }>(
    `/flashcards/decks/${encodeURIComponent(deckId)}/cards`
  );
  return envelope.cards ?? [];
}

export async function createFlashcardDeck(input: CreateDeckInput): Promise<FlashcardDeck> {
  const envelope = await studyFetch<{ success: boolean; deck: FlashcardDeck }>(
    "/flashcards/decks",
    { method: "POST", body: JSON.stringify(input) }
  );
  return envelope.deck;
}

export async function archiveFlashcardDeck(deckId: string): Promise<void> {
  await studyFetch<{ success: boolean; message: string }>(
    `/flashcards/decks/${encodeURIComponent(deckId)}/archive`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

// ── Cards ──

export async function addFlashcard(deckId: string, input: CreateCardInput): Promise<Flashcard> {
  const envelope = await studyFetch<{ success: boolean; card: Flashcard }>(
    `/flashcards/decks/${encodeURIComponent(deckId)}/cards`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return envelope.card;
}

export async function deleteFlashcard(cardId: string): Promise<void> {
  await studyFetch<{ success: boolean; message: string }>(
    `/flashcards/cards/${encodeURIComponent(cardId)}`,
    { method: "DELETE" }
  );
}

// ── Review loop ──

export async function fetchDueFlashcards(
  programme?: StudyProgramme,
  limit = 20
): Promise<Flashcard[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (programme) query.set("programme", programme);
  const envelope = await studyFetch<{ success: boolean; count: number; cards: Flashcard[] }>(
    `/flashcards/due?${query.toString()}`
  );
  return envelope.cards ?? [];
}

export async function submitFlashcardReview(
  cardId: string,
  rating: RecallRating
): Promise<ReviewCardResult> {
  // Review responses use `{ success, card, dueRemaining }`.
  return await studyFetch<ReviewCardResult>(
    `/flashcards/cards/${encodeURIComponent(cardId)}/review`,
    { method: "POST", body: JSON.stringify({ recallRating: rating }) }
  );
}

export async function fetchCardReviews(cardId: string): Promise<FlashcardReviewRecord[]> {
  const envelope = await studyFetch<{ success: boolean; count: number; reviews: FlashcardReviewRecord[] }>(
    `/flashcards/cards/${encodeURIComponent(cardId)}/reviews`
  );
  return envelope.reviews ?? [];
}
