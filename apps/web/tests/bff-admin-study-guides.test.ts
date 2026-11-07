import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PUT, PATCH, DELETE } from "@/app/api/admin/study-guides/[[...path]]/route";
import { apiClient } from "@/lib/api-client";
import { resolveSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  resolveSession: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function createMockRequest(
  url: string,
  method: string = "GET",
  body?: unknown
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
    },
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(new URL(url, "http://localhost:3000").toString(), init) as unknown as NextRequest;
}

describe("BFF Admin Study Guides Proxy ([...path])", () => {
  const adminSession = {
    userId: "usr_admin_01",
    email: "admin@prepford.test",
    role: "admin",
    displayName: "Admin Instructor",
  };

  const contentManagerSession = {
    userId: "usr_cm_01",
    email: "cm@prepford.test",
    role: "content_manager",
    displayName: "Content Curator",
  };

  const learnerSession = {
    userId: "usr_learner_01",
    email: "learner@prepford.test",
    role: "candidate",
    displayName: "Test Candidate",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication & RBAC Enforcement", () => {
    it("returns 401 when session is not authenticated", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(null);
      const req = createMockRequest("/api/admin/study-guides/topic-quizzes");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes"] }) };

      const res = await GET(req, ctx);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Authentication required");
    });

    it("returns 403 when user is a learner/candidate", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(learnerSession as any);
      const req = createMockRequest("/api/admin/study-guides/topic-quizzes");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes"] }) };

      const res = await GET(req, ctx);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Administrative authorization required");
    });

    it("permits Content Managers to access study guide endpoints", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(contentManagerSession as any);
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        status: 200,
        success: true,
        data: { success: true, count: 2, quizzes: [] },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes"] }) };

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
      expect(apiClient.get).toHaveBeenCalledWith(
        "/api/v1/admin/study-guides/topic-quizzes",
        { session: contentManagerSession }
      );
    });

    it("permits Admins to access study guide endpoints", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        status: 200,
        success: true,
        data: { success: true, count: 1, quizzes: [] },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes"] }) };

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
    });
  });

  describe("HTTP Method Forwarding Matrix", () => {
    it("handles GET and preserves query parameters", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        status: 200,
        success: true,
        data: { success: true, analytics: { totalQuizzes: 10 } },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes/analytics?programme=rn&from=2026-01-01");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes", "analytics"] }) };

      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
      expect(apiClient.get).toHaveBeenCalledWith(
        "/api/v1/admin/study-guides/topic-quizzes/analytics?programme=rn&from=2026-01-01",
        { session: adminSession }
      );
    });

    it("handles POST with JSON payload", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      const payload = { title: "Pharmacology Quiz", programme: "rn", questionCount: 10 };
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        status: 201,
        success: true,
        data: { success: true, quiz: { id: "q1", ...payload } },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes", "POST", payload);
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes"] }) };

      const res = await POST(req, ctx);
      expect(res.status).toBe(201);
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/admin/study-guides/topic-quizzes",
        payload,
        { session: adminSession }
      );
    });

    it("handles POST with empty body (e.g. duplicate action)", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        status: 200,
        success: true,
        data: { success: true, quiz: { id: "q1_copy", title: "Copy" } },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes/q1/duplicate", "POST");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes", "q1", "duplicate"] }) };

      const res = await POST(req, ctx);
      expect(res.status).toBe(200);
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/admin/study-guides/topic-quizzes/q1/duplicate",
        undefined,
        { session: adminSession }
      );
    });

    it("handles PUT with JSON payload", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      const payload = { title: "Updated Quiz Title", status: "Published" };
      vi.mocked(apiClient.put).mockResolvedValueOnce({
        status: 200,
        success: true,
        data: { success: true, quiz: { id: "q1", ...payload } },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes/q1", "PUT", payload);
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes", "q1"] }) };

      const res = await PUT(req, ctx);
      expect(res.status).toBe(200);
      expect(apiClient.put).toHaveBeenCalledWith(
        "/api/v1/admin/study-guides/topic-quizzes/q1",
        payload,
        { session: adminSession }
      );
    });

    it("handles PATCH with JSON payload", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      const payload = { status: "Archived" };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        status: 200,
        success: true,
        data: { success: true, quiz: { id: "q1", status: "Archived" } },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes/q1", "PATCH", payload);
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes", "q1"] }) };

      const res = await PATCH(req, ctx);
      expect(res.status).toBe(200);
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/api/v1/admin/study-guides/topic-quizzes/q1",
        payload,
        { session: adminSession }
      );
    });

    it("handles DELETE requests", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        status: 200,
        success: true,
        data: { success: true, message: "Deleted" },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes/q1", "DELETE");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes", "q1"] }) };

      const res = await DELETE(req, ctx);
      expect(res.status).toBe(200);
      expect(apiClient.delete).toHaveBeenCalledWith(
        "/api/v1/admin/study-guides/topic-quizzes/q1",
        { session: adminSession }
      );
    });
  });

  describe("Validation & Error Handling", () => {
    it("returns 400 when an invalid path segment is provided", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      const req = createMockRequest("/api/admin/study-guides/../../etc/passwd");
      const ctx = { params: Promise.resolve({ path: ["..", "..", "etc", "passwd"] }) };

      const res = await GET(req, ctx);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid admin endpoint");
    });

    it("returns 400 when malformed JSON is posted", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      const req = new Request("http://localhost:3000/api/admin/study-guides/topic-quizzes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ this is invalid json }",
      }) as unknown as NextRequest;
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes"] }) };

      const res = await POST(req, ctx);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Request body must be valid JSON");
    });

    it("propagates backend status codes (e.g. 404 Not Found)", async () => {
      vi.mocked(resolveSession).mockResolvedValueOnce(adminSession as any);
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        status: 404,
        success: false,
        data: { success: false, error: "Topic quiz not found." },
        headers: new Headers(),
      });

      const req = createMockRequest("/api/admin/study-guides/topic-quizzes/nonexistent");
      const ctx = { params: Promise.resolve({ path: ["topic-quizzes", "nonexistent"] }) };

      const res = await GET(req, ctx);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Topic quiz not found.");
    });
  });
});
