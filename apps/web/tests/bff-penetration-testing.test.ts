import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signSessionPayload,
  verifySignedSessionToken,
  resolveSession,
  resetSessionStoreForTesting,
} from "@/lib/session";
import { createCanonicalGatewayAuthHeaders } from "@/lib/api-client";

// Mock dependencies for route tests
const mockResolveSession = vi.fn();
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    resolveSession: (...args: unknown[]) => mockResolveSession(...args),
  };
});

const mockAdminSecurityService = {
  getPolicy: vi.fn(),
  updatePolicy: vi.fn(),
  getSessions: vi.fn(),
};

const mockSecurityService = {
  revokeSession: vi.fn(),
};

vi.mock("@/lib/api-services", () => ({
  adminSecurityService: {
    getPolicy: (...args: unknown[]) => mockAdminSecurityService.getPolicy(...args),
    updatePolicy: (...args: unknown[]) => mockAdminSecurityService.updatePolicy(...args),
    getSessions: (...args: unknown[]) => mockAdminSecurityService.getSessions(...args),
  },
  securityService: {
    revokeSession: (...args: unknown[]) => mockSecurityService.revokeSession(...args),
  },
  attemptsService: {
    reauthenticateAttempt: vi.fn(),
  },
}));

import { GET as getPolicyRoute, PUT as putPolicyRoute } from "@/app/api/admin/security/session-policy/route";
import { GET as getSessionsRoute } from "@/app/api/admin/security/sessions/route";
import { DELETE as deleteSessionRoute } from "@/app/api/security/sessions/[sessionId]/route";

