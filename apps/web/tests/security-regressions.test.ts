import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createGatewayAuthHeaders,
  getGatewaySecret,
  setMockApiHandler,
} from "@/lib/api-client";
import {
  subscriptionService,
  profileService,
  checkoutService,
  type BackendSubscriptionPlan,
} from "@/lib/api-services";
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
});
