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
  sessionId?: string;
  errorCode?: string;
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
    clientId?: string;
  }): Promise<ApiResponse<BackendAuthResponse>> => {
    return apiClient.post<BackendAuthResponse>("/api/v1/auth/register", {
      email: input.email,
      password: input.password || "TempP@ssword123!",
      displayName: input.fullName,
      pathway: input.pathway || "rn",
      clientId: input.clientId,
    });
  },

  login: async (input: {
    email: string;
    password?: string;
    rememberMe?: boolean;
    clientId?: string;
    fingerprintHash?: string;
  }): Promise<ApiResponse<BackendAuthResponse>> => {
    return apiClient.post<BackendAuthResponse>("/api/v1/auth/login", {
      email: input.email,
      password: input.password || "TempP@ssword123!",
      rememberMe: Boolean(input.rememberMe),
      clientId: input.clientId,
      fingerprintHash: input.fingerprintHash,
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

  recoverSessions: async (input: {
    email: string;
    password: string;
    clearRemainingSessions?: boolean;
  }): Promise<ApiResponse<{ success: boolean; error?: string; errorCode?: string }>> => {
    return apiClient.post<{ success: boolean; error?: string; errorCode?: string }>("/api/v1/auth/recover-sessions", {
      email: input.email,
      password: input.password,
      clearRemainingSessions: input.clearRemainingSessions ?? false,
    });
  },

  forgotPassword: async (
    email: string,
    correlationId?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.post<{ success: boolean; message: string }>(
      "/api/v1/auth/forgot-password",
      { email },
      { correlationId }
    );
  },

  validateResetToken: async (
    token: string,
    correlationId?: string
  ): Promise<ApiResponse<{ valid: boolean; maskedEmail?: string; error?: string }>> => {
    return apiClient.post<{ valid: boolean; maskedEmail?: string; error?: string }>(
      "/api/v1/auth/validate-reset-token",
      { token },
      { correlationId }
    );
  },

  resetPassword: async (
    input: { token: string; newPassword: string; confirmPassword: string },
    correlationId?: string
  ): Promise<ApiResponse<{ success: boolean; message?: string; error?: string }>> => {
    return apiClient.post<{ success: boolean; message?: string; error?: string }>(
      "/api/v1/auth/reset-password",
      input,
      { correlationId }
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
    input: { currentPassword: string; newPassword: string; clientId?: string }
  ): Promise<ApiResponse<{ success: boolean; message: string; sessionId?: string; token?: string }>> => {
    return apiClient.post<{ success: boolean; message: string; sessionId?: string; token?: string }>(
      "/api/v1/profile/change-password",
      {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        clientId: input.clientId,
      },
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
  questions?: CandidateQuestionDto[];
}

export interface CandidateQuestionOptionDto {
  id: string;
  index: number;
  text: string;
  mediaUrl?: string;
}

export interface CandidateQuestionDto {
  id: string;
  questionNumber: number;
  stem: string;
  questionType: string;
  domain?: string;
  subdomain?: string;
  mediaUrl?: string;
  options: CandidateQuestionOptionDto[];
  correctAnswerIndices?: number[];
  rationale?: string;
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

export interface BackendReauthenticateAttemptRequest {
  password: string;
  email?: string;
  clientId?: string;
}

export interface BackendReauthenticateAttemptResponse {
  success: boolean;
  sessionId?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    displayName: string;
    role: string;
    pathway?: string;
  };
  attempt?: {
    id: string;
    startedAt: string;
    timeLimitMinutes: number;
    deadlineUtc: string | null;
    remainingSeconds: number | null;
    status: string;
    totalResponses: number;
    responses: Array<{
      questionId: string;
      selectedOptionsJson: string;
      timeSpentSeconds: number;
      answeredAt: string;
    }>;
  };
  error?: string;
  errorCode?: string;
}

export interface AvailableAssessmentDto {
  id: string;
  title: string;
  description: string;
  pathway: string;
  examType: string;
  questionCount: number;
  durationMinutes: number;
  passingScorePercent: number;
  hasActiveAttempt: boolean;
  activeAttemptId?: string;
  badge?: string;
  isEligible: boolean;
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

  startAttempt: async (
    request: { examId?: string; pathway?: string; name?: string; testType?: string; questionCount?: number; clientNeedId?: string; topicId?: string },
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; attemptId: string; examId: string; startedAt: string; questionCount?: number; resumed?: boolean; message?: string }>> => {
    return apiClient.post<{ success: boolean; attemptId: string; examId: string; startedAt: string; questionCount?: number; resumed?: boolean; message?: string }>("/api/v1/attempts", request, {
      session,
    });
  },

  submitResponse: async (
    id: string,
    response: { questionId: string; selectedOptionIndices: number[]; timeSpentSeconds?: number },
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; message: string; isCorrect?: boolean; scoreAwarded?: number }>> => {
    return apiClient.post<{ success: boolean; message: string; isCorrect?: boolean; scoreAwarded?: number }>(
      `/api/v1/attempts/${encodeURIComponent(id)}/responses`,
      response,
      { session }
    );
  },

  submitAttempt: async (
    id: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; attemptId: string; scorePercent: number; passed: boolean; performanceTier?: string; totalQuestions: number; correctCount: number; completedAt: string }>> => {
    return apiClient.post<{ success: boolean; attemptId: string; scorePercent: number; passed: boolean; performanceTier?: string; totalQuestions: number; correctCount: number; completedAt: string }>(
      `/api/v1/attempts/${encodeURIComponent(id)}/submit`,
      {},
      { session }
    );
  },

  getAttemptQuestions: async (
    id: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; questions: CandidateQuestionDto[] }>> => {
    return apiClient.get<{ success: boolean; questions: CandidateQuestionDto[] }>(
      `/api/v1/attempts/${encodeURIComponent(id)}/questions`,
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

  reauthenticateAttempt: async (
    id: string,
    credentials: BackendReauthenticateAttemptRequest
  ): Promise<ApiResponse<BackendReauthenticateAttemptResponse>> => {
    return apiClient.post<BackendReauthenticateAttemptResponse>(
      `/api/v1/attempts/${encodeURIComponent(id)}/reauthenticate`,
      credentials
    );
  },
};

export const assessmentsService = {
  getAvailableAssessments: async (
    session?: VerifiedSession | null,
    pathway?: string
  ): Promise<ApiResponse<{ success: boolean; pathway: string; assessments: AvailableAssessmentDto[] }>> => {
    const q = pathway ? `?pathway=${encodeURIComponent(pathway)}` : "";
    return apiClient.get<{ success: boolean; pathway: string; assessments: AvailableAssessmentDto[] }>(
      `/api/v1/assessments/available${q}`,
      { session }
    );
  },

  getAssessmentById: async (
    id: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; assessment: AvailableAssessmentDto }>> => {
    return apiClient.get<{ success: boolean; assessment: AvailableAssessmentDto }>(
      `/api/v1/assessments/${encodeURIComponent(id)}`,
      { session }
    );
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
  targetQuestionCount?: number;
  selectionStrategy?: string;
  compositionRulesJson?: string | null;
  isAvailable?: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
  maxAttemptsAllowed?: number | null;
  retakeCooldownHours?: number;
  allowInterruptedResume?: boolean;
  reviewPolicy?: string;
  showRationales?: boolean;
  showScoreImmediately?: boolean;
  configurationSnapshotJson?: string | null;
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

export interface BackendExamRevisionSummaryDto {
  id: string;
  examinationId: string;
  examinationCode?: string | null;
  revisionNumber: number;
  lifecycleState: string;
  title: string;
  description: string;
  pathway: string;
  examType: number;
  timeLimitMinutes: number;
  passingScorePercent: number;
  isPublished: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface BackendExaminationLibraryItemDto {
  id: string;
  code: string;
  title: string;
  pathway: string;
  createdAt: string;
  createdBy: string;
  currentRevisionId?: string | null;
  successorExaminationId?: string | null;
  revisionCount: number;
  publishedRevision?: BackendExamRevisionSummaryDto | null;
  latestRevision?: BackendExamRevisionSummaryDto | null;
  currentRevision?: BackendExamRevisionSummaryDto | null;
}

export interface BackendPaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface BackendExaminationLibraryResponseDto {
  success: boolean;
  items: BackendExaminationLibraryItemDto[];
  pagination: BackendPaginationMetadata;
  examinations: BackendExaminationDto[];
}

export interface BackendFamilyRevisionsResponseDto {
  success: boolean;
  examinationId: string;
  examinationCode: string;
  examinationTitle: string;
  pathway: string;
  revisions: BackendExamRevisionDto[];
}

export interface ExaminationQueryParams {
  search?: string;
  pathway?: string;
  revisionStatus?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
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
  sourceRevisionId?: string;
  copyQuestions?: boolean;
}

export interface DuplicateExaminationInput {
  title?: string;
  sourceRevisionId?: string;
  description?: string;
  timeLimitMinutes?: number;
  passingScorePercent?: number;
}

export interface BackendDuplicateExaminationResponseDto {
  success: boolean;
  examinationId: string;
  examinationCode: string;
  examinationTitle: string;
  pathway: string;
  revisionId: string;
  revisionNumber: number;
  lifecycleState: string;
  questionCount: number;
  examination: BackendExaminationDto;
}

export interface ClientNeedQuotaItem {
  clientNeedId: string;
  clientNeedName: string;
  targetCount: number;
  targetPercentage: number;
  availableCount: number;
}

export interface BackendExamCompositionDto {
  revisionId: string;
  targetQuestionCount: number;
  selectionStrategy: string;
  allowedQuestionTypes: string[];
  clientNeedQuotas: ClientNeedQuotaItem[];
  concurrencyToken: number;
}

export interface UpdateExamCompositionInput {
  targetQuestionCount: number;
  selectionStrategy: string;
  allowedQuestionTypes: string[];
  clientNeedQuotas: Array<{
    clientNeedId: string;
    targetCount: number;
    targetPercentage: number;
  }>;
  concurrencyToken: number;
}

export interface QuestionPoolPreviewItem {
  clientNeedId: string;
  clientNeedName: string;
  requiredCount: number;
  availableApprovedQuestions: number;
  isSufficient: boolean;
}

export interface BackendQuestionPoolPreviewDto {
  revisionId: string;
  pathway: string;
  selectionStrategy: string;
  totalRequiredQuestions: number;
  totalAvailableApprovedQuestions: number;
  isOverallPoolSufficient: boolean;
  items: QuestionPoolPreviewItem[];
}

export interface ExamReadinessCheckItem {
  code: string;
  area: string;
  severity: "PASS" | "WARN" | "BLOCK";
  message: string;
}

export interface BackendExamReadinessDto {
  revisionId: string;
  examinationCode: string;
  title: string;
  lifecycleState: string;
  overallStatus: "READY" | "NEEDS_ATTENTION" | "BLOCKED";
  canPublish: boolean;
  checks: ExamReadinessCheckItem[];
  evaluatedAtUtc: string;
}

export interface AdminExamPreviewOptionDto {
  id: string;
  optionKey: string;
  content: string;
  isCorrect: boolean;
  rationale?: string | null;
  displayOrder: number;
}

export interface AdminExamPreviewQuestionDto {
  id: string;
  displayOrder: number;
  stem: string;
  questionTypeKey: string;
  clientNeedId?: string | null;
  clientNeedName?: string | null;
  topicTitle?: string | null;
  overallRationale?: string | null;
  options: AdminExamPreviewOptionDto[];
}

export interface BackendAdminExamPreviewDto {
  revisionId: string;
  examinationCode: string;
  title: string;
  pathway: string;
  selectionStrategy: string;
  targetQuestionCount: number;
  timeLimitMinutes: number;
  passingScorePercent: number;
  reviewPolicy: string;
  questions: AdminExamPreviewQuestionDto[];
}

export interface UpdateRevisionMetadataInput {
  title: string;
  description?: string;
  examType?: number;
  timeLimitMinutes?: number;
  passingScorePercent?: number;
  concurrencyToken: number;
  targetQuestionCount?: number;
  selectionStrategy?: string;
  isAvailable?: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
  maxAttemptsAllowed?: number | null;
  retakeCooldownHours?: number;
  allowInterruptedResume?: boolean;
  reviewPolicy?: string;
  showRationales?: boolean;
  showScoreImmediately?: boolean;
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
  queryExaminations: async (
    params?: ExaminationQueryParams,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendExaminationLibraryResponseDto>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.pathway && params.pathway !== "all") searchParams.set("pathway", params.pathway);
    if (params?.revisionStatus && params.revisionStatus !== "all") searchParams.set("revisionStatus", params.revisionStatus);
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortDirection) searchParams.set("sortDirection", params.sortDirection);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString());

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiClient.get<BackendExaminationLibraryResponseDto>(
      `/api/v1/examinations${qs}`,
      { session }
    );
  },

  getFamilyRevisions: async (
    familyId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendFamilyRevisionsResponseDto>> => {
    return apiClient.get<BackendFamilyRevisionsResponseDto>(
      `/api/v1/examinations/${encodeURIComponent(familyId)}/revisions`,
      { session }
    );
  },

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

  getEligibleQuestions: async (
    pathway?: string,
    search?: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; questions: BackendExamQuestionMembershipDto[] }>> => {
    const params = new URLSearchParams();
    if (pathway) params.set("pathway", pathway);
    if (search) params.set("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ success: boolean; questions: BackendExamQuestionMembershipDto[] }>(
      `/api/v1/examinations/eligible-questions${qs}`,
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

  duplicateExamination: async (
    examinationId: string,
    input: DuplicateExaminationInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendDuplicateExaminationResponseDto>> => {
    return apiClient.post<BackendDuplicateExaminationResponseDto>(
      `/api/v1/examinations/${encodeURIComponent(examinationId)}/duplicate`,
      input,
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

  getComposition: async (
    revisionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; composition: BackendExamCompositionDto }>> => {
    return apiClient.get<{ success: boolean; composition: BackendExamCompositionDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/composition`,
      { session }
    );
  },

  updateComposition: async (
    revisionId: string,
    input: UpdateExamCompositionInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; composition: BackendExamCompositionDto }>> => {
    return apiClient.put<{ success: boolean; composition: BackendExamCompositionDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/composition`,
      input,
      { session }
    );
  },

  getPoolPreview: async (
    revisionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; preview: BackendQuestionPoolPreviewDto }>> => {
    return apiClient.get<{ success: boolean; preview: BackendQuestionPoolPreviewDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/pool-preview`,
      { session }
    );
  },

  getReadiness: async (
    revisionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; readiness: BackendExamReadinessDto }>> => {
    return apiClient.get<{ success: boolean; readiness: BackendExamReadinessDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/readiness`,
      { session }
    );
  },

  getAdminPreview: async (
    revisionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; preview: BackendAdminExamPreviewDto }>> => {
    return apiClient.get<{ success: boolean; preview: BackendAdminExamPreviewDto }>(
      `/api/v1/examinations/revisions/${encodeURIComponent(revisionId)}/preview`,
      { session }
    );
  },
};

// ── Security & Device Management DTOs & Service ──────────────────────────────

export interface BackendLearnerSession {
  id: string;
  deviceLabel: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  createdAt: string;
  lastActiveAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  isCurrent: boolean;
  lastIpAddress?: string;
}

export interface BackendSecurityEvent {
  id: string;
  action: string;
  description: string;
  outcome: string;
  timestamp: string;
  ipAddress?: string;
}

export interface BackendLearnerSessionsResponse {
  success: boolean;
  sessions: BackendLearnerSession[];
  totalActiveCount: number;
}

export interface BackendSecurityEventsResponse {
  success: boolean;
  events: BackendSecurityEvent[];
  totalCount: number;
}

export interface BackendRevokeSessionResult {
  success: boolean;
  message: string;
  revokedCount?: number;
}

export const securityService = {
  getSessions: async (
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendLearnerSessionsResponse>> => {
    return apiClient.get<BackendLearnerSessionsResponse>("/api/v1/security/sessions", { session });
  },

  revokeSession: async (
    sessionId: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendRevokeSessionResult>> => {
    return apiClient.delete<BackendRevokeSessionResult>(
      `/api/v1/security/sessions/${encodeURIComponent(sessionId)}`,
      { session }
    );
  },

  revokeOtherSessions: async (
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendRevokeSessionResult>> => {
    return apiClient.post<BackendRevokeSessionResult>(
      "/api/v1/security/sessions/revoke-others",
      {},
      { session }
    );
  },

  revokeAllSessions: async (
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendRevokeSessionResult>> => {
    return apiClient.post<BackendRevokeSessionResult>(
      "/api/v1/security/sessions/revoke-all",
      {},
      { session }
    );
  },

  getEvents: async (
    session?: VerifiedSession | null
  ): Promise<ApiResponse<BackendSecurityEventsResponse>> => {
    return apiClient.get<BackendSecurityEventsResponse>("/api/v1/security/events", { session });
  },
};

// ── Super Admin Session Security DTOs & Service ──────────────────────────────

export interface AdminSecurityMetrics {
  totalActiveSessions: number;
  activeUsersCount: number;
  expiringSoonCount: number;
  revokedLast24HoursCount: number;
  limitRejectionsLast24HoursCount: number;
  securityVersionInvalidationsLast24HoursCount: number;
}

export interface AdminSessionPolicy {
  id: string;
  maxConcurrentSessions: number;
  maxSessionsPerClient: number;
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
  enforceFingerprint: boolean;
  enforceIpConsistency: boolean;
  allowIpDrift: boolean;
  rotateOnLogin: boolean;
  rotateOnPrivilegeChange: boolean;
  rotateOnPasswordChange: boolean;
  policyVersion: number;
  updatedAt: string;
  updatedBy?: string;
  isActive: boolean;
  defaults?: {
    maxConcurrentSessions: number;
    maxSessionsPerClient: number;
    idleTimeoutMinutes: number;
    absoluteTimeoutMinutes: number;
    enforceFingerprint: boolean;
    enforceIpConsistency: boolean;
    allowIpDrift: boolean;
    rotateOnLogin: boolean;
    rotateOnPrivilegeChange: boolean;
    rotateOnPasswordChange: boolean;
  };
}

export interface UpdateAdminSessionPolicyInput {
  maxConcurrentSessions: number;
  maxSessionsPerClient: number;
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
  enforceFingerprint: boolean;
  enforceIpConsistency: boolean;
  allowIpDrift: boolean;
  rotateOnLogin: boolean;
  rotateOnPrivilegeChange: boolean;
  rotateOnPasswordChange: boolean;
  policyVersion: number;
}

export interface AdminSessionItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  role: string;
  clientId: string;
  deviceLabel: string;
  browser: string;
  operatingSystem: string;
  deviceType: string;
  createdAt: string;
  lastActiveAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  effectiveExpiresAt: string;
  revoked: boolean;
  revokedAt?: string;
  revocationReason?: string;
  lastIpAddress?: string;
  status: string;
}

export interface AdminPaginatedSessionsResponse {
  success: boolean;
  items: AdminSessionItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSecurityEvent {
  id: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  outcome: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AdminPaginatedEventsResponse {
  success: boolean;
  items: AdminSecurityEvent[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const adminSecurityService = {
  getMetrics: async (
    session?: VerifiedSession | null
  ): Promise<ApiResponse<AdminSecurityMetrics & { success: boolean }>> => {
    return apiClient.get<AdminSecurityMetrics & { success: boolean }>("/api/v1/admin/security/metrics", { session });
  },

  getPolicy: async (
    session?: VerifiedSession | null
  ): Promise<ApiResponse<AdminSessionPolicy & { success: boolean }>> => {
    return apiClient.get<AdminSessionPolicy & { success: boolean }>("/api/v1/admin/security/session-policy", { session });
  },

  updatePolicy: async (
    input: UpdateAdminSessionPolicyInput,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; message: string; policy: AdminSessionPolicy }>> => {
    return apiClient.put<{ success: boolean; message: string; policy: AdminSessionPolicy }>(
      "/api/v1/admin/security/session-policy",
      input,
      { session }
    );
  },

  resetPolicy: async (
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; message: string; policy: AdminSessionPolicy }>> => {
    return apiClient.post<{ success: boolean; message: string; policy: AdminSessionPolicy }>(
      "/api/v1/admin/security/session-policy/reset",
      {},
      { session }
    );
  },

  getSessions: async (
    query: { page?: number; pageSize?: number; status?: string; search?: string; sortBy?: string; sortOrder?: string },
    session?: VerifiedSession | null
  ): Promise<ApiResponse<AdminPaginatedSessionsResponse>> => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("search", query.search);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortOrder) params.set("sortOrder", query.sortOrder);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<AdminPaginatedSessionsResponse>(`/api/v1/admin/security/sessions${queryString}`, { session });
  },

  revokeSession: async (
    sessionId: string,
    reason: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/api/v1/admin/security/sessions/${encodeURIComponent(sessionId)}/revoke`,
      { reason },
      { session }
    );
  },

  revokeAllUserSessions: async (
    userId: string,
    reason: string,
    session?: VerifiedSession | null
  ): Promise<ApiResponse<{ success: boolean; revokedCount: number; message: string }>> => {
    return apiClient.post<{ success: boolean; revokedCount: number; message: string }>(
      `/api/v1/admin/security/users/${encodeURIComponent(userId)}/revoke-sessions`,
      { reason },
      { session }
    );
  },

  getEvents: async (
    query: { page?: number; pageSize?: number; action?: string; search?: string },
    session?: VerifiedSession | null
  ): Promise<ApiResponse<AdminPaginatedEventsResponse>> => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.action) params.set("action", query.action);
    if (query.search) params.set("search", query.search);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<AdminPaginatedEventsResponse>(`/api/v1/admin/security/events${queryString}`, { session });
  },
};

// ── Admin Users Service ───────────────────────────────────────────────
export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  pathway: string;
  accountStatus: string;
  isActive: boolean;
  securityVersion: number;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export interface AdminPaginatedUsersResponse {
  success: boolean;
  total: number;
  page: number;
  pageSize: number;
  users: AdminUserListItem[];
}

export const adminUsersService = {
  getUsers: async (
    query: { search?: string; role?: string; status?: string; page?: number; pageSize?: number },
    session?: VerifiedSession | null
  ): Promise<ApiResponse<AdminPaginatedUsersResponse>> => {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.role) params.set("role", query.role);
    if (query.status) params.set("status", query.status);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));

    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<AdminPaginatedUsersResponse>(`/api/v1/admin/users${qs}`, { session });
  },

  getUserById: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; user: any }>(`/api/v1/admin/users/${encodeURIComponent(id)}`, { session });
  },

  createUser: async (
    data: { email: string; password: string; displayName: string; pathway?: string; roles?: string[] },
    session?: VerifiedSession | null
  ) => {
    return apiClient.post<{ success: boolean; user: any; error?: string }>("/api/v1/admin/users", data, { session });
  },

  updateUser: async (id: string, data: any, session?: VerifiedSession | null) => {
    return apiClient.put<{ success: boolean; user: any }>(`/api/v1/admin/users/${encodeURIComponent(id)}`, data, { session });
  },

  updateStatus: async (id: string, status: string, reason?: string, session?: VerifiedSession | null) => {
    return apiClient.post<{ success: boolean; accountStatus: string; isActive: boolean; securityVersion: number; error?: string }>(
      `/api/v1/admin/users/${encodeURIComponent(id)}/status`,
      { status, reason },
      { session }
    );
  },

  assignRole: async (id: string, roleId: string, session?: VerifiedSession | null) => {
    return apiClient.post<{ success: boolean; message: string; error?: string }>(
      `/api/v1/admin/users/${encodeURIComponent(id)}/roles`,
      { roleId },
      { session }
    );
  },

  removeRole: async (id: string, roleId: string, session?: VerifiedSession | null) => {
    return apiClient.delete<{ success: boolean; message: string; error?: string }>(
      `/api/v1/admin/users/${encodeURIComponent(id)}/roles/${encodeURIComponent(roleId)}`,
      { session }
    );
  },

  revokeAllSessions: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.post<{ success: boolean; revokedCount: number }>(
      `/api/v1/admin/users/${encodeURIComponent(id)}/revoke-sessions`,
      {},
      { session }
    );
  },
};

// ── Admin Roles & Permissions Service ──────────────────────────────────
export interface AdminRoleItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  permissionCount: number;
  userCount: number;
}

export const adminRolesService = {
  getRoles: async (session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; roles: AdminRoleItem[] }>("/api/v1/admin/roles", { session });
  },

  getRoleById: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; role: any }>(`/api/v1/admin/roles/${encodeURIComponent(id)}`, { session });
  },

  getPermissions: async (session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; permissions: any[]; grouped: Record<string, any[]> }>(
      "/api/v1/admin/permissions",
      { session }
    );
  },

  createRole: async (data: { name: string; description: string }, session?: VerifiedSession | null) => {
    return apiClient.post<{ success: boolean; role?: any; error?: string }>("/api/v1/admin/roles", data, { session });
  },

  updateRole: async (id: string, data: { description: string }, session?: VerifiedSession | null) => {
    return apiClient.put<{ success: boolean; role?: any }>(`/api/v1/admin/roles/${encodeURIComponent(id)}`, data, { session });
  },

  deleteRole: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.delete<{ success: boolean; message?: string; error?: string }>(
      `/api/v1/admin/roles/${encodeURIComponent(id)}`,
      { session }
    );
  },

  assignPermission: async (id: string, permissionId: string, session?: VerifiedSession | null) => {
    return apiClient.post<{ success: boolean; message: string }>(
      `/api/v1/admin/roles/${encodeURIComponent(id)}/permissions`,
      { permissionId },
      { session }
    );
  },

  removePermission: async (id: string, permissionId: string, session?: VerifiedSession | null) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/admin/roles/${encodeURIComponent(id)}/permissions/${encodeURIComponent(permissionId)}`,
      { session }
    );
  },
};

// ── Admin IP Rules Service ─────────────────────────────────────────────
export interface AdminIpRuleItem {
  id: string;
  ipAddressOrCidr: string;
  ruleType: string;
  description: string;
  createdAt: string;
  createdBy?: string;
  expiresAt?: string;
  isActive: boolean;
}

export const adminIpRulesService = {
  getRules: async (query?: { ruleType?: string; activeOnly?: boolean }, session?: VerifiedSession | null) => {
    const params = new URLSearchParams();
    if (query?.ruleType) params.set("ruleType", query.ruleType);
    if (query?.activeOnly !== undefined) params.set("activeOnly", String(query.activeOnly));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ success: boolean; rules: AdminIpRuleItem[] }>(`/api/v1/admin/security/ip-rules${qs}`, { session });
  },

  createRule: async (
    data: { ipAddressOrCidr: string; ruleType: string; description: string; expiresAt?: string },
    session?: VerifiedSession | null
  ) => {
    return apiClient.post<{ success: boolean; rule: AdminIpRuleItem; error?: string }>(
      "/api/v1/admin/security/ip-rules",
      data,
      { session }
    );
  },

  updateRule: async (
    id: string,
    data: { description?: string; isActive?: boolean; expiresAt?: string },
    session?: VerifiedSession | null
  ) => {
    return apiClient.put<{ success: boolean; rule: AdminIpRuleItem }>(
      `/api/v1/admin/security/ip-rules/${encodeURIComponent(id)}`,
      data,
      { session }
    );
  },

  deleteRule: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/admin/security/ip-rules/${encodeURIComponent(id)}`,
      { session }
    );
  },
};

// ── Admin Audit Logs Service ───────────────────────────────────────────
export interface AdminAuditLogItem {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  outcome: string;
  severity: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AdminPaginatedAuditLogsResponse {
  success: boolean;
  total: number;
  page: number;
  pageSize: number;
  logs: AdminAuditLogItem[];
}

export const adminAuditLogsService = {
  getAuditLogs: async (
    query: {
      actorId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      correlationId?: string;
      severity?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
    session?: VerifiedSession | null
  ) => {
    const params = new URLSearchParams();
    if (query.actorId) params.set("actorId", query.actorId);
    if (query.action) params.set("action", query.action);
    if (query.entityType) params.set("entityType", query.entityType);
    if (query.entityId) params.set("entityId", query.entityId);
    if (query.correlationId) params.set("correlationId", query.correlationId);
    if (query.severity) params.set("severity", query.severity);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));

    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<AdminPaginatedAuditLogsResponse>(`/api/v1/admin/audit-logs${qs}`, { session });
  },

  getAuditLogById: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; log: any }>(`/api/v1/admin/audit-logs/${encodeURIComponent(id)}`, { session });
  },
};

// ── Question Bank & Curriculum DTOs ──────────────────────────────────────────

export interface AdminQuestionOption {
  id: string;
  optionKey: string;
  content: string;
  displayOrder: number;
  isCorrect: boolean;
  rationale?: string;
  distractorRationale?: string;
  mediaUrl?: string;
}

export interface AdminQuestionSummary {
  id: string;
  code?: string;
  pathway: string;
  topicId?: string;
  topicTitle?: string;
  subcategoryName?: string;
  categoryName?: string;
  courseTitle?: string;
  clientNeedId?: string;
  clientNeedCode?: string;
  clientNeedName?: string;
  questionTypeKey: string;
  questionTypeName: string;
  stem: string;
  difficulty: number;
  status: number;
  version: number;
  cognitiveLevel?: string;
  clinicalJudgmentStep?: string;
  createdById?: string;
  authorName?: string;
  reviewedById?: string;
  reviewerName?: string;
  optionsCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AdminQuestionDetail extends AdminQuestionSummary {
  instructions?: string;
  clinicalScenario?: string;
  exhibitsJson?: string;
  structuredContentJson?: string;
  overallRationale?: string;
  source?: string;
  rejectionReason?: string;
  versionsCount: number;
  options: AdminQuestionOption[];
}

export interface AdminQuestionVersion {
  id: string;
  questionId: string;
  versionNumber: number;
  snapshotJson: string;
  changeSummary?: string;
  status: number;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}

export interface AdminPaginatedQuestionsResponse {
  success: boolean;
  result: {
    items: AdminQuestionSummary[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface AdminCurriculumTreeNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  questionCount: number;
  children: AdminCurriculumTreeNode[];
}

export interface AdminClientNeed {
  id: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  pathway: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export const adminQuestionsService = {
  getQuestions: async (
    query: {
      search?: string;
      type?: string;
      pathway?: string;
      topicId?: string;
      subcategoryId?: string;
      categoryId?: string;
      courseId?: string;
      clientNeedId?: string;
      difficulty?: number;
      status?: number;
      cognitiveLevel?: string;
      clinicalJudgmentStep?: string;
      authorId?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortDirection?: string;
    },
    session?: VerifiedSession | null
  ) => {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.type) params.set("type", query.type);
    if (query.pathway) params.set("pathway", query.pathway);
    if (query.topicId) params.set("topicId", query.topicId);
    if (query.subcategoryId) params.set("subcategoryId", query.subcategoryId);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.courseId) params.set("courseId", query.courseId);
    if (query.clientNeedId) params.set("clientNeedId", query.clientNeedId);
    if (query.difficulty !== undefined) params.set("difficulty", String(query.difficulty));
    if (query.status !== undefined) params.set("status", String(query.status));
    if (query.cognitiveLevel) params.set("cognitiveLevel", query.cognitiveLevel);
    if (query.clinicalJudgmentStep) params.set("clinicalJudgmentStep", query.clinicalJudgmentStep);
    if (query.authorId) params.set("authorId", query.authorId);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);

    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<AdminPaginatedQuestionsResponse>(`/api/v1/questions${qs}`, { session });
  },

  getQuestionById: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; question: AdminQuestionDetail }>(
      `/api/v1/questions/${encodeURIComponent(id)}`,
      { session }
    );
  },

  createQuestion: async (data: any, session?: VerifiedSession | null) => {
    return apiClient.post<{ success: boolean; question?: AdminQuestionDetail; error?: string }>(
      "/api/v1/questions",
      data,
      { session }
    );
  },

  updateQuestion: async (id: string, data: any, session?: VerifiedSession | null) => {
    return apiClient.put<{ success: boolean; question?: AdminQuestionDetail; error?: string }>(
      `/api/v1/questions/${encodeURIComponent(id)}`,
      data,
      { session }
    );
  },

  transitionStatus: async (
    id: string,
    data: { targetStatus: number; rejectionReason?: string; changeSummary?: string },
    session?: VerifiedSession | null
  ) => {
    return apiClient.post<{ success: boolean; question?: AdminQuestionDetail; error?: string }>(
      `/api/v1/questions/${encodeURIComponent(id)}/status`,
      data,
      { session }
    );
  },

  getQuestionVersions: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; versions: AdminQuestionVersion[] }>(
      `/api/v1/questions/${encodeURIComponent(id)}/versions`,
      { session }
    );
  },
};

export const adminCurriculumService = {
  getTree: async (activeOnly = false, session?: VerifiedSession | null) => {
    const qs = activeOnly ? "?activeOnly=true" : "";
    return apiClient.get<{ success: boolean; tree: AdminCurriculumTreeNode[] }>(
      `/api/v1/curriculum/tree${qs}`,
      { session }
    );
  },

  getClientNeeds: async (pathway?: string, activeOnly = false, session?: VerifiedSession | null) => {
    const params = new URLSearchParams();
    if (pathway) params.set("pathway", pathway);
    if (activeOnly) params.set("activeOnly", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ success: boolean; clientNeeds: AdminClientNeed[] }>(
      `/api/v1/client-needs${qs}`,
      { session }
    );
  },
};

// ── Phase 5 Analytics, Reporting & Operational Monitoring ──

export interface LearnerAnalyticsSummary {
  totalCompletedAttempts: number;
  totalPracticeQuestions: number;
  averageScorePercent: number;
  overallPassRate: number;
  totalDurationMinutes: number;
  lastAssessmentDate: string | null;
  currentReadinessTier: string;
}

export interface ClientNeedMastery {
  categoryCode: string;
  categoryName: string;
  totalAssessedQuestions: number;
  correctCount: number;
  accuracyPercent: number;
  isLowSample: boolean;
  performanceTier: string;
}

export interface TopicMastery {
  topicId: string;
  topicName: string;
  categoryName: string;
  domainName: string;
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number;
  isDeficiencyArea: boolean;
}

export interface ReadinessAttemptItem {
  attemptId: string;
  examTitle: string;
  scorePercent: number;
  readinessTier: string;
  completedAt: string;
  totalQuestions: number;
  durationMinutes: number;
}

export interface ReadinessTrend {
  latestTier: string;
  latestScorePercent: number | null;
  totalDiagnosticAttempts: number;
  attempts: ReadinessAttemptItem[];
}

export interface StudyRecommendation {
  id: string;
  title: string;
  description: string;
  category: "Remediation" | "Practice" | "Simulation";
  priority: "High" | "Medium" | "Low";
  targetClientNeedCode: string | null;
  actionHref: string | null;
}

export interface AdminOverviewMetrics {
  totalLearners: number;
  activeLearners: number;
  totalQuestions: number;
  publishedQuestions: number;
  reviewQueueCount: number;
  publishedExamsCount: number;
  totalCompletedAttempts: number;
  averageCohortScorePercent: number;
  activeEngagementRate: number;
}

export interface ScoreDistributionBucket {
  bucketLabel: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

export interface ExaminationAssessmentBreakdown {
  examinationId: string;
  code: string;
  title: string;
  pathway: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScorePercent: number;
  passRate: number;
  averageDurationMinutes: number;
}

export interface AssessmentReport {
  totalAttempts: number;
  completedAttempts: number;
  abandonedAttempts: number;
  completionRate: number;
  abandonmentRate: number;
  averageScorePercent: number;
  passRate: number;
  averageDurationMinutes: number;
  scoreDistribution: ScoreDistributionBucket[];
  examinationBreakdowns: ExaminationAssessmentBreakdown[];
}

export interface ExaminationRevisionReport {
  examinationId: string;
  code: string;
  title: string;
  revisionNumber: number;
  revisionId: string;
  lifecycleState: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScorePercent: number;
  passRate: number;
}

export interface DistractorSelection {
  optionKey: string;
  contentPreview: string;
  isCorrect: boolean;
  selectionCount: number;
  selectionRate: number;
}

export interface QuestionPerformance {
  questionId: string;
  code: string | null;
  stemPreview: string;
  pathway: string;
  questionTypeKey: string;
  difficulty: string;
  clientNeedCode: string | null;
  clientNeedName: string | null;
  timesDelivered: number;
  timesAnswered: number;
  correctResponseCount: number;
  correctResponseRate: number;
  averageTimeSpentSeconds: number;
  distractorAnalysis?: DistractorSelection[];
}

export interface OperationalHealth {
  status: "Healthy" | "Degraded" | "Unhealthy";
  databaseLatencyMs: number;
  databaseStatus: string;
  totalActiveSessions: number;
  activeUsers: number;
  serverUptime: string;
  committedMemoryMb: number;
  auditEventsLast24Hours: number;
  securityIncidentsLast24Hours: number;
  checkedAt: string;
}

export const learnerAnalyticsService = {
  getSummary: async (session: VerifiedSession, userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiClient.get<{ success: boolean; data: LearnerAnalyticsSummary }>(
      `/api/v1/learner/analytics/summary${qs}`,
      { session }
    );
  },

  getClientNeeds: async (session: VerifiedSession, userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiClient.get<{ success: boolean; data: ClientNeedMastery[] }>(
      `/api/v1/learner/analytics/client-needs${qs}`,
      { session }
    );
  },

  getCurriculum: async (session: VerifiedSession, userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiClient.get<{ success: boolean; data: TopicMastery[] }>(
      `/api/v1/learner/analytics/curriculum${qs}`,
      { session }
    );
  },

  getReadinessTrend: async (session: VerifiedSession, userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiClient.get<{ success: boolean; data: ReadinessTrend }>(
      `/api/v1/learner/analytics/readiness-trend${qs}`,
      { session }
    );
  },

  getRecommendations: async (session: VerifiedSession, userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiClient.get<{ success: boolean; data: StudyRecommendation[] }>(
      `/api/v1/learner/analytics/recommendations${qs}`,
      { session }
    );
  },
};

export const adminReportsService = {
  getOverview: async (session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; data: AdminOverviewMetrics }>(
      "/api/v1/admin/reports/overview",
      { session }
    );
  },

  getAssessments: async (
    params: { pathway?: string; examinationId?: string; status?: string; fromDate?: string; toDate?: string },
    session?: VerifiedSession | null
  ) => {
    const q = new URLSearchParams();
    if (params.pathway) q.set("pathway", params.pathway);
    if (params.examinationId) q.set("examinationId", params.examinationId);
    if (params.status) q.set("status", params.status);
    if (params.fromDate) q.set("fromDate", params.fromDate);
    if (params.toDate) q.set("toDate", params.toDate);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiClient.get<{ success: boolean; data: AssessmentReport }>(
      `/api/v1/admin/reports/assessments${qs}`,
      { session }
    );
  },

  getExaminationRevisions: async (examinationId: string, session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; data: ExaminationRevisionReport[] }>(
      `/api/v1/admin/reports/examinations/${encodeURIComponent(examinationId)}/revisions`,
      { session }
    );
  },

  getQuestionsPerformance: async (
    params: {
      pathway?: string;
      questionTypeKey?: string;
      difficulty?: string;
      clientNeedCode?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
    session?: VerifiedSession | null
  ) => {
    const q = new URLSearchParams();
    if (params.pathway) q.set("pathway", params.pathway);
    if (params.questionTypeKey) q.set("questionTypeKey", params.questionTypeKey);
    if (params.difficulty) q.set("difficulty", params.difficulty);
    if (params.clientNeedCode) q.set("clientNeedCode", params.clientNeedCode);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", params.page.toString());
    if (params.pageSize) q.set("pageSize", params.pageSize.toString());
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiClient.get<{ success: boolean; data: { totalCount: number; page: number; pageSize: number; items: QuestionPerformance[] } }>(
      `/api/v1/admin/reports/questions${qs}`,
      { session }
    );
  },

  getQuestionDetail: async (id: string, session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; data: QuestionPerformance }>(
      `/api/v1/admin/reports/questions/${encodeURIComponent(id)}`,
      { session }
    );
  },
};

export const adminMonitoringService = {
  getHealth: async (session?: VerifiedSession | null) => {
    return apiClient.get<{ success: boolean; data: OperationalHealth }>(
      "/api/v1/admin/monitoring/health",
      { session }
    );
  },
};



