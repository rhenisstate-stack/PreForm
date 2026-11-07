// Study Guide Management Client Service (communicates with /api/study/* BFF)

export interface NoteItem {
  id: string;
  folderId?: string | null;
  folderName?: string | null;
  title: string;
  contentJson: string;
  contentPlainText: string;
  programme: string;
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags: string[];
  isPinned: boolean;
  isFavourite: boolean;
  isArchived: boolean;
  wordCount: number;
  characterCount: number;
  lastEditedAt: string;
  createdAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  programme: string;
  color?: string | null;
  icon?: string | null;
  displayOrder: number;
  noteCount: number;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string | null;
  programme: string;
  sourceType: string;
  sourceReference?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags: string[];
  cardCount: number;
  dueCount: number;
  isArchived: boolean;
  isFavourite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardItem {
  id: string;
  deckId: string;
  front: string;
  back: string;
  explanation?: string | null;
  difficulty: string;
  cardStyle: string;
  imageUrl?: string | null;
  diagramUrl?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags: string[];
  isFavourite: boolean;
  isDifficult: boolean;
  displayOrder: number;
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
  nextDueAt: string;
  lastReviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSession {
  id: string;
  deckId?: string | null;
  deckName?: string | null;
  mode: string;
  programme: string;
  topicSlug?: string | null;
  topicTitle?: string | null;
  totalCards: number;
  cardsReviewed: number;
  cardsCorrect: number;
  cardsDifficult: number;
  cardsMissed: number;
  accuracyPercentage: number;
  durationSeconds: number;
  status: string;
  startedAt: string;
  completedAt?: string | null;
}

export interface ReviewSessionSummaryReport {
  session: ReviewSession;
  dueCardsRemaining: FlashcardItem[];
  retentionRecommendation: string;
  ratingDistribution: Record<string, number>;
}

export interface TopicQuizOption {
  index: number;
  text: string;
  mediaUrl?: string | null;
}

export interface TopicQuizQuestion {
  id: string;
  stem: string;
  questionTypeKey: string;
  difficulty: string;
  clientNeedId?: string | null;
  clinicalScenario?: string | null;
  options: TopicQuizOption[];
  correctAnswerIndices?: number[] | null;
  rationale?: string | null;
}

export interface TopicQuizResponse {
  questionId: string;
  selectedOptionIndices: number[];
  isCorrect: boolean;
  timeSpentSeconds: number;
  flaggedForReview: boolean;
  correctAnswerIndices?: number[] | null;
  rationale?: string | null;
}

export interface TopicQuizAttempt {
  id: string;
  title: string;
  programme: string;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercentage: number;
  timeSpentSeconds: number;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  questions: TopicQuizQuestion[];
  responses: TopicQuizResponse[];
}

export interface TopicQuizResults {
  attempt: TopicQuizAttempt;
  performanceByClientNeed: Record<string, number>;
  recommendedStudyTopics: string[];
  missedQuestions: TopicQuizQuestion[];
}

export interface CuratedCategory {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  badge: string;
  iconName: string;
  colorTheme: string;
  displayOrder: number;
  isActive: boolean;
  guideCount: number;
}

export interface CuratedGuideSummary {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryTitle: string;
  slug: string;
  title: string;
  summary: string;
  readTime: string;
  difficulty: string;
  programme: string;
  clientNeedId?: string | null;
  status: string;
  publishedAt?: string | null;
  updatedAt: string;
}

export interface CuratedGuideDetail extends CuratedGuideSummary {
  clinicalKeyTakeaways: string[];
  contentJson: string;
}

async function fetchStudy<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/study/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Study API error: ${res.statusText}`);
  }
  return data;
}

export const studyService = {
  // ── Overview ──
  getOverview: async () => {
    return fetchStudy<{ success: boolean; overview: any }>("overview");
  },

  // ── Notes ──
  getNotes: async (filters: {
    folderId?: string;
    programme?: string;
    subjectDomainId?: string;
    topicSlug?: string;
    clientNeedId?: string;
    isPinned?: boolean;
    isFavourite?: boolean;
    isArchived?: boolean;
    search?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.folderId) params.set("folderId", filters.folderId);
    if (filters.programme) params.set("programme", filters.programme);
    if (filters.subjectDomainId) params.set("subjectDomainId", filters.subjectDomainId);
    if (filters.topicSlug) params.set("topicSlug", filters.topicSlug);
    if (filters.clientNeedId) params.set("clientNeedId", filters.clientNeedId);
    if (filters.isPinned !== undefined) params.set("isPinned", String(filters.isPinned));
    if (filters.isFavourite !== undefined) params.set("isFavourite", String(filters.isFavourite));
    if (filters.isArchived !== undefined) params.set("isArchived", String(filters.isArchived));
    if (filters.search) params.set("search", filters.search);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

    const qs = params.toString();
    return fetchStudy<{ success: boolean; result: { items: NoteItem[]; totalCount: number; page: number; pageSize: number; totalPages: number } }>(
      `notes${qs ? `?${qs}` : ""}`
    );
  },

  getNote: async (noteId: string) => {
    return fetchStudy<{ success: boolean; note: NoteItem }>(`notes/${noteId}`);
  },

  createNote: async (payload: {
    folderId?: string | null;
    title: string;
    contentJson: string;
    contentPlainText?: string;
    programme?: string;
    subjectDomainId?: string | null;
    topicSlug?: string | null;
    topicTitle?: string | null;
    clientNeedId?: string | null;
    tags?: string[];
  }) => {
    return fetchStudy<{ success: boolean; note: NoteItem }>("notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateNote: async (
    noteId: string,
    payload: {
      folderId?: string | null;
      title?: string;
      contentJson?: string;
      contentPlainText?: string;
      programme?: string;
      subjectDomainId?: string | null;
      topicSlug?: string | null;
      topicTitle?: string | null;
      clientNeedId?: string | null;
      tags?: string[];
      isPinned?: boolean;
      isFavourite?: boolean;
      isArchived?: boolean;
      changeSummary?: string;
    }
  ) => {
    return fetchStudy<{ success: boolean; note: NoteItem }>(`notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteNote: async (noteId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`notes/${noteId}`, {
      method: "DELETE",
    });
  },

