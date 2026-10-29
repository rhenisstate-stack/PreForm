import { apiClient, ApiResponse } from "./api-client";
import type { VerifiedSession } from "./session";

// ── Auth DTOs ───────────────────────────────────────────────────────────

export interface BackendUserSummary {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  role: string;
  pathway: string;
  activePlan?: string;
  picture?: string;
  targetExamDate?: string;
}

export interface BackendAuthResponse {
  success: boolean;
  token?: string;
  user?: BackendUserSummary;
  error?: string;
  message?: string;
}

export interface BackendSessionResponse {
  authenticated: boolean;
  user?: BackendUserSummary | null;
}

// ── Profile DTOs ────────────────────────────────────────────────────────

export interface BackendUserProfile {
  id: string;
  email: string;
  displayName: string;
  name?: string;
  role: string;
  pathway: "rn" | "pn" | "both";
  activePlan: string;
  targetExamDate: string;
  emailNotifications: boolean;
  studyReminders: boolean;
  hasProfileImage: boolean;
  pictureUrl?: string;
  picture?: string;
  provider?: string;
}

export interface BackendProfileResponse {
  success: boolean;
  profile?: BackendUserProfile;
  error?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  targetExamDate?: string;
  emailNotifications?: boolean;
  studyReminders?: boolean;
}

// ── Subscription DTOs ───────────────────────────────────────────────────

export interface BackendSubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  audience?: string;
  pathway: "RN" | "PN" | "Both";
  planType: "starter" | "pro" | "premium" | "readiness";
  price: number;
  priceCents: number;
  originalPrice?: number;
  originalPriceCents?: number;
  currency: string;
  billingInterval: "month" | "quarter" | "one-time";
  durationLabel?: string;
  features: string[];
  popular?: boolean;
  bgColour?: string;
  accentColour?: string;
  textColour?: string;
  badgeText?: string;
  displayOrder: number;
  isActive: boolean;
  entitlements: string[];
}

export interface BackendCatalogResponse {
  success: boolean;
  count: number;
  plans: BackendSubscriptionPlan[];
}

// ── Checkout DTOs ───────────────────────────────────────────────────────

export interface BackendCheckoutRequest {
  planId: string;
  pathway?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface BackendCheckoutResponse {
  success: boolean;
  orderId?: string;
  sessionId?: string;
  sessionUrl?: string;
  checkoutUrl?: string;
  isSimulated?: boolean;
  message?: string;
  simulationNotice?: string;
  plan?: {
    id: string;
    name: string;
    pathway: string;
  };
  error?: string;
}

export interface BackendEntitlementsResponse {
  success: boolean;
  userId: string;
  activePlan: string;
  pathways: string[];
  entitlements: string[];
  subscriptions: Array<{
    id: string;
    planId: string;
    planName: string;
    pathway: string;
    status: string;
    startsAt: string;
    expiresAt: string;
  }>;
}

// ── Services ────────────────────────────────────────────────────────────

export const authService = {
  register: async (input: {
    fullName: string;
    email: string;
    password?: string;
    pathway?: string;
  }): Promise<ApiResponse<BackendAuthResponse>> => {
    return apiClient.post<BackendAuthResponse>("/api/v1/auth/register", {
      email: input.email,
      password: input.password || "TempP@ssword123!",
      displayName: input.fullName,
      pathway: input.pathway || "rn",
    });
  },

  login: async (input: {
    email: string;
    password?: string;
    rememberMe?: boolean;
  }): Promise<ApiResponse<BackendAuthResponse>> => {
    return apiClient.post<BackendAuthResponse>("/api/v1/auth/login", {
      email: input.email,
      password: input.password || "TempP@ssword123!",
      rememberMe: Boolean(input.rememberMe),
    });
  },

  logout: async (session: VerifiedSession): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.post<{ success: boolean; message: string }>("/api/v1/auth/logout", undefined, {
      session,
    });
  },

  getSession: async (session: VerifiedSession): Promise<ApiResponse<BackendSessionResponse>> => {
    return apiClient.get<BackendSessionResponse>("/api/v1/auth/session", {
      session,
    });
  },
};

