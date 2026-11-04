import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockResolveSession = vi.fn();
vi.mock("@/lib/session", () => ({
  resolveSession: (...args: unknown[]) => mockResolveSession(...args),
}));

const mockAdminSecurityService = {
  getMetrics: vi.fn(),
  getPolicy: vi.fn(),
  updatePolicy: vi.fn(),
  resetPolicy: vi.fn(),
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  getEvents: vi.fn(),
};

vi.mock("@/lib/api-services", () => ({
  adminSecurityService: {
    getMetrics: (...args: unknown[]) => mockAdminSecurityService.getMetrics(...args),
    getPolicy: (...args: unknown[]) => mockAdminSecurityService.getPolicy(...args),
    updatePolicy: (...args: unknown[]) => mockAdminSecurityService.updatePolicy(...args),
    resetPolicy: (...args: unknown[]) => mockAdminSecurityService.resetPolicy(...args),
    getSessions: (...args: unknown[]) => mockAdminSecurityService.getSessions(...args),
    revokeSession: (...args: unknown[]) => mockAdminSecurityService.revokeSession(...args),
    revokeAllUserSessions: (...args: unknown[]) => mockAdminSecurityService.revokeAllUserSessions(...args),
    getEvents: (...args: unknown[]) => mockAdminSecurityService.getEvents(...args),
  },
}));

import { GET as getMetricsRoute } from "@/app/api/admin/security/metrics/route";
import { GET as getPolicyRoute, PUT as putPolicyRoute } from "@/app/api/admin/security/session-policy/route";
import { POST as resetPolicyRoute } from "@/app/api/admin/security/session-policy/reset/route";
import { GET as getSessionsRoute } from "@/app/api/admin/security/sessions/route";
import { POST as revokeSessionRoute } from "@/app/api/admin/security/sessions/[sessionId]/revoke/route";
import { POST as revokeUserSessionsRoute } from "@/app/api/admin/security/users/[userId]/revoke-sessions/route";
import { GET as getEventsRoute } from "@/app/api/admin/security/events/route";

