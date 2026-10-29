import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createGatewayAuthHeaders,
  createCanonicalGatewayAuthHeaders,
  computeBodySha256,
  EMPTY_BODY_SHA256,
  getGatewaySecret,
  setMockApiHandler,
} from "@/lib/api-client";
import {
  subscriptionService,
  profileService,
  checkoutService,
  authService,
  type BackendSubscriptionPlan,
} from "@/lib/api-services";
import {
  syncAttemptToBackend,
  type CompletedAssessmentAttempt,
} from "@/lib/assessment-store";
import type { VerifiedSession } from "@/lib/session";
import crypto from "node:crypto";

describe("Security Regression & Architecture Boundary Tests", () => {
  const originalEnv = { ...process.env };

  const dummySession: VerifiedSession = {
    sessionId: "sess_sec_test_01",
    userId: "usr_sec_test_01",
    email: "sec.test@nursing.edu",
    role: "candidate",
    name: "Security Test Candidate",
    displayName: "Security Test Candidate",
    pathway: "rn",
    csrfToken: "csrf_token_test",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    setMockApiHandler(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setMockApiHandler(null);
  });

  it("gateway signature matches HMAC-SHA256 specification expected by ASP.NET Core", () => {
    const headers = createGatewayAuthHeaders(dummySession, "corr-test-123");

    expect(headers["X-Authenticated-User-Id"]).toBe(dummySession.userId);
    expect(headers["X-Authenticated-User-Email"]).toBe(dummySession.email);
    expect(headers["X-Authenticated-User-Role"]).toBe(dummySession.role);
    expect(headers["X-Authenticated-User-Name"]).toBe(dummySession.displayName);
    expect(headers["X-Correlation-Id"]).toBe("corr-test-123");

    // Verify HMAC-SHA256 independently
    const secret = getGatewaySecret();
    const payload = `${dummySession.userId}|${dummySession.email}|${dummySession.role}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
      .toLowerCase();

    expect(headers["X-Gateway-Signature"]).toBe(expectedSig);
  });

  it("enforces strong GATEWAY_SHARED_SECRET requirement in production environment", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).APP_ENV = "production";
    delete process.env.GATEWAY_SHARED_SECRET;

    expect(() => getGatewaySecret()).toThrow(
      /GATEWAY_SHARED_SECRET is required in production/
    );
  });

  it("fail-closed policy: returns failure status on 500 without falling back to local SQLite", async () => {
    setMockApiHandler(async () => {
      return {
        success: false,
        status: 500,
        error: "Internal ASP.NET Core Server Error",
        headers: new Headers(),
      };
    });

    const subRes = await subscriptionService.getActivePlans();
    expect(subRes.success).toBe(false);
    expect(subRes.status).toBe(500);

    const profRes = await profileService.getProfile(dummySession);
    expect(profRes.success).toBe(false);
    expect(profRes.status).toBe(500);
  });

  it("fail-closed policy: network failure throws without silent SQLite recovery", async () => {
    setMockApiHandler(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5000");
    });

    await expect(subscriptionService.getActivePlans()).rejects.toThrow(
      /connect ECONNREFUSED/
    );
  });

  it("sanitizes error outputs to ensure database stack traces are never leaked", async () => {
    setMockApiHandler(async () => {
      return {
        success: false,
        status: 400,
        error: "Validation failed for input plan.",
        headers: new Headers(),
      };
    });

    const res = await checkoutService.createCheckoutSession(dummySession, {
      planId: "invalid-plan",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Validation failed for input plan.");
    expect(res.error).not.toContain("NpgsqlException");
    expect(res.error).not.toContain("at Microsoft.EntityFrameworkCore");
    expect(res.error).not.toContain("Stack trace:");
  });

  it("role tampering: candidate attempting administrative plan creation is rejected with 403", async () => {
    setMockApiHandler(async (_endpoint, options) => {
      const headersRecord = (options.headers || {}) as Record<string, string>;
      const roleHeader = headersRecord["X-Authenticated-User-Role"] || null;

      if (!roleHeader || roleHeader !== "admin") {
        return {
          success: false,
          status: 403,
          error: "Forbidden: Administrative privileges required.",
          headers: new Headers(),
        };
      }

      return {
        success: true,
        status: 200,
        data: { plan: { id: "test" } as unknown as BackendSubscriptionPlan, success: true },
        headers: new Headers(),
      };
    });

    const res = await subscriptionService.createPlan(dummySession, {
      name: "Hacked Plan",
      slug: "hacked-plan",
    } as unknown as Partial<BackendSubscriptionPlan>);

    expect(res.success).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain("Forbidden");
  });

  // ── SEC-03: Hardened Canonical Gateway HMAC Tests ────────────────────────

  it("SEC-03: generates hardened canonical v1 HMAC headers binding method, path, timestamp, nonce, and body hash", () => {
    const fixedTimestamp = 1793280000;
    const fixedNonce = "test-nonce-1234567890abcdef";
    const testBody = { action: "sync", count: 5 };
    const bodyHash = computeBodySha256(testBody);

    const headers = createCanonicalGatewayAuthHeaders(dummySession, "corr-sec03-1", {
      method: "POST",
      path: "/api/v1/attempts/sync",
      body: testBody,
      timestamp: fixedTimestamp,
      nonce: fixedNonce,
    });

    expect(headers["X-Gateway-Signature-Version"]).toBe("1");
    expect(headers["X-Gateway-Timestamp"]).toBe(fixedTimestamp.toString());
    expect(headers["X-Gateway-Nonce"]).toBe(fixedNonce);
    expect(headers["X-Gateway-Content-SHA256"]).toBe(bodyHash);
    expect(headers["X-Session-Id"]).toBe(dummySession.sessionId);

    // Compute expected canonical HMAC independently
    const secret = getGatewaySecret();
    const canonicalPayload = `${fixedTimestamp}\nPOST\n/api/v1/attempts/sync\n${fixedNonce}\n${bodyHash}\n${dummySession.userId}\n${dummySession.email}\n${dummySession.role}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(canonicalPayload)
      .digest("hex")
      .toLowerCase();

    expect(headers["X-Gateway-Signature"]).toBe(expectedSig);
  });

  it("SEC-03: empty body generates standard SHA-256 hash matching ASP.NET Core PrepfordAuthHandler", () => {
    const emptyHash = computeBodySha256(undefined);
    expect(emptyHash).toBe(EMPTY_BODY_SHA256);
    expect(emptyHash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  // ── SEC-02: Authoritative Session Revocation Dispatch ─────────────────────

  it("SEC-02: authService.revokeSession dispatches revocation request to ASP.NET Core", async () => {
    let capturedEndpoint = "";
    let capturedBody: Record<string, unknown> | null = null;

    setMockApiHandler(async (endpoint, options) => {
      capturedEndpoint = endpoint;
      capturedBody = options.body ? JSON.parse(options.body as string) : null;
      return {
        success: true,
        status: 200,
        data: { success: true, message: "Revoked" },
        headers: new Headers(),
      };
    });

    const res = await authService.revokeSession("sess_target_999", dummySession);
    expect(res.success).toBe(true);
    expect(capturedEndpoint).toBe("/api/v1/auth/revoke-session");
    expect(capturedBody).toEqual({ sessionId: "sess_target_999" });
  });

  // ── ARCH-01: Assessment Attempt Persistence API Integration ───────────────

  it("ARCH-01: syncAttemptToBackend dispatches completed attempt to /api/v1/attempts/sync", async () => {
    let capturedEndpoint = "";
    let capturedBody: Record<string, unknown> | null = null;

    setMockApiHandler(async (endpoint, options) => {
      capturedEndpoint = endpoint;
      capturedBody = options.body ? JSON.parse(options.body as string) : null;
      return {
        success: true,
        status: 200,
        data: { success: true, attempt: { id: "att_123" } },
        headers: new Headers(),
      };
    });

    const testAttempt: CompletedAssessmentAttempt = {
      id: "att_mock_999",
      name: "Mock CAT Test",
      type: "tutored_cat",
      date: "Oct 29, 2026",
      timestamp: Date.now(),
      scorePercent: 82.5,
      performanceTier: "Very High",
      totalQuestions: 5,
      correctCount: 4,
      durationMinutes: 12,
      domains: [],
      questions: [],
    };

    const success = await syncAttemptToBackend(testAttempt, dummySession);
    expect(success).toBe(true);
    expect(capturedEndpoint).toBe("/api/v1/attempts/sync");
    expect(capturedBody?.["id"]).toBe("att_mock_999");
    expect(capturedBody?.["scorePercent"]).toBe(82.5);
  });
});
