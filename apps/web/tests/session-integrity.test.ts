import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  signSessionPayload,
  verifySignedSessionToken,
  createServerSession,
  resolveSession,
  revokeSession,
  revokeAllUserSessions,
  createSignedTestSession,
  verifyAdminAuth,
} from "@/lib/session";
import {
  getAppEnvironment,
  isSandboxCheckoutPermitted,
  createAuthoritativeCheckoutSession,
} from "@/lib/payment-provider";
import { resetProfileDatabaseForTesting, upsertUserProfileMeta } from "@/lib/profile-image-db";
import type { NextRequest } from "next/server";
import { GET as getAdminSubscriptions } from "@/app/api/admin/subscriptions/route";
import { GET as getProfileImage } from "@/app/api/profile/image/route";

let mockPrepfordCookieValue: string | undefined = undefined;
let mockLegacyCookieValue: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "prepford_session" && mockPrepfordCookieValue) {
        return { name: "prepford_session", value: mockPrepfordCookieValue };
      }
      if (name === "preform_session" && mockLegacyCookieValue) {
        return { name: "preform_session", value: mockLegacyCookieValue };
      }
      return undefined;
    },
    set: vi.fn((name: string, val: string) => {
      if (name === "prepford_session") {
        mockPrepfordCookieValue = val;
      } else if (name === "preform_session") {
        mockLegacyCookieValue = val;
      }
    }),
    delete: vi.fn((name: string) => {
      if (name === "prepford_session") {
        mockPrepfordCookieValue = undefined;
      } else if (name === "preform_session") {
        mockLegacyCookieValue = undefined;
      }
    }),
  }),
}));