describe("Phase 5: Super Admin BFF Security Route Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const superAdminSession = {
    userId: "usr_super_01",
    email: "superadmin@prepford.com",
    role: "superadmin",
    displayName: "Super Administrator",
    sessionId: "sess_super_01",
    securityVersion: 1,
  };

  const standardAdminSession = {
    userId: "usr_admin_01",
    email: "admin@prepford.com",
    role: "admin", // regular admin, not superadmin
    displayName: "Standard Administrator",
    sessionId: "sess_admin_01",
    securityVersion: 1,
  };

  const candidateSession = {
    userId: "usr_candidate_01",
    email: "candidate@example.com",
    role: "candidate",
    displayName: "Candidate User",
    sessionId: "sess_cand_01",
    securityVersion: 1,
  };

  describe("RBAC Authorization Boundary Checks", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      mockResolveSession.mockResolvedValueOnce(null);
      const res = await getMetricsRoute(new Request("http://localhost:3000/api/admin/security/metrics"));
      expect(res.status).toBe(401);
    });

    it("returns 403 Forbidden when standard admin attempts to access Super Admin metrics", async () => {
      mockResolveSession.mockResolvedValueOnce(standardAdminSession);
      const res = await getMetricsRoute(new Request("http://localhost:3000/api/admin/security/metrics"));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Super Administrator");
    });

    it("returns 403 Forbidden when candidate attempts to access policy", async () => {
      mockResolveSession.mockResolvedValueOnce(candidateSession);
      const res = await getPolicyRoute(new Request("http://localhost:3000/api/admin/security/session-policy"));
      expect(res.status).toBe(403);
    });

    it("returns 403 Forbidden when standard admin attempts to update policy", async () => {
      mockResolveSession.mockResolvedValueOnce(standardAdminSession);
      const res = await putPolicyRoute(
        new Request("http://localhost:3000/api/admin/security/session-policy", {
          method: "PUT",
          body: JSON.stringify({ maxConcurrentSessions: 3 }),
        })
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Super Admin Endpoints", () => {
    it("GET /api/admin/security/metrics succeeds for superadmin", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.getMetrics.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          totalActiveSessions: 42,
          activeUsersCount: 35,
          expiringSoonCount: 3,
          revokedLast24HoursCount: 5,
          limitRejectionsLast24HoursCount: 1,
          securityVersionInvalidationsLast24HoursCount: 2,
        },
      });

      const res = await getMetricsRoute(new Request("http://localhost:3000/api/admin/security/metrics"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalActiveSessions).toBe(42);
      expect(mockAdminSecurityService.getMetrics).toHaveBeenCalledWith(superAdminSession);
    });

    it("GET /api/admin/security/session-policy succeeds for superadmin", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.getPolicy.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          id: "global_policy",
          maxConcurrentSessions: 2,
          maxSessionsPerClient: 1,
          idleTimeoutMinutes: 300,
          absoluteTimeoutMinutes: 10080,
          policyVersion: 1,
        },
      });

      const res = await getPolicyRoute(new Request("http://localhost:3000/api/admin/security/session-policy"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.maxConcurrentSessions).toBe(2);
    });

    it("PUT /api/admin/security/session-policy updates policy for superadmin", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.updatePolicy.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          message: "Session security policy updated successfully.",
          policy: { maxConcurrentSessions: 3, policyVersion: 2 },
        },
      });

      const res = await putPolicyRoute(
        new Request("http://localhost:3000/api/admin/security/session-policy", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxConcurrentSessions: 3, policyVersion: 1 }),
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("POST /api/admin/security/session-policy/reset restores platform defaults", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.resetPolicy.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          message: "Session security policy reset to canonical platform defaults.",
          policy: { maxConcurrentSessions: 2, policyVersion: 3 },
        },
      });

      const res = await resetPolicyRoute(new Request("http://localhost:3000/api/admin/security/session-policy/reset", {
        method: "POST",
      }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.policy.maxConcurrentSessions).toBe(2);
    });

    it("GET /api/admin/security/sessions forwards query params", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.getSessions.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        },
      });

      const res = await getSessionsRoute(
        new Request("http://localhost:3000/api/admin/security/sessions?page=2&pageSize=10&status=active&search=alice")
      );
      expect(res.status).toBe(200);
      expect(mockAdminSecurityService.getSessions).toHaveBeenCalledWith(
        {
          page: 2,
          pageSize: 10,
          status: "active",
          search: "alice",
          sortBy: "lastActive",
          sortOrder: "desc",
        },
        superAdminSession
      );
    });

    it("POST /api/admin/security/sessions/[sessionId]/revoke administratively revokes session", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.revokeSession.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          message: "Session administratively revoked successfully.",
        },
      });

      const res = await revokeSessionRoute(
        new Request("http://localhost:3000/api/admin/security/sessions/sess_target/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Suspicious login detected" }),
        }),
        { params: Promise.resolve({ sessionId: "sess_target" }) }
      );
      expect(res.status).toBe(200);
      expect(mockAdminSecurityService.revokeSession).toHaveBeenCalledWith(
        "sess_target",
        "Suspicious login detected",
        superAdminSession
      );
    });

    it("POST /api/admin/security/users/[userId]/revoke-sessions revokes all sessions for user", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.revokeAllUserSessions.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          revokedCount: 2,
          message: "Terminated all 2 active sessions for user Alice.",
        },
      });

      const res = await revokeUserSessionsRoute(
        new Request("http://localhost:3000/api/admin/security/users/usr_target/revoke-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Account reset requested" }),
        }),
        { params: Promise.resolve({ userId: "usr_target" }) }
      );
      expect(res.status).toBe(200);
      expect(mockAdminSecurityService.revokeAllUserSessions).toHaveBeenCalledWith(
        "usr_target",
        "Account reset requested",
        superAdminSession
      );
    });

    it("GET /api/admin/security/events returns paginated security events", async () => {
      mockResolveSession.mockResolvedValueOnce(superAdminSession);
      mockAdminSecurityService.getEvents.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        },
      });

      const res = await getEventsRoute(new Request("http://localhost:3000/api/admin/security/events?action=SessionPolicyUpdated"));
      expect(res.status).toBe(200);
      expect(mockAdminSecurityService.getEvents).toHaveBeenCalledWith(
        { page: 1, pageSize: 20, action: "SessionPolicyUpdated", search: undefined },
        superAdminSession
      );
    });
  });
});
