import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createGatewayAuthHeaders,
  getApiBaseUrl,
  getGatewaySecret,
  setMockApiHandler,
} from "@/lib/api-client";
import {
  authService,
  profileService,
  subscriptionService,
  checkoutService,
} from "@/lib/api-services";
import type { VerifiedSession } from "@/lib/session";
import crypto from "node:crypto";

describe("Phase 3 — Frontend API Client & Gateway Security Verification", () => {
  const dummySession: VerifiedSession = {
    sessionId: "sess_test_123",
    userId: "usr_nurse_sarah_789",
    email: "sarah.nurse@prepford.com",
    name: "Sarah Nurse, RN",
    displayName: "Sarah Nurse, RN",
    role: "candidate",
    pathway: "rn",
    activePlan: "NCLEX-RN Complete Preparation Plan",
    csrfToken: "csrf_token_abc_xyz",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  const adminSession: VerifiedSession = {
    sessionId: "sess_admin_456",
    userId: "usr_admin_elizabeth_001",
    email: "elizabeth.admin@prepford.com",
    name: "Elizabeth Administrator",
    displayName: "Elizabeth Administrator",
    role: "admin",
    pathway: "both",
    csrfToken: "csrf_token_admin_789",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    setMockApiHandler(null);
    vi.clearAllMocks();
  });

  describe("1. Gateway Mutual HMAC Authentication Header Generation", () => {
    it("generates valid HMAC-SHA256 signature matching ASP.NET Core PrepfordAuthHandler spec", () => {
      const headers = createGatewayAuthHeaders(dummySession, "corr_test_001");

      expect(headers["X-Correlation-Id"]).toBe("corr_test_001");
      expect(headers["X-Authenticated-User-Id"]).toBe("usr_nurse_sarah_789");
      expect(headers["X-Authenticated-User-Email"]).toBe("sarah.nurse@prepford.com");
      expect(headers["X-Authenticated-User-Role"]).toBe("candidate");
      expect(headers["X-Authenticated-User-Name"]).toBe("Sarah Nurse, RN");

      const secret = getGatewaySecret();
      const payload = `${dummySession.userId}|${dummySession.email}|${dummySession.role}`;
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex")
        .toLowerCase();

      expect(headers["X-Gateway-Signature"]).toBe(expectedSig);
    });

    it("generates unique correlation ID when none is provided", () => {
      const headersA = createGatewayAuthHeaders(dummySession);
      const headersB = createGatewayAuthHeaders(dummySession);

      expect(headersA["X-Correlation-Id"]).toMatch(/^corr_/);
      expect(headersB["X-Correlation-Id"]).toMatch(/^corr_/);
      expect(headersA["X-Correlation-Id"]).not.toBe(headersB["X-Correlation-Id"]);
    });

    it("resolves base URL defaulting to http://localhost:5000 or http://127.0.0.1:5000", () => {
      const baseUrl = getApiBaseUrl();
      expect(baseUrl).toMatch(/http:\/\/(localhost|127\.0\.0\.1):5000/);
    });
  });

  describe("2. Auth Service Dispatches to ASP.NET Core Endpoints", () => {
    it("authService.register dispatches to POST /api/v1/auth/register", async () => {
      let interceptedEndpoint = "";
      let interceptedBody: Record<string, unknown> | null = null;

      setMockApiHandler(async (endpoint, options) => {
        interceptedEndpoint = endpoint;
        interceptedBody = options.body ? JSON.parse(options.body as string) : null;
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            token: "jwt_token_sample",
            user: {
              id: "usr_cand_new_123",
              email: "new.candidate@prepford.com",
              displayName: "New Candidate",
              role: "candidate",
              pathway: "rn",
            },
          },
          headers: new Headers(),
        };
      });

      const res = await authService.register({
        fullName: "New Candidate",
        email: "new.candidate@prepford.com",
        pathway: "rn",
      });

      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/auth/register");
      expect((interceptedBody as any)?.email).toBe("new.candidate@prepford.com");
      expect((interceptedBody as any)?.displayName).toBe("New Candidate");
      expect((interceptedBody as any)?.pathway).toBe("rn");
    });

    it("authService.login dispatches to POST /api/v1/auth/login", async () => {
      let interceptedEndpoint = "";

      setMockApiHandler(async (endpoint) => {
        interceptedEndpoint = endpoint;
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            token: "token_login_xyz",
            user: {
              id: dummySession.userId,
              email: dummySession.email,
              displayName: dummySession.displayName,
              role: "candidate",
              pathway: "rn",
            },
          },
          headers: new Headers(),
        };
      });

      const res = await authService.login({
        email: dummySession.email,
        password: "ValidPassword123!",
        rememberMe: true,
      });

      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/auth/login");
    });

    it("authService.logout dispatches to POST /api/v1/auth/logout with gateway headers", async () => {
      let interceptedEndpoint = "";
      let interceptedHeaders: Headers | undefined;

      setMockApiHandler(async (endpoint, options) => {
        interceptedEndpoint = endpoint;
        interceptedHeaders = new Headers(options.headers);
        return {
          success: true,
          status: 200,
          data: { success: true, message: "Logged out successfully" },
          headers: new Headers(),
        };
      });

      const res = await authService.logout(dummySession);
      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/auth/logout");
      expect(interceptedHeaders?.get("X-Authenticated-User-Id")).toBe(dummySession.userId);
      expect(interceptedHeaders?.has("X-Gateway-Signature")).toBe(true);
    });
  });

  describe("3. Profile Service Dispatches to ASP.NET Core Endpoints", () => {
    it("profileService.getProfile dispatches to GET /api/v1/profile with gateway HMAC headers", async () => {
      let interceptedEndpoint = "";
      let authUserId = "";

      setMockApiHandler(async (endpoint, options) => {
        interceptedEndpoint = endpoint;
        const h = new Headers(options.headers);
        authUserId = h.get("X-Authenticated-User-Id") || "";
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            profile: {
              id: dummySession.userId,
              email: dummySession.email,
              displayName: dummySession.displayName,
              role: dummySession.role,
              pathway: dummySession.pathway,
              activePlan: dummySession.activePlan || "",
              targetExamDate: "2026-11-30",
              emailNotifications: true,
              studyReminders: true,
              hasProfileImage: false,
            },
          },
          headers: new Headers(),
        };
      });

      const res = await profileService.getProfile(dummySession);
      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/profile");
      expect(authUserId).toBe(dummySession.userId);
    });

    it("profileService.updateProfile dispatches to PUT /api/v1/profile with updated fields", async () => {
      let interceptedEndpoint = "";
      let interceptedBody: Record<string, unknown> | null = null;

      setMockApiHandler(async (endpoint, options) => {
        interceptedEndpoint = endpoint;
        interceptedBody = options.body ? JSON.parse(options.body as string) : null;
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            profile: {
              id: dummySession.userId,
              email: dummySession.email,
              displayName: "Sarah Nurse, MSN, RN",
              role: dummySession.role,
              pathway: dummySession.pathway,
              activePlan: dummySession.activePlan || "",
              targetExamDate: "2027-01-15",
              emailNotifications: false,
              studyReminders: false,
              hasProfileImage: false,
            },
          },
          headers: new Headers(),
        };
      });

      const res = await profileService.updateProfile(dummySession, {
        displayName: "Sarah Nurse, MSN, RN",
        targetExamDate: "2027-01-15",
        emailNotifications: false,
        studyReminders: false,
      });

      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/profile");
      expect((interceptedBody as any)?.displayName).toBe("Sarah Nurse, MSN, RN");
      expect((interceptedBody as any)?.targetExamDate).toBe("2027-01-15");
      expect((interceptedBody as any)?.emailNotifications).toBe(false);
      expect((interceptedBody as any)?.studyReminders).toBe(false);
    });
  });

  describe("4. Subscriptions & Admin Catalogue Dispatches", () => {
    it("subscriptionService.getActivePlans queries GET /api/v1/subscriptions without credentials", async () => {
      let interceptedEndpoint = "";

      setMockApiHandler(async (endpoint) => {
        interceptedEndpoint = endpoint;
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            count: 3,
            plans: [
              {
                id: "rn-pro",
                slug: "nclex-rn-pro",
                name: "NCLEX-RN Complete",
                description: "Full question bank",
                pathway: "RN",
                planType: "pro",
                price: 59,
                priceCents: 5900,
                currency: "USD",
                billingInterval: "month",
                features: ["QBank"],
                displayOrder: 1,
                isActive: true,
                entitlements: ["rn"],
              },
            ],
          },
          headers: new Headers(),
        };
      });

      const res = await subscriptionService.getActivePlans();
      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/subscriptions");
      expect(res.data?.plans.length).toBe(1);
    });

    it("subscriptionService.createPlan dispatches to POST /api/v1/admin/subscriptions with admin gateway headers", async () => {
      let interceptedEndpoint = "";
      let callerRole = "";

      setMockApiHandler(async (endpoint, options) => {
        interceptedEndpoint = endpoint;
        const h = new Headers(options.headers);
        callerRole = h.get("X-Authenticated-User-Role") || "";
        return {
          success: true,
          status: 201,
          data: {
            success: true,
            plan: {
              id: "rn-custom-plan",
              slug: "rn-custom-plan",
              name: "Custom Study Plan",
              description: "Custom study plan description",
              pathway: "RN",
              planType: "pro",
              price: 89,
              priceCents: 8900,
              currency: "USD",
              billingInterval: "month",
              features: ["QBank"],
              displayOrder: 5,
              isActive: true,
              entitlements: ["rn"],
            },
          },
          headers: new Headers(),
        };
      });

      const res = await subscriptionService.createPlan(adminSession, {
        name: "Custom Study Plan",
        slug: "rn-custom-plan",
        description: "Custom study plan description",
        pathway: "RN",
        planType: "pro",
        price: 89,
        billingInterval: "month",
        features: ["QBank"],
      });

      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/admin/subscriptions");
      expect(callerRole).toBe("admin");
    });
  });

  describe("5. Checkout & Entitlements Dispatches & Fail-Closed Behavior", () => {
    it("checkoutService.createCheckoutSession dispatches to POST /api/v1/checkout", async () => {
      let interceptedEndpoint = "";
      let interceptedBody: Record<string, unknown> | null = null;

      setMockApiHandler(async (endpoint, options) => {
        interceptedEndpoint = endpoint;
        interceptedBody = options.body ? JSON.parse(options.body as string) : null;
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            sessionId: "sim_ord_abc123",
            sessionUrl: "/dashboard?checkout=success",
            isSimulated: true,
            message: "Simulated sandbox transaction completed.",
          },
          headers: new Headers(),
        };
      });

      const res = await checkoutService.createCheckoutSession(dummySession, {
        planId: "rn-pro",
        pathway: "rn",
      });

      expect(res.success).toBe(true);
      expect(interceptedEndpoint).toBe("/api/v1/checkout");
      expect((interceptedBody as any)?.planId).toBe("rn-pro");
      expect((interceptedBody as any)?.pathway).toBe("rn");
    });

    it("returns fail-closed 503 error when backend API is unreachable", async () => {
      setMockApiHandler(async () => {
        return {
          success: false,
          status: 503,
          error: "Failed to communicate with backend API: Connection refused",
          headers: new Headers(),
        };
      });

      const res = await checkoutService.createCheckoutSession(dummySession, {
        planId: "rn-pro",
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(503);
      expect(res.error).toContain("Connection refused");
    });
  });
});
