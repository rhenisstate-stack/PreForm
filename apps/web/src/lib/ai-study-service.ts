// AI Study Studio Client Service (communicates with /api/ai/* BFF)

export interface AIStatus {
  provider: string;
  isAvailable: boolean;
  isEnabled: boolean;
  dailyQuota: number;
  remainingDailyQuota: number;
  canMakeRequest: boolean;
  featureToggles: Record<string, boolean>;
}

export interface AISummaryResult {
  summary: string;
  keyTakeaways: string[];
  keyTerms: Record<string, string>;
  suggestedRevisionQuestions: string[];
}

export interface AIGeneratedFlashcard {
  front: string;
  back: string;
  explanation: string;
  difficulty: string;
  cardStyle: string;
}

export interface AIGeneratedQuizQuestion {
  stem: string;
  questionTypeKey: string;
  clinicalScenario?: string;
  options: string[];
  correctAnswerIndices: number[];
  rationale: string;
  difficulty: string;
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

async function fetchAI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/ai/study/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `AI Study API error: ${res.statusText}`);
  }
  return data;
}

export const aiStudyService = {
  getStatus: async (): Promise<AIStatus> => {
    const data = await fetchAI<{
      success: boolean;
      provider: string;
      isAvailable: boolean;
      isEnabled: boolean;
      dailyQuota: number;
      remainingDailyQuota: number;
      canMakeRequest: boolean;
      featureToggles: Record<string, boolean>;
    }>("status");

    return {
      provider: data.provider,
      isAvailable: data.isAvailable,
      isEnabled: data.isEnabled,
      dailyQuota: data.dailyQuota,
      remainingDailyQuota: data.remainingDailyQuota,
      canMakeRequest: data.canMakeRequest,
      featureToggles: data.featureToggles || {},
    };
  },

  summarizeNote: async (noteText: string, mode: "summarize" | "simplify" | "takeaways" | "terminology" = "summarize") => {
    return fetchAI<{ success: boolean; result: AISummaryResult }>("summarize-note", {
      method: "POST",
      body: JSON.stringify({ noteText, mode }),
    });
  },

  generateFlashcards: async (payload: {
    topic?: string;
    sourceText?: string;
    programme?: string;
    clientNeedId?: string;
    count?: number;
  }) => {
    return fetchAI<{ success: boolean; count: number; cards: AIGeneratedFlashcard[] }>("generate-flashcards", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  generateQuiz: async (payload: {
    topic: string;
    sourceText?: string;
    programme?: string;
    clientNeedId?: string;
    count?: number;
  }) => {
    return fetchAI<{ success: boolean; count: number; questions: AIGeneratedQuizQuestion[] }>("generate-quiz", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  tutorChat: async (payload: {
    message: string;
    topicSlug?: string;
    programme?: string;
    history?: AIChatMessage[];
  }) => {
    return fetchAI<{ success: boolean; reply: string }>("tutor-chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  generateStudyPlan: async (payload: {
    targetExamDate: string;
    weeklyHours: number;
    programme?: string;
    focusClientNeeds?: string[];
  }) => {
    return fetchAI<{ success: boolean; planJson: string }>("study-plan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
