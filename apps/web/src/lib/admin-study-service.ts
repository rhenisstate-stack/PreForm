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
