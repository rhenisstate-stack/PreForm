import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResolveSession = vi.fn();

vi.mock("@/lib/session", () => ({
  resolveSession: (...args: unknown[]) => mockResolveSession(...args),
}));

const mockGetAvailableAssessments = vi.fn();
const mockGetAssessmentById = vi.fn();
const mockStartAttempt = vi.fn();
const mockGetAttempts = vi.fn();
const mockGetAttemptById = vi.fn();
const mockGetAttemptQuestions = vi.fn();
const mockSubmitResponse = vi.fn();
const mockSubmitAttempt = vi.fn();
const mockSyncAttempt = vi.fn();

vi.mock("@/lib/api-services", () => ({
  assessmentsService: {
    getAvailableAssessments: (...args: unknown[]) => mockGetAvailableAssessments(...args),
    getAssessmentById: (...args: unknown[]) => mockGetAssessmentById(...args),
  },
  attemptsService: {
    startAttempt: (...args: unknown[]) => mockStartAttempt(...args),
    getAttempts: (...args: unknown[]) => mockGetAttempts(...args),
    getAttemptById: (...args: unknown[]) => mockGetAttemptById(...args),
    getAttemptQuestions: (...args: unknown[]) => mockGetAttemptQuestions(...args),
    submitResponse: (...args: unknown[]) => mockSubmitResponse(...args),
    submitAttempt: (...args: unknown[]) => mockSubmitAttempt(...args),
    syncAttempt: (...args: unknown[]) => mockSyncAttempt(...args),
  },
}));

import { GET as getAvailableAssessmentsRoute } from "@/app/api/assessments/available/route";
import { GET as getAssessmentByIdRoute } from "@/app/api/assessments/[id]/route";
import { GET as getAttemptsRoute, POST as startAttemptRoute } from "@/app/api/attempts/route";
import { GET as getAttemptDetailRoute } from "@/app/api/attempts/[id]/route";
import { GET as getAttemptQuestionsRoute } from "@/app/api/attempts/[id]/questions/route";
import { POST as submitResponseRoute } from "@/app/api/attempts/[id]/responses/route";
import { POST as submitAttemptRoute } from "@/app/api/attempts/[id]/submit/route";
import { POST as syncAttemptRoute } from "@/app/api/attempts/sync/route";