export const profileService = {
  getProfile: async (session: VerifiedSession): Promise<ApiResponse<BackendProfileResponse>> => {
    return apiClient.get<BackendProfileResponse>("/api/v1/profile", {
      session,
    });
  },

  updateProfile: async (
    session: VerifiedSession,
    input: UpdateProfileInput
  ): Promise<ApiResponse<BackendProfileResponse>> => {
    return apiClient.put<BackendProfileResponse>("/api/v1/profile", input, {
      session,
    });
  },

  changePassword: async (
    session: VerifiedSession,
    input: { currentPassword: string; newPassword: string }
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.post<{ success: boolean; message: string }>(
      "/api/v1/profile/change-password",
      input,
      { session }
    );
  },

  getProfileImage: async (
    session: VerifiedSession
  ): Promise<ApiResponse<Blob | ArrayBuffer>> => {
    const query = new URLSearchParams({
      userId: session.userId,
      email: session.email,
    });
    return apiClient.get<Blob | ArrayBuffer>(`/api/v1/profile/image?${query.toString()}`, {
      session,
    });
  },

  uploadProfileImage: async (
    session: VerifiedSession,
    imageBuffer: Buffer | Uint8Array,
    contentType: string
  ): Promise<ApiResponse<{ success: boolean; sha256Hash: string; sizeBytes: number }>> => {
    return apiClient.put<{ success: boolean; sha256Hash: string; sizeBytes: number }>(
      "/api/v1/profile/image",
      imageBuffer,
      {
        session,
        headers: {
          "Content-Type": contentType,
        },
      }
    );
  },

  deleteProfileImage: async (
    session: VerifiedSession
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.delete<{ success: boolean }>("/api/v1/profile/image", {
      session,
    });
  },
};

export const subscriptionService = {
  getActivePlans: async (): Promise<ApiResponse<BackendCatalogResponse>> => {
    return apiClient.get<BackendCatalogResponse>("/api/v1/subscriptions");
  },

  getAllPlans: async (session: VerifiedSession): Promise<ApiResponse<BackendCatalogResponse>> => {
    return apiClient.get<BackendCatalogResponse>("/api/v1/admin/subscriptions", {
      session,
    });
  },

  getPlanByIdOrSlug: async (
    idOrSlug: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; plan: BackendSubscriptionPlan }>> => {
    return apiClient.get<{ success: boolean; plan: BackendSubscriptionPlan }>(
      `/api/v1/subscriptions/${encodeURIComponent(idOrSlug)}`,
      { session }
    );
  },

  createPlan: async (
    session: VerifiedSession,
    planData: Partial<BackendSubscriptionPlan>
  ): Promise<ApiResponse<{ success: boolean; plan: BackendSubscriptionPlan }>> => {
    return apiClient.post<{ success: boolean; plan: BackendSubscriptionPlan }>(
      "/api/v1/admin/subscriptions",
      planData,
      { session }
    );
  },

  updatePlan: async (
    session: VerifiedSession,
    id: string,
    planData: Partial<BackendSubscriptionPlan>
  ): Promise<ApiResponse<{ success: boolean; plan: BackendSubscriptionPlan }>> => {
    return apiClient.put<{ success: boolean; plan: BackendSubscriptionPlan }>(
      `/api/v1/admin/subscriptions/${encodeURIComponent(id)}`,
      planData,
      { session }
    );
  },

  archivePlan: async (
    session: VerifiedSession,
    id: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/admin/subscriptions/${encodeURIComponent(id)}`,
      { session }
    );
  },
};

export const checkoutService = {
  createCheckoutSession: async (
    session: VerifiedSession,
    input: BackendCheckoutRequest
  ): Promise<ApiResponse<BackendCheckoutResponse>> => {
    return apiClient.post<BackendCheckoutResponse>("/api/v1/checkout", input, {
      session,
    });
  },

  getUserEntitlements: async (
    session: VerifiedSession
  ): Promise<ApiResponse<BackendEntitlementsResponse>> => {
    return apiClient.get<BackendEntitlementsResponse>("/api/v1/entitlements", {
      session,
    });
  },
};