  restoreNote: async (noteId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`notes/${noteId}/restore`, {
      method: "POST",
    });
  },

  duplicateNote: async (noteId: string) => {
    return fetchStudy<{ success: boolean; note: NoteItem }>(`notes/${noteId}/duplicate`, {
      method: "POST",
    });
  },

  togglePinNote: async (noteId: string) => {
    return fetchStudy<{ success: boolean; note: NoteItem }>(`notes/${noteId}/toggle-pin`, {
      method: "POST",
    });
  },

  toggleFavouriteNote: async (noteId: string) => {
    return fetchStudy<{ success: boolean; note: NoteItem }>(`notes/${noteId}/toggle-favourite`, {
      method: "POST",
    });
  },

  archiveNote: async (noteId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`notes/${noteId}/archive`, {
      method: "POST",
    });
  },

  getNoteVersions: async (noteId: string) => {
    return fetchStudy<{ success: boolean; versions: any[] }>(`notes/${noteId}/versions`);
  },

  // ── Folders ──
  getFolders: async (programme?: string) => {
    const qs = programme ? `?programme=${encodeURIComponent(programme)}` : "";
    return fetchStudy<{ success: boolean; count: number; folders: NoteFolder[] }>(`folders${qs}`);
  },

  createFolder: async (payload: { name: string; programme?: string; color?: string; icon?: string; displayOrder?: number }) => {
    return fetchStudy<{ success: boolean; folder: NoteFolder }>("folders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateFolder: async (folderId: string, payload: { name?: string; color?: string; icon?: string; displayOrder?: number }) => {
    return fetchStudy<{ success: boolean; folder: NoteFolder }>(`folders/${folderId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteFolder: async (folderId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`folders/${folderId}`, {
      method: "DELETE",
    });
  },

  // ── Flashcards & Decks ──
  getDecks: async (includeArchived: boolean = false) => {
    const qs = includeArchived ? "?includeArchived=true" : "";
    return fetchStudy<{ success: boolean; count: number; decks: FlashcardDeck[] }>(`flashcards/decks${qs}`);
  },

  getDeck: async (deckId: string) => {
    return fetchStudy<{ success: boolean; deck: FlashcardDeck }>(`flashcards/decks/${deckId}`);
  },

  createDeck: async (payload: {
    name: string;
    description?: string;
    programme?: string;
    topicSlug?: string;
    topicTitle?: string;
    clientNeedId?: string;
    tags?: string[];
  }) => {
    return fetchStudy<{ success: boolean; deck: FlashcardDeck }>("flashcards/decks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateDeck: async (
    deckId: string,
    payload: {
      name?: string;
      description?: string;
      programme?: string;
      topicSlug?: string;
      topicTitle?: string;
      clientNeedId?: string;
      tags?: string[];
      isFavourite?: boolean;
    }
  ) => {
    return fetchStudy<{ success: boolean; deck: FlashcardDeck }>(`flashcards/decks/${deckId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  duplicateDeck: async (deckId: string) => {
    return fetchStudy<{ success: boolean; deck: FlashcardDeck }>(`flashcards/decks/${deckId}/duplicate`, {
      method: "POST",
    });
  },

  archiveDeck: async (deckId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`flashcards/decks/${deckId}/archive`, {
      method: "POST",
    });
  },

  deleteDeck: async (deckId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`flashcards/decks/${deckId}`, {
      method: "DELETE",
    });
  },

  getDeckCards: async (deckId: string) => {
    return fetchStudy<{ success: boolean; count: number; cards: FlashcardItem[] }>(`flashcards/decks/${deckId}/cards`);
  },

  getDueCards: async (programme?: string, limit: number = 20) => {
    const params = new URLSearchParams();
    if (programme) params.set("programme", programme);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return fetchStudy<{ success: boolean; count: number; cards: FlashcardItem[] }>(`flashcards/due${qs ? `?${qs}` : ""}`);
  },

  createCard: async (
    deckId: string,
    payload: {
      front: string;
      back: string;
      explanation?: string;
      difficulty?: string;
      cardStyle?: string;
      imageUrl?: string;
      diagramUrl?: string;
      topicSlug?: string;
      topicTitle?: string;
      clientNeedId?: string;
      tags?: string[];
    }
  ) => {
    return fetchStudy<{ success: boolean; card: FlashcardItem }>(`flashcards/decks/${deckId}/cards`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getCard: async (cardId: string) => {
    return fetchStudy<{ success: boolean; card: FlashcardItem }>(`flashcards/cards/${cardId}`);
  },

  updateCard: async (
    cardId: string,
    payload: {
      front?: string;
      back?: string;
      explanation?: string;
      difficulty?: string;
      cardStyle?: string;
      imageUrl?: string;
      diagramUrl?: string;
      topicSlug?: string;
      topicTitle?: string;
      clientNeedId?: string;
      tags?: string[];
      isFavourite?: boolean;
      isDifficult?: boolean;
    }
  ) => {
    return fetchStudy<{ success: boolean; card: FlashcardItem }>(`flashcards/cards/${cardId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  duplicateCard: async (cardId: string) => {
    return fetchStudy<{ success: boolean; card: FlashcardItem }>(`flashcards/cards/${cardId}/duplicate`, {
      method: "POST",
    });
  },

  moveCard: async (cardId: string, targetDeckId: string) => {
    return fetchStudy<{ success: boolean; card: FlashcardItem }>(`flashcards/cards/${cardId}/move`, {
      method: "POST",
      body: JSON.stringify({ targetDeckId }),
    });
  },

  toggleFavouriteCard: async (cardId: string) => {
    return fetchStudy<{ success: boolean; card: FlashcardItem }>(`flashcards/cards/${cardId}/toggle-favourite`, {
      method: "POST",
    });
  },

  toggleDifficultCard: async (cardId: string) => {
    return fetchStudy<{ success: boolean; card: FlashcardItem }>(`flashcards/cards/${cardId}/toggle-difficult`, {
      method: "POST",
    });
  },

  deleteCard: async (cardId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`flashcards/cards/${cardId}`, {
      method: "DELETE",
    });
  },

  reorderCards: async (deckId: string, cardIdsInOrder: string[]) => {
    return fetchStudy<{ success: boolean; count: number; cards: FlashcardItem[] }>(`flashcards/decks/${deckId}/reorder`, {
      method: "POST",
      body: JSON.stringify({ cardIdsInOrder }),
    });
  },

  reviewCard: async (cardId: string, recallRating: number) => {
    return fetchStudy<{
      success: boolean;
      flashcardId: string;
      rating: string;
      intervalDays: number;
      easeFactor: number;
      repetitionCount: number;
      nextDueAt: string;
      reviewedAt: string;
    }>(`flashcards/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ recallRating }),
    });
  },

  // ── Review Sessions ──
  startReviewSession: async (payload: {
    deckId?: string;
    mode: "all_due" | "deck" | "topic" | "difficult" | "favourites" | "random";
    programme?: string;
    topicSlug?: string;
    topicTitle?: string;
    cardLimit?: number;
  }) => {
    return fetchStudy<{ success: boolean; session: ReviewSession }>("reviews/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getReviewSession: async (sessionId: string) => {
    return fetchStudy<{ success: boolean; session: ReviewSession }>(`reviews/sessions/${sessionId}`);
  },

  submitReviewSessionRating: async (sessionId: string, flashcardId: string, recallRating: number, responseTimeMs: number = 0) => {
    return fetchStudy<{ success: boolean; session: ReviewSession }>(`reviews/sessions/${sessionId}/rating`, {
      method: "POST",
      body: JSON.stringify({ flashcardId, recallRating, responseTimeMs }),
    });
  },

  completeReviewSession: async (sessionId: string) => {
    return fetchStudy<{ success: boolean; session: ReviewSession }>(`reviews/sessions/${sessionId}/complete`, {
      method: "POST",
    });
  },

  getReviewSessionSummary: async (sessionId: string) => {
    return fetchStudy<{ success: boolean; report: ReviewSessionSummaryReport }>(`reviews/sessions/${sessionId}/summary`);
  },

  getUserReviewSessions: async (programme?: string, limit: number = 20) => {
    const params = new URLSearchParams();
    if (programme) params.set("programme", programme);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return fetchStudy<{ success: boolean; count: number; sessions: ReviewSession[] }>(`reviews/sessions${qs ? `?${qs}` : ""}`);
  },

  // ── Topic Quizzes ──
  getQuizConfigurations: async (programme?: string) => {
    const qs = programme ? `?programme=${encodeURIComponent(programme)}` : "";
    return fetchStudy<{ success: boolean; count: number; configs: any[] }>(`topic-quizzes/configurations${qs}`);
  },

  createQuizConfiguration: async (payload: {
    title: string;
    programme?: string;
    subjectDomainId?: string;
    topicSlug?: string;
    topicTitle?: string;
    clientNeedId?: string;
    questionCount?: number;
    difficulty?: string;
    timeLimitMinutes?: number;
    immediateFeedback?: boolean;
  }) => {
    return fetchStudy<{ success: boolean; config: any }>("topic-quizzes/configurations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteQuizConfiguration: async (configId: string) => {
    return fetchStudy<{ success: boolean; message: string }>(`topic-quizzes/configurations/${configId}`, {
      method: "DELETE",
    });
  },

  startQuizAttempt: async (payload: {
    configurationId?: string;
    title?: string;
    programme?: string;
    subjectDomainId?: string;
    topicSlug?: string;
    topicTitle?: string;
    clientNeedId?: string;
    questionCount?: number;
    difficulty?: string;
    timeLimitMinutes?: number;
    immediateFeedback?: boolean;
  }) => {
    return fetchStudy<{ success: boolean; attempt: TopicQuizAttempt }>("topic-quizzes/attempts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getQuizAttempt: async (attemptId: string) => {
    return fetchStudy<{ success: boolean; attempt: TopicQuizAttempt }>(`topic-quizzes/attempts/${attemptId}`);
  },

  submitQuizResponse: async (
    attemptId: string,
    questionId: string,
    selectedOptionIndices: number[],
    timeSpentSeconds: number = 0,
    flaggedForReview: boolean = false
  ) => {
    return fetchStudy<{ success: boolean; response: TopicQuizResponse }>(`topic-quizzes/attempts/${attemptId}/response`, {
      method: "POST",
      body: JSON.stringify({ questionId, selectedOptionIndices, timeSpentSeconds, flaggedForReview }),
    });
  },

  completeQuizAttempt: async (attemptId: string) => {
    return fetchStudy<{ success: boolean; results: TopicQuizResults }>(`topic-quizzes/attempts/${attemptId}/complete`, {
      method: "POST",
    });
  },

  getQuizAttemptResults: async (attemptId: string) => {
    return fetchStudy<{ success: boolean; results: TopicQuizResults }>(`topic-quizzes/attempts/${attemptId}/results`);
  },

  getUserQuizAttempts: async (programme?: string, limit: number = 20) => {
    const params = new URLSearchParams();
    if (programme) params.set("programme", programme);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return fetchStudy<{ success: boolean; count: number; attempts: any[] }>(`topic-quizzes/attempts${qs ? `?${qs}` : ""}`);
  },

  // ── Curated Study Guides ──
  getGuideCategories: async () => {
    return fetchStudy<{ success: boolean; count: number; categories: CuratedCategory[] }>("guides/categories");
  },

  getGuideCategory: async (categorySlug: string) => {
    return fetchStudy<{ success: boolean; category: CuratedCategory }>(`guides/categories/${categorySlug}`);
  },

  getGuides: async (categorySlug?: string, programme?: string) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("categorySlug", categorySlug);
    if (programme) params.set("programme", programme);
    const qs = params.toString();
    return fetchStudy<{ success: boolean; count: number; guides: CuratedGuideSummary[] }>(`guides${qs ? `?${qs}` : ""}`);
  },

  getGuideBySlug: async (categorySlug: string, guideSlug: string) => {
    return fetchStudy<{ success: boolean; guide: CuratedGuideDetail }>(`guides/${categorySlug}/${guideSlug}`);
  },

  getGuideById: async (id: string) => {
    return fetchStudy<{ success: boolean; guide: CuratedGuideDetail }>(`guides/${id}`);
  },
};
