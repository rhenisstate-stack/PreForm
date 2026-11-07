// Admin Study Guides & AI Governance Client Service

export interface AdminCategory {
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

export interface AdminGuideSummary {
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

export interface AdminGuideDetail extends AdminGuideSummary {
  clinicalKeyTakeaways: string[];
  contentJson: string;
}

export interface AIProviderConfig {
  id: string;
  providerName: string;
  modelId: string;
  isEnabled: boolean;
  temperature: number;
  maxOutputTokens: number;
  timeoutSeconds: number;
  dailyPerUserQuota: number;
  featureToggles: Record<string, boolean>;
  updatedAt: string;
}

export interface AIMonitoring {
  totalRequestsToday: number;
  totalTokensToday: number;
  estimatedCostTodayUsd: number;
  userRemainingDailyQuota: number;
  recentRequests: Array<{
    id: string;
    userId: string;
    feature: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    status: string;
    createdAt: string;
  }>;
}

// ════════════════════════════════════════════════
// 1. Administrative Notes Management DTOs
// ════════════════════════════════════════════════

export interface AdminStudyNote {
  id: string;
  userId: string;
  authorEmail: string;
  authorName: string;
  folderId?: string | null;
  FolderName?: string | null;
  title: string;
  contentJson: string;
  contentPlainText: string;
  programme: "rn" | "pn" | "both";
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags: string[];
  isPinned: boolean;
  isFavourite: boolean;
  isArchived: boolean;
  status: "Draft" | "PendingReview" | "Approved" | "Published" | "Archived";
  isOfficial: boolean;
  studyGuideId?: string | null;
  wordCount: number;
  characterCount: number;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNoteFilterParams {
  search?: string;
  programme?: string;
  status?: string;
  clientNeedId?: string;
  subjectDomainId?: string;
  topicSlug?: string;
  tag?: string;
  isArchived?: boolean;
  isOfficial?: boolean;
  studyGuideId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface AdminCreateNoteRequest {
  title: string;
  contentJson: string;
  contentPlainText?: string;
  programme: "rn" | "pn" | "both";
  folderId?: string | null;
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags?: string[];
  status?: string;
  isOfficial?: boolean;
  studyGuideId?: string | null;
}

export interface AdminUpdateNoteRequest {
  title: string;
  contentJson: string;
  contentPlainText?: string;
  programme: "rn" | "pn" | "both";
  folderId?: string | null;
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags?: string[];
  status?: string;
  isOfficial?: boolean;
  studyGuideId?: string | null;
}

export interface PagedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ════════════════════════════════════════════════
// 2. Administrative Flashcards Management DTOs
// ════════════════════════════════════════════════

export interface AdminFlashcardDeck {
  id: string;
  userId: string;
  authorEmail: string;
  title: string;
  description: string;
  programme: "rn" | "pn" | "both";
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags: string[];
  isOfficial: boolean;
  isPublished: boolean;
  isArchived: boolean;
  status: string;
  colorCode?: string | null;
  iconName?: string | null;
  cardCount: number;
  dueCardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFlashcard {
  id: string;
  deckId: string;
  deckTitle: string;
  front: string;
  back: string;
  explanation: string;
  imageUrl?: string | null;
  diagramUrl?: string | null;
  cardStyle: "qa" | "term-definition" | "clinical-scenario";
  difficulty: "easy" | "medium" | "hard";
  programme: "rn" | "pn" | "both";
  status: string;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags: string[];
  displayOrder: number;
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt?: string | null;
  createdAt: string;
}

export interface AdminCreateDeckRequest {
  title: string;
  description?: string;
  programme: "rn" | "pn" | "both";
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags?: string[];
  isOfficial?: boolean;
  isPublished?: boolean;
  colorCode?: string | null;
  iconName?: string | null;
}

export interface AdminUpdateDeckRequest {
  title: string;
  description?: string;
  programme: "rn" | "pn" | "both";
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  tags?: string[];
  isOfficial?: boolean;
  colorCode?: string | null;
  iconName?: string | null;
}

export interface AdminCreateCardRequest {
  front: string;
  back: string;
  explanation?: string;
  imageUrl?: string | null;
  diagramUrl?: string | null;
  cardStyle?: string;
  difficulty?: string;
  programme?: string;
  tags?: string[];
  sourceReference?: string;
}

export interface AdminUpdateCardRequest {
  front: string;
  back: string;
  explanation?: string;
  imageUrl?: string | null;
  diagramUrl?: string | null;
  cardStyle?: string;
  difficulty?: string;
  programme?: string;
  tags?: string[];
  sourceReference?: string;
}

// ════════════════════════════════════════════════
// 3. Administrative Review Sessions DTOs
// ════════════════════════════════════════════════

export interface StudyReviewConfiguration {
  id: string;
  maxCardsPerSession: number;
  defaultCardLimit: number;
  supportedModes: string[];
  enableRn: boolean;
  enablePn: boolean;
  requireSubscription: boolean;
  allowCustomDrills: boolean;
  minIntervalDays: number;
  defaultEaseFactor: number;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminReviewAnalytics {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  completionRate: number;
  totalCardsReviewed: number;
  overallAccuracyPercentage: number;
  averageDurationSeconds: number;
  subjectBreakdown: Array<{
    subject: string;
    sessionCount: number;
    accuracyPercentage: number;
  }>;
  programmeBreakdown: Array<{
    programme: string;
    sessionCount: number;
    cardsReviewed: number;
    accuracyPercentage: number;
  }>;
  frequentlyDifficultCards: Array<{
    cardId: string;
    deckTitle: string;
    front: string;
    failureCount: number;
    difficulty: string;
    programme: string;
  }>;
  schedulingStats: {
    cardsDueToday: number;
    cardsOverdue: number;
    cardsScheduledNext7Days: number;
    averageEaseFactor: number;
  };
}

export interface AdminReviewSessionRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  deckId?: string | null;
  deckName?: string | null;
  mode: string;
  programme: string;
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

export interface AdminReviewSessionDetail extends AdminReviewSessionRecord {
  items: Array<{
    id: string;
    flashcardId: string;
    front: string;
    back: string;
    rating: number;
    ratingLabel: string;
    responseTimeMs: number;
    easeFactorBefore: number;
    easeFactorAfter: number;
    intervalDaysBefore: number;
    intervalDaysAfter: number;
    reviewedAt: string;
  }>;
}

// ════════════════════════════════════════════════
// 4. Administrative Topic Quizzes DTOs
// ════════════════════════════════════════════════

export interface AdminTopicQuiz {
  id: string;
  title: string;
  description: string;
  programme: "rn" | "pn" | "both";
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  status: "Draft" | "PendingReview" | "Approved" | "Published" | "Archived";
  isPublished: boolean;
  isOfficial: boolean;
  isArchived: boolean;
  targetScore: number;
  timeLimitMinutes?: number | null;
  feedbackMode: "immediate" | "at_end";
  maxAttempts: number;
  questionIds: string[];
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCreateTopicQuizRequest {
  title: string;
  description?: string;
  programme: "rn" | "pn" | "both";
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  targetScore?: number;
  timeLimitMinutes?: number | null;
  feedbackMode?: string;
  maxAttempts?: number;
  status?: string;
  isPublished?: boolean;
  isOfficial?: boolean;
  questionIds?: string[];
}

export interface AdminUpdateTopicQuizRequest {
  title: string;
  description?: string;
  programme: "rn" | "pn" | "both";
  subjectDomainId?: string | null;
  topicSlug?: string | null;
  topicTitle?: string | null;
  clientNeedId?: string | null;
  targetScore?: number;
  timeLimitMinutes?: number | null;
  feedbackMode?: string;
  maxAttempts?: number;
  status?: string;
  isPublished?: boolean;
  isOfficial?: boolean;
  questionIds?: string[];
}

export interface AdminQuizQuestion {
  id: string;
  code: string;
  stem: string;
  questionTypeKey: string;
  pathway: string;
  difficulty: string;
  topicId?: string | null;
  topicTitle?: string | null;
  clientNeedTitle?: string | null;
  overallRationale?: string | null;
  isActive: boolean;
}

export interface AIDraftQuestion {
  stem: string;
  options: string[];
  correctOptionIndex: number;
  rationale: string;
  difficulty: string;
  questionTypeKey: string;
  isAiGenerated: boolean;
}

export interface AdminQuizAnalytics {
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageScore: number;
  averageDurationSeconds: number;
  questionPerformance: Array<{
    questionId: string;
    stem: string;
    typeKey: string;
    timesEncountered: number;
    correctCount: number;
    accuracyPercentage: number;
  }>;
  topicPerformance: Array<{
    topic: string;
    attempts: number;
    averageScore: number;
  }>;
  programmePerformance: Array<{
    programme: string;
    attempts: number;
    averageScore: number;
  }>;
  frequentlyMissedQuestions: Array<{
    questionId: string;
    stem: string;
    difficulty: string;
    totalResponses: number;
    incorrectResponses: number;
    missRatePercentage: number;
  }>;
}

async function fetchAdmin<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Admin API error: ${res.statusText}`);
  }
  return data;
}

export const adminStudyService = {
  // ── Categories ──
  getCategories: async () => {
    return fetchAdmin<{ success: boolean; count: number; categories: AdminCategory[] }>("study-guides/categories");
  },

  createCategory: async (payload: {
    slug: string;
    title: string;
    shortTitle?: string;
    description?: string;
    badge?: string;
    iconName?: string;
    colorTheme?: string;
    displayOrder?: number;
  }) => {
    return fetchAdmin<{ success: boolean; category: AdminCategory }>("study-guides/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateCategory: async (
    id: string,
    payload: {
      slug?: string;
      title?: string;
      shortTitle?: string;
      description?: string;
      badge?: string;
      iconName?: string;
      colorTheme?: string;
      displayOrder?: number;
      isActive?: boolean;
    }
  ) => {
    return fetchAdmin<{ success: boolean; category: AdminCategory }>(`study-guides/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteCategory: async (id: string) => {
    return fetchAdmin<{ success: boolean; message: string }>(`study-guides/categories/${id}`, {
      method: "DELETE",
    });
  },

  // ── Curated Guides ──
  getGuides: async (categorySlug?: string, programme?: string) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("categorySlug", categorySlug);
    if (programme) params.set("programme", programme);
    const qs = params.toString();
    return fetchAdmin<{ success: boolean; count: number; guides: AdminGuideSummary[] }>(`study-guides${qs ? `?${qs}` : ""}`);
  },

  getGuide: async (id: string) => {
    return fetchAdmin<{ success: boolean; guide: AdminGuideDetail }>(`study-guides/${id}`);
  },

  createGuide: async (payload: {
    categoryId: string;
    slug: string;
    title: string;
    summary?: string;
    readTime?: string;
    difficulty?: string;
    programme?: string;
    clientNeedId?: string;
    clinicalKeyTakeaways?: string[];
    contentJson: string;
    status?: string;
    scheduledPublishAt?: string;
  }) => {
    return fetchAdmin<{ success: boolean; guide: AdminGuideDetail }>("study-guides", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateGuide: async (
    id: string,
    payload: {
      categoryId?: string;
      slug?: string;
      title?: string;
      summary?: string;
      readTime?: string;
      difficulty?: string;
      programme?: string;
      clientNeedId?: string;
      clinicalKeyTakeaways?: string[];
      contentJson?: string;
      status?: string;
      changeSummary?: string;
    }
  ) => {
    return fetchAdmin<{ success: boolean; guide: AdminGuideDetail }>(`study-guides/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  publishGuide: async (id: string) => {
    return fetchAdmin<{ success: boolean; guide: AdminGuideDetail }>(`study-guides/${id}/publish`, {
      method: "POST",
    });
  },

  deleteGuide: async (id: string) => {
    return fetchAdmin<{ success: boolean; message: string }>(`study-guides/${id}`, {
      method: "DELETE",
    });
  },

  // ════════════════════════════════════════════════
  // 1. NOTES MANAGEMENT
  // ════════════════════════════════════════════════

  getNotes: async (params?: AdminNoteFilterParams) => {
    const qs = new URLSearchParams();
    if (params) {
      if (params.search) qs.set("search", params.search);
      if (params.programme) qs.set("programme", params.programme);
      if (params.status) qs.set("status", params.status);
      if (params.clientNeedId) qs.set("clientNeedId", params.clientNeedId);
      if (params.subjectDomainId) qs.set("subjectDomainId", params.subjectDomainId);
      if (params.topicSlug) qs.set("topicSlug", params.topicSlug);
      if (params.tag) qs.set("tag", params.tag);
      if (params.isArchived !== undefined) qs.set("isArchived", String(params.isArchived));
      if (params.isOfficial !== undefined) qs.set("isOfficial", String(params.isOfficial));
      if (params.studyGuideId) qs.set("studyGuideId", params.studyGuideId);
      if (params.page) qs.set("page", String(params.page));
      if (params.pageSize) qs.set("pageSize", String(params.pageSize));
      if (params.sortBy) qs.set("sortBy", params.sortBy);
      if (params.sortDescending !== undefined) qs.set("sortDescending", String(params.sortDescending));
    }
    const q = qs.toString();
    return fetchAdmin<PagedResponse<AdminStudyNote>>(`study-guides/notes${q ? `?${q}` : ""}`);
  },

  getNote: async (id: string) => {
    return fetchAdmin<{ success: boolean; note: AdminStudyNote }>(`study-guides/notes/${id}`);
  },

  createNote: async (payload: AdminCreateNoteRequest) => {
    return fetchAdmin<{ success: boolean; note: AdminStudyNote }>("study-guides/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateNote: async (id: string, payload: AdminUpdateNoteRequest) => {
    return fetchAdmin<{ success: boolean; note: AdminStudyNote }>(`study-guides/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteNote: async (id: string) => {
    return fetchAdmin<{ success: boolean; message: string }>(`study-guides/notes/${id}`, {
      method: "DELETE",
    });
  },

  duplicateNote: async (id: string) => {
    return fetchAdmin<{ success: boolean; note: AdminStudyNote }>(`study-guides/notes/${id}/duplicate`, {
      method: "POST",
    });
  },

  archiveNote: async (id: string, isArchived: boolean = true) => {
    return fetchAdmin<{ success: boolean; note: AdminStudyNote }>(`study-guides/notes/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ isArchived }),
    });
  },

  publishNote: async (id: string) => {
    return fetchAdmin<{ success: boolean; note: AdminStudyNote }>(`study-guides/notes/${id}/publish`, {
      method: "POST",
    });
  },

  setNoteStatus: async (id: string, status: string) => {
    return fetchAdmin<{ success: boolean; note: AdminStudyNote }>(`study-guides/notes/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  // ════════════════════════════════════════════════
  // 2. FLASHCARDS MANAGEMENT
  // ════════════════════════════════════════════════

  getDecks: async (programme?: string, search?: string, isOfficial?: boolean) => {
    const qs = new URLSearchParams();
    if (programme) qs.set("programme", programme);
    if (search) qs.set("search", search);
    if (isOfficial !== undefined) qs.set("isOfficial", String(isOfficial));
    const q = qs.toString();
    return fetchAdmin<{ success: boolean; count: number; decks: AdminFlashcardDeck[] }>(`study-guides/flashcards/decks${q ? `?${q}` : ""}`);
  },

  getDeck: async (id: string) => {
    return fetchAdmin<{ success: boolean; deck: AdminFlashcardDeck }>(`study-guides/flashcards/decks/${id}`);
  },

  createDeck: async (payload: AdminCreateDeckRequest) => {
    return fetchAdmin<{ success: boolean; deck: AdminFlashcardDeck }>("study-guides/flashcards/decks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateDeck: async (id: string, payload: AdminUpdateDeckRequest) => {
    return fetchAdmin<{ success: boolean; deck: AdminFlashcardDeck }>(`study-guides/flashcards/decks/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteDeck: async (id: string) => {
    return fetchAdmin<{ success: boolean; message: string }>(`study-guides/flashcards/decks/${id}`, {
      method: "DELETE",
    });
  },

  duplicateDeck: async (id: string) => {
    return fetchAdmin<{ success: boolean; deck: AdminFlashcardDeck }>(`study-guides/flashcards/decks/${id}/duplicate`, {
      method: "POST",
    });
  },

  publishDeck: async (id: string, isPublished: boolean = true) => {
    return fetchAdmin<{ success: boolean; deck: AdminFlashcardDeck }>(`study-guides/flashcards/decks/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ isPublished }),
    });
  },

  archiveDeck: async (id: string, isArchived: boolean = true) => {
    return fetchAdmin<{ success: boolean; deck: AdminFlashcardDeck }>(`study-guides/flashcards/decks/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ isArchived }),
    });
  },

  getDeckCards: async (deckId: string) => {
    return fetchAdmin<{ success: boolean; count: number; cards: AdminFlashcard[] }>(`study-guides/flashcards/decks/${deckId}/cards`);
  },

  createCard: async (deckId: string, payload: AdminCreateCardRequest) => {
    return fetchAdmin<{ success: boolean; card: AdminFlashcard }>(`study-guides/flashcards/decks/${deckId}/cards`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateCard: async (cardId: string, payload: AdminUpdateCardRequest) => {
    return fetchAdmin<{ success: boolean; card: AdminFlashcard }>(`study-guides/flashcards/cards/${cardId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteCard: async (cardId: string) => {
    return fetchAdmin<{ success: boolean; message: string }>(`study-guides/flashcards/cards/${cardId}`, {
      method: "DELETE",
    });
  },

  duplicateCard: async (cardId: string) => {
    return fetchAdmin<{ success: boolean; card: AdminFlashcard }>(`study-guides/flashcards/cards/${cardId}/duplicate`, {
      method: "POST",
    });
  },

  moveCard: async (cardId: string, targetDeckId: string) => {
    return fetchAdmin<{ success: boolean; card: AdminFlashcard }>(`study-guides/flashcards/cards/${cardId}/move`, {
      method: "POST",
      body: JSON.stringify({ targetDeckId }),
    });
  },

  reorderCards: async (deckId: string, cardIds: string[]) => {
    return fetchAdmin<{ success: boolean }>(`study-guides/flashcards/decks/${deckId}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ cardIds }),
    });
  },

  // ════════════════════════════════════════════════
  // 3. REVIEW SESSIONS MANAGEMENT
  // ════════════════════════════════════════════════

  getReviewConfiguration: async () => {
    return fetchAdmin<{ success: boolean; config: StudyReviewConfiguration }>("study-guides/review-sessions/config");
  },

  updateReviewConfiguration: async (payload: Partial<StudyReviewConfiguration>) => {
    return fetchAdmin<{ success: boolean; config: StudyReviewConfiguration }>("study-guides/review-sessions/config", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getReviewAnalytics: async (from?: string, to?: string, programme?: string, subject?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (programme) qs.set("programme", programme);
    if (subject) qs.set("subject", subject);
    const q = qs.toString();
    return fetchAdmin<{ success: boolean; analytics: AdminReviewAnalytics }>(`study-guides/review-sessions/analytics${q ? `?${q}` : ""}`);
  },

  getReviewSessions: async (params?: { programme?: string; status?: string; search?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params) {
      if (params.programme) qs.set("programme", params.programme);
      if (params.status) qs.set("status", params.status);
      if (params.search) qs.set("search", params.search);
      if (params.page) qs.set("page", String(params.page));
      if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    }
    const q = qs.toString();
    return fetchAdmin<PagedResponse<AdminReviewSessionRecord>>(`study-guides/review-sessions/sessions${q ? `?${q}` : ""}`);
  },

  getReviewSession: async (id: string) => {
    return fetchAdmin<{ success: boolean; session: AdminReviewSessionDetail }>(`study-guides/review-sessions/sessions/${id}`);
  },

  // ════════════════════════════════════════════════
  // 4. TOPIC QUIZZES MANAGEMENT
  // ════════════════════════════════════════════════

  getQuizzes: async (programme?: string, status?: string, search?: string) => {
    const qs = new URLSearchParams();
    if (programme) qs.set("programme", programme);
    if (status) qs.set("status", status);
    if (search) qs.set("search", search);
    const q = qs.toString();
    return fetchAdmin<{ success: boolean; count: number; quizzes: AdminTopicQuiz[] }>(`study-guides/topic-quizzes${q ? `?${q}` : ""}`);
  },

  getQuiz: async (id: string) => {
    return fetchAdmin<{ success: boolean; quiz: AdminTopicQuiz }>(`study-guides/topic-quizzes/${id}`);
  },

  createQuiz: async (payload: AdminCreateTopicQuizRequest) => {
    return fetchAdmin<{ success: boolean; quiz: AdminTopicQuiz }>("study-guides/topic-quizzes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateQuiz: async (id: string, payload: AdminUpdateTopicQuizRequest) => {
    return fetchAdmin<{ success: boolean; quiz: AdminTopicQuiz }>(`study-guides/topic-quizzes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteQuiz: async (id: string) => {
    return fetchAdmin<{ success: boolean; message: string }>(`study-guides/topic-quizzes/${id}`, {
      method: "DELETE",
    });
  },

  duplicateQuiz: async (id: string) => {
    return fetchAdmin<{ success: boolean; quiz: AdminTopicQuiz }>(`study-guides/topic-quizzes/${id}/duplicate`, {
      method: "POST",
    });
  },

  publishQuiz: async (id: string, isPublished: boolean = true) => {
    return fetchAdmin<{ success: boolean; quiz: AdminTopicQuiz }>(`study-guides/topic-quizzes/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ isPublished }),
    });
  },

  archiveQuiz: async (id: string, isArchived: boolean = true) => {
    return fetchAdmin<{ success: boolean; quiz: AdminTopicQuiz }>(`study-guides/topic-quizzes/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ isArchived }),
    });
  },

  searchQuestions: async (params: { search?: string; pathway?: string; difficulty?: string; typeKey?: string; topicId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.pathway) qs.set("pathway", params.pathway);
    if (params.difficulty) qs.set("difficulty", params.difficulty);
    if (params.typeKey) qs.set("typeKey", params.typeKey);
    if (params.topicId) qs.set("topicId", params.topicId);
    if (params.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return fetchAdmin<{ success: boolean; count: number; questions: AdminQuizQuestion[] }>(`study-guides/topic-quizzes/questions/search${q ? `?${q}` : ""}`);
  },

  assignQuestions: async (quizId: string, questionIds: string[]) => {
    return fetchAdmin<{ success: boolean; quiz: AdminTopicQuiz }>(`study-guides/topic-quizzes/${quizId}/questions`, {
      method: "PUT",
      body: JSON.stringify({ questionIds }),
    });
  },

  getQuizAnalytics: async (from?: string, to?: string, programme?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (programme) qs.set("programme", programme);
    const q = qs.toString();
    return fetchAdmin<{ success: boolean; analytics: AdminQuizAnalytics }>(`study-guides/topic-quizzes/analytics${q ? `?${q}` : ""}`);
  },

  generateDraftQuestions: async (payload: { topic: string; programme: string; questionCount: number; clientNeedId?: string; difficulty?: string }) => {
    return fetchAdmin<{ success: boolean; count: number; questions: AIDraftQuestion[] }>("study-guides/topic-quizzes/ai-generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ── AI Governance ──
  getAIConfiguration: async () => {
    return fetchAdmin<{ success: boolean; config: AIProviderConfig }>("ai/configuration");
  },

  updateAIConfiguration: async (payload: {
    providerName?: string;
    modelId?: string;
    isEnabled?: boolean;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutSeconds?: number;
    dailyPerUserQuota?: number;
    featureToggles?: Record<string, boolean>;
  }) => {
    return fetchAdmin<{ success: boolean; config: AIProviderConfig }>("ai/configuration", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getAIMonitoring: async (userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return fetchAdmin<{ success: boolean; monitoring: AIMonitoring }>(`ai/monitoring${qs}`);
  },
};