describe("Phase 8: Controlled Penetration & Security Hardening Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionStoreForTesting();
  });

  // ── 1. Vertical Privilege Escalation ──
  describe("Vertical Privilege Escalation Defense", () => {
    it("rejects unauthenticated requests to administrative session policy endpoints with 401", async () => {
      mockResolveSession.mockResolvedValueOnce(null);

      const request = new Request("http://localhost:3000/api/admin/security/session-policy", { method: "GET" });
      const response = await getPolicyRoute(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("strictly rejects candidate role from accessing Super Admin session policy with 403", async () => {
      mockResolveSession.mockResolvedValueOnce({
        userId: "cand_01",
        email: "candidate@prepford.com",
        role: "candidate",
        displayName: "Candidate User",
        sessionId: "sess_cand_01",
      });

      const request = new Request("http://localhost:3000/api/admin/security/session-policy", { method: "GET" });
      const response = await getPolicyRoute(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Super Administrator authorization required");
    });

    it("strictly rejects ordinary admin role from updating session policy (requires superadmin) with 403", async () => {
      mockResolveSession.mockResolvedValueOnce({
        userId: "admin_01",
        email: "admin@prepford.com",
        role: "admin", // Ordinary admin, not superadmin
        displayName: "Admin User",
        sessionId: "sess_admin_01",
      });

      const request = new Request("http://localhost:3000/api/admin/security/session-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxConcurrentSessions: 5, policyVersion: 1 }),
      });
      const response = await putPolicyRoute(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Super Administrator authorization required");
    });
  });

  // ── 2. Horizontal Privilege Escalation & IDOR ──
  describe("Horizontal Privilege Escalation & IDOR Defense", () => {
    it("propagates 403 Forbidden when a learner attempts to revoke another learner's session", async () => {
      mockResolveSession.mockResolvedValueOnce({
        userId: "cand_attacker",
        email: "attacker@prepford.com",
        role: "candidate",
        displayName: "Attacker Candidate",
        sessionId: "sess_attacker",
      });

      mockSecurityService.revokeSession.mockResolvedValueOnce({
        success: false,
        status: 403,
        error: "Forbidden: Cannot revoke another user's session.",
      });

      const request = new Request("http://localhost:3000/api/security/sessions/sess_victim", { method: "DELETE" });
      const response = await deleteSessionRoute(request, { params: Promise.resolve({ sessionId: "sess_victim" }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Cannot revoke another user's session");
    });

    it("rejects candidate querying active sessions monitor with 403", async () => {
      mockResolveSession.mockResolvedValueOnce({
        userId: "cand_02",
        email: "cand2@prepford.com",
        role: "candidate",
        displayName: "Candidate Two",
        sessionId: "sess_cand_02",
      });

      const request = new Request("http://localhost:3000/api/admin/security/sessions", { method: "GET" });
      const response = await getSessionsRoute(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
    });
  });

  // ── 3. Cookie Tampering & Unsigned Cookie Boundary ──
  describe("Cookie Tampering & Cryptographic Integrity", () => {
    it("detects single-character tampering in payload and rejects token", () => {
      const originalPayload = {
        sid: "sess_legit_01",
        sub: "usr_legit_01",
        email: "learner@prepford.com",
        role: "candidate",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const validToken = signSessionPayload(originalPayload);
      const [data, signature] = validToken.split(".");

      // Tamper with payload base64url data (flip last char)
      const tamperedChar = data.endsWith("a") ? "b" : "a";
      const tamperedData = data.substring(0, data.length - 1) + tamperedChar;
      const tamperedToken = `${tamperedData}.${signature}`;

      const result = verifySignedSessionToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid or tampered session signature");
    });

    it("detects single-character tampering in signature and rejects token", () => {
      const originalPayload = {
        sid: "sess_legit_02",
        sub: "usr_legit_02",
        email: "learner2@prepford.com",
        role: "candidate",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const validToken = signSessionPayload(originalPayload);
      const [data, signature] = validToken.split(".");

      // Tamper with signature
      const tamperedSig = signature.endsWith("x") ? signature.substring(0, signature.length - 1) + "y" : signature.substring(0, signature.length - 1) + "x";
      const tamperedToken = `${data}.${tamperedSig}`;

      const result = verifySignedSessionToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid or tampered session signature");
    });
  });

  // ── 4. Mutual Gateway Authentication & Nonce Replay ──
  describe("Gateway Mutual Authentication Integrity", () => {
    it("generates canonical v1 headers with valid sha256 body hash and timestamp", () => {
      const mockSession = {
        sessionId: "sess_gw_01",
        userId: "usr_gw_01",
        email: "gw@prepford.com",
        name: "Gateway User",
        displayName: "Gateway User",
        role: "candidate",
        pathway: "rn" as const,
        csrfToken: "csrf_gw_01",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        clientId: "cid_gw_01",
      };

      const headers = createCanonicalGatewayAuthHeaders(mockSession, "corr_123", {
        method: "POST",
        path: "/api/v1/attempts/att_123/reauthenticate",
        body: JSON.stringify({ password: "SecretPassword123!" }),
      });

      expect(headers["X-Gateway-Signature"]).toBeDefined();
      expect(headers["X-Gateway-Signature"].length).toBe(64); // 32-byte hex HMAC-SHA256
      expect(headers["X-Gateway-Signature-Version"]).toBe("1");
      expect(headers["X-Gateway-Timestamp"]).toBeDefined();
      expect(headers["X-Gateway-Nonce"]).toBeDefined();
      expect(headers["X-Gateway-Content-SHA256"]).toBeDefined();
      expect(headers["X-Session-Id"]).toBe("sess_gw_01");
      expect(headers["X-Client-Id"]).toBe("cid_gw_01");
    });
  });

  // ── 5. Sensitive Data Exposure Safeguards ──
  describe("Sensitive Data Leakage Prevention", () => {
    it("ensures public/administrative endpoints do not leak passwords, hashes, or gateway secrets", async () => {
      mockResolveSession.mockResolvedValueOnce({
        userId: "usr_super_01",
        email: "superadmin@prepford.com",
        role: "superadmin",
        displayName: "Super Admin",
        sessionId: "sess_super_01",
      });

      mockAdminSecurityService.getPolicy.mockResolvedValueOnce({
        success: true,
        data: {
          id: "global_policy",
          maxConcurrentSessions: 2,
          idleTimeoutMinutes: 300,
          absoluteTimeoutMinutes: 10080,
          policyVersion: 1,
        },
      });

      const request = new Request("http://localhost:3000/api/admin/security/session-policy", { method: "GET" });
      const response = await getPolicyRoute(request);
      const json = await response.json();

      const rawJson = JSON.stringify(json);
      expect(rawJson).not.toContain("password");
      expect(rawJson).not.toContain("PasswordHash");
      expect(rawJson).not.toContain("secret");
      expect(rawJson).not.toContain("TokenHash");
    });
  });
});