describe("Phase 1 & 2 — Session Integrity & Server-Side Authorization Hardening", () => {
  const candidateEmail = "jane.security@nursing.edu";
  const candidateUserId = "usr_jane_sec_001";

  beforeEach(() => {
    resetProfileDatabaseForTesting();
    mockPrepfordCookieValue = undefined;
    mockLegacyCookieValue = undefined;
    vi.clearAllMocks();

    upsertUserProfileMeta({
      userId: candidateUserId,
      email: candidateEmail,
      displayName: "Jane Security",
      pathway: "rn",
      activePlan: "NCLEX-RN Complete Preparation Plan",
    });
  });

  it("1. rejects missing or empty session token with valid: false", () => {
    expect(verifySignedSessionToken(undefined).valid).toBe(false);
    expect(verifySignedSessionToken("").valid).toBe(false);
    expect(verifySignedSessionToken("   ").valid).toBe(false);
  });

  it("2. rejects unsigned or malformed session cookies (no dot separator)", () => {
    const rawJson = JSON.stringify({ role: "admin", email: "hacker@evil.com" });
    const result = verifySignedSessionToken(rawJson);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsigned or malformed");
  });

  it("3. rejects tampered payload with invalid HMAC signature", () => {
    const validToken = signSessionPayload({
      sub: candidateUserId,
      email: candidateEmail,
      role: "candidate",
    });

    const [, sig] = validToken.split(".");
    // Attacker modifies data to claim admin role while keeping original signature
    const tamperedPayload = {
      sub: candidateUserId,
      email: candidateEmail,
      role: "admin", // escalated!
    };
    const tamperedData = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url");
    const tamperedToken = `${tamperedData}.${sig}`;

    const result = verifySignedSessionToken(tamperedToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid or tampered session signature");
  });

  it("4. rejects expired session tokens", () => {
    const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour in past
    const expiredToken = signSessionPayload({
      sub: candidateUserId,
      email: candidateEmail,
      role: "candidate",
      exp: expiredTime,
      expiresAt: new Date(Date.now() - 3600000).toISOString(),
    });

    const result = verifySignedSessionToken(expiredToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("5. rejects revoked sessions in server database", () => {
    const created = createServerSession({
      userId: candidateUserId,
      email: candidateEmail,
      role: "candidate",
    });

    // Revoke the session explicitly
    const revoked = revokeSession(created.session.id);
    expect(revoked).toBe(true);

    // Set cookie to revoked session token
    mockPrepfordCookieValue = created.token;

    // Verifying admin or resolving session must return null/401
    const req = new Request("http://localhost/api/admin/subscriptions", {
      headers: { cookie: `preform_session=${encodeURIComponent(created.token)}` },
    });

    return verifyAdminAuth(req).then((authResult) => {
      expect(authResult.authorized).toBe(false);
      expect(authResult.status).toBe(401);
      expect(authResult.error).toContain("revoked");
    });
  });

  it("6. revokes all user sessions on security events (password change / account reset)", () => {
    const session1 = createServerSession({ userId: candidateUserId, email: candidateEmail });
    const session2 = createServerSession({ userId: candidateUserId, email: candidateEmail });

    expect(session1.session.id).not.toBe(session2.session.id);

    const revokedCount = revokeAllUserSessions(candidateUserId);
    expect(revokedCount).toBe(true);
  });

  it("7. prevents candidate from becoming admin by forging cookie (401 for unsigned, 403 for candidate)", async () => {
    // A: Attacker attempts raw unsigned JSON with role: "admin"
    const forgedUnsigned = JSON.stringify({ role: "admin", email: "attacker@evil.com" });
    const reqA = new Request("http://localhost/api/admin/subscriptions", {
      headers: { cookie: `preform_session=${encodeURIComponent(forgedUnsigned)}` },
    });
    const resA = await getAdminSubscriptions(reqA);
    expect(resA.status).toBe(401); // Unsigned admin claim strictly rejected

    // B: Attacker attempts candidate signed session against admin endpoint
    const validCandidateToken = createSignedTestSession({
      sub: candidateUserId,
      email: candidateEmail,
      role: "candidate",
    });
    const reqB = new Request("http://localhost/api/admin/subscriptions", {
      headers: { cookie: `preform_session=${encodeURIComponent(validCandidateToken)}` },
    });
    const resB = await getAdminSubscriptions(reqB);
    expect(resB.status).toBe(403); // Verified candidate cannot access admin
  });

  it("8. permits legitimate signed admin session to access administrative endpoints (200 OK)", async () => {
    const validAdminToken = createSignedTestSession({
      sub: "admin_user_001",
      email: "admin@prepford.com",
      role: "admin",
    });

    const req = new Request("http://localhost/api/admin/subscriptions", {
      headers: { cookie: `preform_session=${encodeURIComponent(validAdminToken)}` },
    });
    const res = await getAdminSubscriptions(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("9. prevents candidate from viewing another user's private profile image (403 Forbidden)", async () => {
    const aliceToken = createSignedTestSession({
      sub: "usr_alice",
      email: "alice@nursing.edu",
      role: "candidate",
    });

    mockSessionCookieValue = aliceToken;

    // Alice attempts to fetch Bob's image
    const req = new Request("http://localhost/api/profile/image?userId=usr_bob&email=bob@nursing.edu");
    const res = await getProfileImage(req as unknown as NextRequest);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("cannot access another user's profile image");
  });

  it("10. prevents candidate from granting paid pathway in cookie (authoritative DB resolution)", async () => {
    // Attacker crafts signed cookie claiming pathway: "both"
    const forgedPathwayToken = createSignedTestSession({
      sub: candidateUserId,
      email: candidateEmail,
      role: "candidate",
      pathway: "both", // tampered entitlement claim in cookie
    });

    mockSessionCookieValue = forgedPathwayToken;

    // Call GET /api/profile
    const session = await resolveSession();
    // Authoritative pathway must come from database (which is "rn")
    expect(session?.pathway).toBe("rn");
  });
});

describe("Phase 4 — Staging Mock Checkout Isolation & Production Safety", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("1. production environment ALWAYS rejects mock checkout even if ENABLE_MOCK_CHECKOUT='true'", () => {
    process.env.APP_ENV = "production";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ENABLE_MOCK_CHECKOUT = "true";
    process.env.NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT = "true";

    expect(getAppEnvironment()).toBe("production");
    expect(isSandboxCheckoutPermitted()).toBe(false);
  });

  it("2. staging environment requires explicit opt-in ENABLE_MOCK_CHECKOUT='true'", () => {
    process.env.APP_ENV = "staging";
    delete process.env.ENABLE_MOCK_CHECKOUT;
    delete process.env.NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT;

    expect(getAppEnvironment()).toBe("staging");
    // Without flag: fails closed!
    expect(isSandboxCheckoutPermitted()).toBe(false);

    // With explicit flag: permits mock checkout in staging
    process.env.ENABLE_MOCK_CHECKOUT = "true";
    expect(isSandboxCheckoutPermitted()).toBe(true);
  });

  it("3. development and test environments permit mock checkout for local QA", () => {
    process.env.APP_ENV = "development";
    expect(isSandboxCheckoutPermitted()).toBe(true);

    process.env.APP_ENV = "test";
    expect(isSandboxCheckoutPermitted()).toBe(true);
  });

  it("4. createAuthoritativeCheckoutSession labels sandbox results as simulated", async () => {
    process.env.APP_ENV = "staging";
    process.env.ENABLE_MOCK_CHECKOUT = "true";

    const plan = {
      id: "rn-pro",
      name: "NCLEX-RN Complete Preparation",
      price: 59,
      priceCents: 5900,
      currency: "USD",
      pathway: "rn" as const,
      billingInterval: "month",
      isActive: true,
    };

    const result = await createAuthoritativeCheckoutSession(
      {
        planId: "rn-pro",
        candidateUserId: "cand_123",
        candidateEmail: "cand@test.com",
        candidateName: "Test Candidate",
      },
      plan
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe("sandbox_completed");
    expect(result.isSimulated).toBe(true);
    expect(result.simulationNotice).toContain("SIMULATED CHECKOUT");
  });

  it("5. createAuthoritativeCheckoutSession fails closed in production with pending_provider", async () => {
    process.env.APP_ENV = "production";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ENABLE_MOCK_CHECKOUT = "true"; // Attempted mistake in prod config

    const plan = {
      id: "rn-pro",
      name: "NCLEX-RN Complete Preparation",
      price: 59,
      priceCents: 5900,
      currency: "USD",
      pathway: "rn" as const,
      billingInterval: "month",
      isActive: true,
    };

    const result = await createAuthoritativeCheckoutSession(
      {
        planId: "rn-pro",
        candidateUserId: "cand_123",
        candidateEmail: "cand@test.com",
        candidateName: "Test Candidate",
      },
      plan
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe("pending_provider");
    expect(result.error).toContain("Direct online checkout is temporarily disabled in production");
    expect(result.isSimulated).toBe(false);
  });
});
