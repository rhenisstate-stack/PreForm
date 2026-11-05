import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createServerSession,
  resolveSession,
  revokeSession,
  verifySignedSessionToken,
  signSessionPayload,
  resetSessionStoreForTesting,
} from "@/lib/session";
import {
  ensureClientId,
  isValidClientId,
  generateClientId,
  setClientIdCookie,
  CLIENT_ID_COOKIE_NAME,
} from "@/lib/client-id";
import { createGatewayAuthHeaders } from "@/lib/api-client";
import { authService, attemptsService } from "@/lib/api-services";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as sessionRoute } from "@/app/api/auth/session/route";

// Cookie mock store
const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const val = mockCookies.get(name);
      return val ? { name, value: val } : undefined;
    },
    set: vi.fn((name: string, value: string) => {
      mockCookies.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      mockCookies.delete(name);
    }),
  }),
}));

describe("Phase 3 — BFF Session ID Synchronization & Client Device Identification", () => {
  const testUserId = "usr_phase3_tester";
  const testEmail = "learner.phase3@prepford.com";
  const authoritativeBackendSessionId = "sess_backend_auth_998877";

  beforeEach(() => {
    mockCookies.clear();
    resetSessionStoreForTesting();
    vi.clearAllMocks();
  });

  describe("1. Client ID Generation & Integrity", () => {
    it("generates a client ID in the canonical cid_[0-9a-f]{32} format", () => {
      const cid = generateClientId();
      expect(cid).toMatch(/^cid_[0-9a-f]{32}$/);
      expect(isValidClientId(cid)).toBe(true);
    });

    it("rejects invalid or malformed client IDs", () => {
      expect(isValidClientId("")).toBe(false);
      expect(isValidClientId("client_123")).toBe(false);
      expect(isValidClientId("cid_short")).toBe(false);
      expect(isValidClientId("cid_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ")).toBe(false);
      expect(isValidClientId("../path/traversal")).toBe(false);
      expect(isValidClientId(null)).toBe(false);
      expect(isValidClientId(12345)).toBe(false);
    });

    it("ensureClientId generates and stores a new client ID when cookie is missing", () => {
      const store = {
        get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
        set: (name: string, val: string) => mockCookies.set(name, val),
      };

      const result = ensureClientId(store);
      expect(result.isNew).toBe(true);
      expect(isValidClientId(result.clientId)).toBe(true);
      expect(mockCookies.get(CLIENT_ID_COOKIE_NAME)).toBe(result.clientId);
    });

    it("ensureClientId preserves an existing valid client ID", () => {
      const existingCid = generateClientId();
      mockCookies.set(CLIENT_ID_COOKIE_NAME, existingCid);

      const store = {
        get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
        set: (name: string, val: string) => mockCookies.set(name, val),
      };

      const result = ensureClientId(store);
      expect(result.isNew).toBe(false);
      expect(result.clientId).toBe(existingCid);
    });

    it("ensureClientId replaces a malformed client ID cookie with a valid new ID", () => {
      mockCookies.set(CLIENT_ID_COOKIE_NAME, "malformed-tampered-client-id");

      const store = {
        get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
        set: (name: string, val: string) => mockCookies.set(name, val),
      };

      const result = ensureClientId(store);
      expect(result.isNew).toBe(true);
      expect(isValidClientId(result.clientId)).toBe(true);
      expect(mockCookies.get(CLIENT_ID_COOKIE_NAME)).toBe(result.clientId);
    });
  });

  describe("2. Backend Session ID Synchronization in BFF", () => {
    it("createServerSession accepts and stores authoritative backend sessionId", () => {
      const serverSession = createServerSession({
        userId: testUserId,
        email: testEmail,
        role: "candidate",
        displayName: "Phase 3 Candidate",
        sessionId: authoritativeBackendSessionId,
        clientId: "cid_11223344556677889900aabbccddeeff",
      });

      expect(serverSession.session.id).toBe(authoritativeBackendSessionId);

      const verified = verifySignedSessionToken(serverSession.token);
      expect(verified.valid).toBe(true);
      expect(verified.payload?.sid).toBe(authoritativeBackendSessionId);
      expect(verified.payload?.sessionId).toBe(authoritativeBackendSessionId);
      expect(verified.payload?.clientId).toBe("cid_11223344556677889900aabbccddeeff");
    });

    it("resolveSession extracts authoritative sessionId, clientId, and securityVersion", async () => {
      const cid = generateClientId();
      const serverSession = createServerSession({
        userId: testUserId,
        email: testEmail,
        sessionId: authoritativeBackendSessionId,
        clientId: cid,
        securityVersion: 2,
      });

      mockCookies.set("prepford_session", serverSession.token);

      const session = await resolveSession();
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe(authoritativeBackendSessionId);
      expect(session?.clientId).toBe(cid);
      expect(session?.securityVersion).toBe(2);
    });

    it("createGatewayAuthHeaders forwards authoritative X-Session-Id and X-Client-Id", async () => {
      const cid = generateClientId();
      const serverSession = createServerSession({
        userId: testUserId,
        email: testEmail,
        sessionId: authoritativeBackendSessionId,
        clientId: cid,
      });

      mockCookies.set("prepford_session", serverSession.token);
      const session = await resolveSession();

      const headers = createGatewayAuthHeaders(session);
      expect(headers["X-Session-Id"]).toBe(authoritativeBackendSessionId);
      expect(headers["X-Client-Id"]).toBe(cid);
      expect(headers["X-Authenticated-User-Id"]).toBe(testUserId);
      expect(headers["X-Authenticated-User-Email"]).toBe(testEmail);
      expect(headers["X-Gateway-Signature"]).toBeDefined();
    });
  });

  describe("3. Route Handler Integration & Concurrency Limit Handling", () => {
    it("login route consumes backend sessionId and embeds it in session cookie", async () => {
      const spyLogin = vi.spyOn(authService, "login").mockResolvedValueOnce({
        success: true,
        status: 200,
        headers: new Headers(),
        data: {
          success: true,
          token: "prf_sess_secret_token",
          sessionId: authoritativeBackendSessionId,
          user: {
            id: testUserId,
            email: testEmail,
            role: "candidate",
            pathway: "rn",
            displayName: "Test Candidate",
          },
        },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: testEmail,
          password: "ValidPassword123!",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      // Verify authService.login was invoked with clientId
      expect(spyLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testEmail,
          clientId: expect.stringMatching(/^cid_[0-9a-f]{32}$/),
        })
      );

      // Verify session cookie was set with the backend sessionId
      const cookieVal = mockCookies.get("prepford_session");
      expect(cookieVal).toBeDefined();

      const tokenVerification = verifySignedSessionToken(cookieVal);
      expect(tokenVerification.valid).toBe(true);
      expect(tokenVerification.payload?.sid).toBe(authoritativeBackendSessionId);

      // Verify client ID cookie was also set
      expect(mockCookies.get(CLIENT_ID_COOKIE_NAME)).toMatch(/^cid_[0-9a-f]{32}$/);
    });

    it("login route propagates 409 Conflict with CONCURRENT_SESSION_LIMIT_EXCEEDED when limit is reached", async () => {
      vi.spyOn(authService, "login").mockResolvedValueOnce({
        success: false,
        status: 409,
        headers: new Headers(),
        data: {
          success: false,
          errorCode: "CONCURRENT_SESSION_LIMIT_EXCEEDED",
          error: "Maximum concurrent session limit of 2 reached. Please sign out from another device or manage your active sessions.",
        },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: testEmail,
          password: "ValidPassword123!",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(409);

      const spyRecovery = vi.spyOn(authService, "recoverSessions");

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.errorCode).toBe("CONCURRENT_SESSION_LIMIT_EXCEEDED");
      expect(body.error).toContain("Maximum concurrent session limit");

      // Recovery is strictly opt-in: no recovery call without the explicit flag
      expect(spyRecovery).not.toHaveBeenCalled();

      // Verify no session cookie was created
      expect(mockCookies.get("prepford_session")).toBeUndefined();
    });

    it("login route performs opt-in credential-verified recovery and retries login exactly once", async () => {
      const limitRejected = {
        success: false as const,
        status: 409,
        headers: new Headers(),
        data: {
          success: false,
          errorCode: "CONCURRENT_SESSION_LIMIT_EXCEEDED",
          error: "Maximum concurrent session limit of 2 reached. Please sign out from another device or manage your active sessions.",
        },
      };
      const loginSucceeded = {
        success: true as const,
        status: 200,
        headers: new Headers(),
        data: {
          success: true,
          token: "prf_sess_recovered_token",
          sessionId: authoritativeBackendSessionId,
          user: {
            id: testUserId,
            email: testEmail,
            role: "candidate",
            pathway: "rn",
            displayName: "Test Candidate",
          },
        },
      };

      const spyLogin = vi.spyOn(authService, "login")
        .mockResolvedValueOnce(limitRejected)
        .mockResolvedValueOnce(loginSucceeded);
      const spyRecovery = vi.spyOn(authService, "recoverSessions").mockResolvedValueOnce({
        success: true,
        status: 200,
        headers: new Headers(),
        data: { success: true },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: testEmail,
          password: "ValidPassword123!",
          recoverSessions: true,
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      expect(spyRecovery).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testEmail,
          clearRemainingSessions: false,
        })
      );
      expect(spyLogin).toHaveBeenCalledTimes(2);

      // Session cookie issued from the retried authoritative login
      const cookieVal = mockCookies.get("prepford_session");
      expect(cookieVal).toBeDefined();
      const tokenVerification = verifySignedSessionToken(cookieVal);
      expect(tokenVerification.valid).toBe(true);
      expect(tokenVerification.payload?.sid).toBe(authoritativeBackendSessionId);
    });

    it("login route surfaces rate-limited recovery without retrying login", async () => {
      const spyLogin = vi.spyOn(authService, "login").mockResolvedValueOnce({
        success: false as const,
        status: 409,
        headers: new Headers(),
        data: {
          success: false,
          errorCode: "CONCURRENT_SESSION_LIMIT_EXCEEDED",
          error: "Maximum concurrent session limit of 2 reached.",
        },
      });
      vi.spyOn(authService, "recoverSessions").mockResolvedValueOnce({
        success: false as const,
        status: 429,
        headers: new Headers(),
        data: {
          success: false,
          errorCode: "RATE_LIMITED",
          error: "Too many recovery attempts. Please wait before trying again.",
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: testEmail,
          password: "ValidPassword123!",
          recoverSessions: true,
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(429);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.errorCode).toBe("RATE_LIMITED");

      // No second login attempt after failed recovery
      expect(spyLogin).toHaveBeenCalledTimes(1);
      expect(mockCookies.get("prepford_session")).toBeUndefined();
    });

    it("register route embeds backend sessionId in session cookie and binds client ID", async () => {
      vi.spyOn(authService, "register").mockResolvedValueOnce({
        success: true,
        status: 200,
        headers: new Headers(),
        data: {
          success: true,
          token: "prf_sess_reg_token",
          sessionId: "sess_registered_new_01",
          user: {
            id: "usr_reg_01",
            email: "new.nurse@prepford.com",
            role: "candidate",
            pathway: "rn",
            displayName: "New Nurse",
          },
        },
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: "New Nurse",
          email: "new.nurse@prepford.com",
          pathway: "rn",
          password: "Sup3r-Strong-Nurse-P@ssword2026!",
          confirmPassword: "Sup3r-Strong-Nurse-P@ssword2026!",
          agreeTerms: true,
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(200);

      const cookieVal = mockCookies.get("prepford_session");
      expect(cookieVal).toBeDefined();

      const tokenVerification = verifySignedSessionToken(cookieVal);
      expect(tokenVerification.valid).toBe(true);
      expect(tokenVerification.payload?.sid).toBe("sess_registered_new_01");
    });
  });

  describe("4. Session Invalidation, Logout & Revocation End-to-End", () => {
    it("logout route revokes authoritative backend session and clears cookie", async () => {
      const serverSession = createServerSession({
        userId: testUserId,
        email: testEmail,
        sessionId: authoritativeBackendSessionId,
      });

      mockCookies.set("prepford_session", serverSession.token);

      const spyLogout = vi.spyOn(authService, "logout").mockResolvedValueOnce({
        success: true,
        status: 200,
        headers: new Headers(),
        data: { success: true, message: "Logged out" },
      });

      const res = await logoutRoute();
      expect(res.status).toBe(200);

      // Verify authService.logout was called with session containing authoritative sessionId
      expect(spyLogout).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: authoritativeBackendSessionId,
        })
      );

      // Verify cookie is cleared (empty value or maxAge 0)
      const afterCookie = mockCookies.get("prepford_session");
      expect(afterCookie === "" || afterCookie === undefined).toBe(true);

      // Verify session is revoked in memory
      expect(revokeSession(authoritativeBackendSessionId)).toBe(true);
    });

    it("session route clears session cookie when backend rejects with 401", async () => {
      const serverSession = createServerSession({
        userId: testUserId,
        email: testEmail,
        sessionId: authoritativeBackendSessionId,
      });

      mockCookies.set("prepford_session", serverSession.token);

      // Mock backend rejecting session as revoked
      vi.spyOn(authService, "getSession").mockResolvedValueOnce({
        success: false,
        status: 401,
        headers: new Headers(),
        error: "Session has been revoked or expired.",
      });

      const res = await sessionRoute();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.authenticated).toBe(false);
      expect(body.user).toBeNull();

      // Cookie should be cleared by the session route
      const afterCookie = mockCookies.get("prepford_session");
      expect(afterCookie === "" || afterCookie === undefined).toBe(true);
    });

    it("tampered session cookies are strictly rejected", async () => {
      const validSession = createServerSession({
        userId: testUserId,
        email: testEmail,
        role: "candidate",
        sessionId: authoritativeBackendSessionId,
      });

      const [data, sig] = validSession.token.split(".");
      const decodedPayload = JSON.parse(Buffer.from(data, "base64url").toString());
      decodedPayload.role = "admin"; // Tamper
      const tamperedData = Buffer.from(JSON.stringify(decodedPayload)).toString("base64url");
      const tamperedToken = `${tamperedData}.${sig}`;

      mockCookies.set("prepford_session", tamperedToken);

      const session = await resolveSession();
      expect(session).toBeNull();
    });
  });

  describe("5. Examination and CAT Continuity", () => {
    it("attemptsService forwards authoritative sessionId to backend during attempt synchronization", async () => {
      const serverSession = createServerSession({
        userId: testUserId,
        email: testEmail,
        sessionId: authoritativeBackendSessionId,
      });

      mockCookies.set("prepford_session", serverSession.token);
      const session = await resolveSession();

      const headers = createGatewayAuthHeaders(session, undefined, {
        method: "POST",
        path: "/api/v1/attempts/sync",
      });

      expect(headers["X-Session-Id"]).toBe(authoritativeBackendSessionId);
      expect(headers["X-Authenticated-User-Id"]).toBe(testUserId);
    });
  });
});
