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
  hasProfileImage?: boolean;
  profileImageUpdatedAt?: string;
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
  profileImageUpdatedAt?: string;
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
  promoCode?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface BackendValidatePromoResponse {
  valid: boolean;
  code?: string;
  discountPercent?: number;
  discountCents?: number;
  originalPriceCents?: number;
  finalPriceCents?: number;
  message?: string;
  error?: string;
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

  revokeSession: async (
    sessionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.post<{ success: boolean; message: string }>(
      "/api/v1/auth/revoke-session",
      { sessionId },
      { session }
    );
  },

  revokeAllUserSessions: async (
    userId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; message: string; revokedCount?: number }>> => {
    return apiClient.post<{ success: boolean; message: string; revokedCount?: number }>(
      "/api/v1/auth/revoke-session",
      { userId, revokeAll: true },
      { session }
    );
  },

  validateSession: async (input: {
    token?: string;
    sessionId?: string;
  }): Promise<ApiResponse<{ valid: boolean; user?: BackendUserSummary; error?: string }>> => {
    return apiClient.post<{ valid: boolean; user?: BackendUserSummary; error?: string }>(
      "/api/v1/auth/validate-session",
      input
    );
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

  validatePromoCode: async (
    code: string,
    planId?: string
  ): Promise<ApiResponse<BackendValidatePromoResponse>> => {
    return apiClient.post<BackendValidatePromoResponse>("/api/v1/checkout/validate-promo", {
      code,
      planId,
    });
  },
};

// ── Exam Attempts DTOs & Service ──────────────────────────────────────────

export interface BackendExamAttemptDto {
  id: string;
  userId: string;
  examId: string;
  status: "InProgress" | "Completed" | "Abandoned";
  scorePercent: number;
  passed: boolean;
  startedAt: string;
  completedAt?: string | null;
  name?: string;
  type?: string;
  durationMinutes?: number;
  totalQuestions?: number;
  correctCount?: number;
  performanceTier?: string;
  responses?: BackendAttemptResponseDto[];
}

export interface BackendAttemptResponseDto {
  id?: string;
  examAttemptId?: string;
  questionId: string;
  selectedOptionsJson: string;
  isCorrect: boolean;
  scoreAwarded: number;
  timeSpentSeconds: number;
  answeredAt?: string;
}

export const attemptsService = {
  getAttempts: async (
    session: VerifiedSession
  ): Promise<ApiResponse<{ success: boolean; attempts: BackendExamAttemptDto[] }>> => {
    return apiClient.get<{ success: boolean; attempts: BackendExamAttemptDto[] }>("/api/v1/attempts", {
      session,
    });
  },

  getAttemptById: async (
    id: string,
    session: VerifiedSession
  ): Promise<ApiResponse<{ success: boolean; attempt: BackendExamAttemptDto }>> => {
    return apiClient.get<{ success: boolean; attempt: BackendExamAttemptDto }>(
      `/api/v1/attempts/${encodeURIComponent(id)}`,
      { session }
    );
  },

  syncAttempt: async (
    attempt: unknown,
    session: VerifiedSession
  ): Promise<ApiResponse<{ success: boolean; attempt: BackendExamAttemptDto }>> => {
    return apiClient.post<{ success: boolean; attempt: BackendExamAttemptDto }>("/api/v1/attempts/sync", attempt, {
      session,
    });
  },
};

// ── Examination DTOs & Service ──────────────────────────────────────────

export interface BackendExamRevisionDto {
  id: string;
  examinationId: string;
  examinationCode?: string;
  revisionNumber: number;
  lifecycleState: string;
  concurrencyToken: number;
  title: string;
  description: string;
  pathway: string;
  examType: number;
  timeLimitMinutes: number;
  passingScorePercent: number;
  isPublished: boolean;
  questionCount: number;
  createdAt: string;
  createdBy: string;
  submittedBy?: string | null;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  archivedBy?: string | null;
  archivedAt?: string | null;
  retiredBy?: string | null;
  retiredAt?: string | null;
}

export interface BackendExaminationDto {
  id: string;
  pathway: string;
  code: string;
  title: string;
  createdAt: string;
  createdBy: string;
  currentRevisionId?: string | null;
  successorExaminationId?: string | null;
  currentRevision?: BackendExamRevisionDto | null;
  revisions: BackendExamRevisionDto[];
}

export interface BackendExamQuestionMembershipDto {
  id: string;
  examId: string;
  questionId: string;
  displayOrder: number;
  stem: string;
  questionTypeKey: string;
  pathway: string;
  difficulty: string;
  status: string;
  optionCount: number;
}

export interface BackendRevisionValidationDto {
  revisionId: string;
  isValid: boolean;
  questionCount: number;
  concurrencyToken: number;
  lifecycleState: string;
  issues: string[];
}

export interface CreateExaminationInput {
  pathway: "rn" | "pn";
  title: string;
  initialRevisionTitle?: string;
  description?: string;
  examType?: number;
  timeLimitMinutes?: number;
  passingScorePercent?: number;
}

export interface UpdateExaminationFamilyInput {
  title: string;
}

export interface CreateRevisionInput {
  title: string;
  description?: string;
  examType?: number;
  timeLimitMinutes?: number;
  passingScorePercent?: number;
}

export interface UpdateRevisionMetadataInput {
  title: string;
  description?: string;
  examType?: number;
  timeLimitMinutes?: number;
  passingScorePercent?: number;
  concurrencyToken: number;
}

export interface AddQuestionInput {
  questionId: string;
  displayOrder?: number;
  concurrencyToken: number;
}

export interface ReorderQuestionsInput {
  items: Array<{ questionId: string; displayOrder: number }>;
  concurrencyToken: number;
}

export interface TransitionRevisionInput {
  concurrencyToken: number;
  reason?: string;
  notes?: string;
}

export const examinationsService = {
  getExaminations: async (
    pathway?: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; examinations: BackendExaminationDto[] }>> => {
    const q = pathway ? `?pathway=${encodeURIComponent(pathway)}` : "";
    return apiClient.get<{ success: boolean; examinations: BackendExaminationDto[] }>(
      `/api/v1/examinations${q}`,
      { session }
    );
  },

  getExaminationById: async (
    id: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; examination: BackendExaminationDto }>> => {
    return apiClient.get<{ success: boolean; examination: BackendExaminationDto }>(
      `/api/v1/examinations/${encodeURIComponent(id)}`,
      { session }
    );
  },

  updateExaminationFamily: async (
    id: string,
    input: UpdateExaminationFamilyInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; examination: BackendExaminationDto }>> => {
    return apiClient.patch<{ success: boolean; examination: BackendExaminationDto }>(
      `/api/v1/examinations/${encodeURIComponent(id)}`,
      input,
      { session }
    );
  },

  createExamination: async (
    input: CreateExaminationInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; examination: { id: string; pathway: string; code: string; title: string; createdAt: string; createdBy: string } }>> => {
    return apiClient.post<{ success: boolean; examination: { id: string; pathway: string; code: string; title: string; createdAt: string; createdBy: string } }>(
      "/api/v1/examinations",
      input,
      { session }
    );
  },

  getRevisionById: async (
    revisionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; revision: BackendExamRevisionDto }>> => {
    return apiClient.get<{ success: boolean; revision: BackendExamRevisionDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}`,
      { session }
    );
  },

  createRevision: async (
    examinationId: string,
    input: CreateRevisionInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; revision: BackendExamRevisionDto }>> => {
    return apiClient.post<{ success: boolean; revision: BackendExamRevisionDto }>(
      `/api/v1/examinations/${encodeURIComponent(examinationId)}/revisions`,
      input,
      { session }
    );
  },

  updateRevisionMetadata: async (
    revisionId: string,
    input: UpdateRevisionMetadataInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; revision: BackendExamRevisionDto }>> => {
    return apiClient.put<{ success: boolean; revision: BackendExamRevisionDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}`,
      input,
      { session }
    );
  },

  validateRevision: async (
    revisionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; validation: BackendRevisionValidationDto }>> => {
    return apiClient.get<{ success: boolean; validation: BackendRevisionValidationDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/validate`,
      { session }
    );
  },

  discardDraftRevision: async (
    revisionId: string,
    concurrencyToken: number,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; discarded: boolean }>> => {
    return apiClient.delete<{ success: boolean; discarded: boolean }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}?concurrencyToken=${concurrencyToken}`,
      { session }
    );
  },

  getRevisionQuestions: async (
    revisionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; questions: BackendExamQuestionMembershipDto[] }>> => {
    return apiClient.get<{ success: boolean; questions: BackendExamQuestionMembershipDto[] }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/questions`,
      { session }
    );
  },

  addQuestionToRevision: async (
    revisionId: string,
    input: AddQuestionInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; question: BackendExamQuestionMembershipDto }>> => {
    return apiClient.post<{ success: boolean; question: BackendExamQuestionMembershipDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/questions`,
      input,
      { session }
    );
  },

  removeQuestionFromRevision: async (
    revisionId: string,
    questionId: string,
    concurrencyToken: number,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; removed: boolean }>> => {
    return apiClient.delete<{ success: boolean; removed: boolean }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/questions/${encodeURIComponent(questionId)}?concurrencyToken=${concurrencyToken}`,
      { session }
    );
  },

  reorderQuestions: async (
    revisionId: string,
    input: ReorderQuestionsInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; questions: BackendExamQuestionMembershipDto[] }>> => {
    return apiClient.put<{ success: boolean; questions: BackendExamQuestionMembershipDto[] }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/questions/order`,
      input,
      { session }
    );
  },

  transitionRevision: async (
    revisionId: string,
    action: "submit" | "recommend" | "return" | "approve" | "publish" | "archive" | "restore" | "retire" | "emergency-retire",
    input: TransitionRevisionInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; revision: BackendExamRevisionDto }>> => {
    return apiClient.post<{ success: boolean; revision: BackendExamRevisionDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/${action}`,
      input,
      { session }
    );
  },
};