describe("Phase 3 Assessment Delivery BFF Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validCandidateSession = {
    userId: "cand_123",
    email: "candidate@prepford.com",
    role: "candidate",
    pathway: "rn" as const,
  };

  describe("Authentication Gate Enforcement", () => {
    it("rejects unauthenticated requests to GET /api/assessments/available with 401", async () => {
      mockResolveSession.mockResolvedValueOnce(null);
      const req = new Request("http://localhost:3000/api/assessments/available");
      const res = await getAvailableAssessmentsRoute(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it("rejects unauthenticated requests to POST /api/attempts with 401", async () => {
      mockResolveSession.mockResolvedValueOnce(null);
      const req = new Request("http://localhost:3000/api/attempts", {
        method: "POST",
        body: JSON.stringify({ pathway: "rn" }),
      });
      const res = await startAttemptRoute(req);
      expect(res.status).toBe(401);
    });

    it("rejects unauthenticated requests to GET /api/attempts/[id] with 401", async () => {
      mockResolveSession.mockResolvedValueOnce(null);
      const req = new Request("http://localhost:3000/api/attempts/att_1");
      const res = await getAttemptDetailRoute(req, { params: Promise.resolve({ id: "att_1" }) });
      expect(res.status).toBe(401);
    });

    it("rejects unauthenticated requests to POST /api/attempts/[id]/responses with 401", async () => {
      mockResolveSession.mockResolvedValueOnce(null);
      const req = new Request("http://localhost:3000/api/attempts/att_1/responses", {
        method: "POST",
        body: JSON.stringify({ questionId: "q1", selectedOptionIndices: [0] }),
      });
      const res = await submitResponseRoute(req, { params: Promise.resolve({ id: "att_1" }) });
      expect(res.status).toBe(401);
    });

    it("rejects unauthenticated requests to POST /api/attempts/[id]/submit with 401", async () => {
      mockResolveSession.mockResolvedValueOnce(null);
      const req = new Request("http://localhost:3000/api/attempts/att_1/submit", {
        method: "POST",
      });
      const res = await submitAttemptRoute(req, { params: Promise.resolve({ id: "att_1" }) });
      expect(res.status).toBe(401);
    });
  });

  describe("Authenticated Assessment Discovery & Delivery", () => {
    it("GET /api/assessments/available queries assessments for authenticated candidate", async () => {
      mockResolveSession.mockResolvedValueOnce(validCandidateSession);
      mockGetAvailableAssessments.mockResolvedValueOnce({
        success: true,
        status: 200,
        data: {
          success: true,
          pathway: "rn",
          assessments: [
            {
              id: "exam_rn_rat",
              title: "NCLEX-RN Comprehensive Readiness Assessment",
              examType: "DiagnosticReadiness",
              questionCount: 65,
              hasActiveAttempt: false,
            },
          ],
        },
      });

      const req = new Request("http://localhost:3000/api/assessments/available?pathway=rn");
      const res = await getAvailableAssessmentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.assessments).toHaveLength(1);
      expect(json.assessments[0].id).toBe("exam_rn_rat");
      expect(mockGetAvailableAssessments).toHaveBeenCalledWith(validCandidateSession, "rn");
    });

    it("POST /api/attempts starts a new attempt or resumes in-progress assessment", async () => {
      mockResolveSession.mockResolvedValueOnce(validCandidateSession);
      mockStartAttempt.mockResolvedValueOnce({
        success: true,
        status: 201,
        data: {
          success: true,
          attemptId: "att_active_123",
          examId: "exam_rn_cat",
          startedAt: "2026-11-05T12:00:00Z",
          resumed: false,
          questionCount: 5,
        },
      });

      const req = new Request("http://localhost:3000/api/attempts", {
        method: "POST",
        body: JSON.stringify({ pathway: "rn", testType: "tutored_cat", questionCount: 5 }),
      });
      const res = await startAttemptRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.attemptId).toBe("att_active_123");
      expect(json.resumed).toBe(false);
    });

    it("GET /api/attempts/[id]/questions returns candidate safe question delivery list", async () => {
      mockResolveSession.mockResolvedValueOnce(validCandidateSession);
      mockGetAttemptQuestions.mockResolvedValueOnce({
        success: true,
        status: 200,
        data: {
          success: true,
          questions: [
            {
              id: "q_cand_1",
              questionNumber: 1,
              stem: "A client with COPD presents with dyspnea...",
              questionType: "single_choice",
              options: [
                { id: "opt_1", index: 0, text: "Administer high-flow O2" },
                { id: "opt_2", index: 1, text: "Assess lung sounds and O2 saturation" },
              ],
            },
          ],
        },
      });

      const req = new Request("http://localhost:3000/api/attempts/att_123/questions");
      const res = await getAttemptQuestionsRoute(req, { params: Promise.resolve({ id: "att_123" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.questions).toHaveLength(1);
      expect(json.questions[0].stem).toContain("COPD");
      // Answer keys must not be present in candidate delivery
      expect(json.questions[0].correctAnswerIndices).toBeUndefined();
    });

    it("POST /api/attempts/[id]/responses records a candidate response", async () => {
      mockResolveSession.mockResolvedValueOnce(validCandidateSession);
      mockSubmitResponse.mockResolvedValueOnce({
        success: true,
        status: 200,
        data: {
          success: true,
          message: "Response saved successfully.",
        },
      });

      const req = new Request("http://localhost:3000/api/attempts/att_123/responses", {
        method: "POST",
        body: JSON.stringify({
          questionId: "q_cand_1",
          selectedOptionIndices: [1],
          timeSpentSeconds: 45,
        }),
      });
      const res = await submitResponseRoute(req, { params: Promise.resolve({ id: "att_123" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockSubmitResponse).toHaveBeenCalledWith(
        "att_123",
        { questionId: "q_cand_1", selectedOptionIndices: [1], timeSpentSeconds: 45 },
        validCandidateSession
      );
    });

    it("POST /api/attempts/[id]/submit finalizes and grades an attempt", async () => {
      mockResolveSession.mockResolvedValueOnce(validCandidateSession);
      mockSubmitAttempt.mockResolvedValueOnce({
        success: true,
        status: 200,
        data: {
          success: true,
          attemptId: "att_123",
          scorePercent: 80,
          passed: true,
          performanceTier: "Very High",
          totalQuestions: 5,
          correctCount: 4,
          completedAt: "2026-11-05T12:30:00Z",
        },
      });

      const req = new Request("http://localhost:3000/api/attempts/att_123/submit", {
        method: "POST",
      });
      const res = await submitAttemptRoute(req, { params: Promise.resolve({ id: "att_123" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.performanceTier).toBe("Very High");
      expect(json.scorePercent).toBe(80);
      expect(mockSubmitAttempt).toHaveBeenCalledWith("att_123", validCandidateSession);
    });

    it("POST /api/attempts/sync synchronizes an attempt for offline resilience", async () => {
      mockResolveSession.mockResolvedValueOnce(validCandidateSession);
      mockSyncAttempt.mockResolvedValueOnce({
        success: true,
        status: 200,
        data: {
          success: true,
          attempt: {
            id: "att_sync_1",
            scorePercent: 85,
            status: "Completed",
          },
        },
      });

      const req = new Request("http://localhost:3000/api/attempts/sync", {
        method: "POST",
        body: JSON.stringify({
          id: "att_sync_1",
          scorePercent: 85,
        }),
      });
      const res = await syncAttemptRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.attempt.id).toBe("att_sync_1");
    });
  });
});
