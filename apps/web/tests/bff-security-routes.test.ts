import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockResolveSession = vi.fn();
const mockClearSessionCookie = vi.fn();

vi.mock("@/lib/session", () => ({
  resolveSession: (...args: unknown[]) => mockResolveSession(...args),
  clearSessionCookie: (...args: unknown[]) => mockClearSessionCookie(...args),
}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => mockCookieStore),
}));

const mockSecurityService = {
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeAllSessions: vi.fn(),
  getEvents: vi.fn(),
};

vi.mock("@/lib/api-services", () => ({
  securityService: {
    getSessions: (...args: unknown[]) => mockSecurityService.getSessions(...args),
    revokeSession: (...args: unknown[]) => mockSecurityService.revokeSession(...args),
    revokeOtherSessions: (...args: unknown[]) => mockSecurityService.revokeOtherSessions(...args),
    revokeAllSessions: (...args: unknown[]) => mockSecurityService.revokeAllSessions(...args),
    getEvents: (...args: unknown[]) => mockSecurityService.getEvents(...args),
  },
}));

import { GET as getSessionsRoute } from "@/app/api/security/sessions/route";
import { DELETE as deleteSessionRoute } from "@/app/api/security/sessions/[sessionId]/route";
import { POST as revokeOthersRoute } from "@/app/api/security/sessions/revoke-others/route";
import { POST as revokeAllRoute } from "@/app/api/security/sessions/revoke-all/route";
import { GET as getEventsRoute } from "@/app/api/security/events/route";

describe("Phase 4: BFF Security & Session Route Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSession = {
    userId: "usr_alice",
    email: "alice@example.com",
    role: "candidate",
    displayName: "Alice Candidate",
    sessionId: "sess_authoritative_alice_1",
    clientId: "cid_0123456789abcdef0123456789abcdef",
    securityVersion: 1,
  };

  describe("GET /api/security/sessions", () => {
    it("returns 401 Unauthorized when session is missing", async () => {
      mockResolveSession.mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/security/sessions");
      const res = await getSessionsRoute(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("forwards session to backend security service and returns session list", async () => {
      mockResolveSession.mockResolvedValueOnce(validSession);
      mockSecurityService.getSessions.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          sessions: [
            {
              id: "sess_authoritative_alice_1",
              deviceLabel: "Chrome on Windows",
              isCurrent: true,
            },
            {
              id: "sess_authoritative_alice_2",
              deviceLabel: "Safari on iOS",
              isCurrent: false,
            },
          ],
          totalActiveCount: 2,
        },
      });

      const req = new Request("http://localhost:3000/api/security/sessions");
      const res = await getSessionsRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sessions).toHaveLength(2);
      expect(mockSecurityService.getSessions).toHaveBeenCalledWith(validSession);
    });

    it("propagates error when backend fails", async () => {
      mockResolveSession.mockResolvedValueOnce(validSession);
      mockSecurityService.getSessions.mockResolvedValueOnce({
        success: false,
        status: 502,
        error: "Backend service unreachable",
      });

      const req = new Request("http://localhost:3000/api/security/sessions");
      const res = await getSessionsRoute(req);

      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.error).toBe("Backend service unreachable");
    });
  });

  describe("DELETE /api/security/sessions/[sessionId]", () => {
    it("returns 401 when session is missing", async () => {
      mockResolveSession.mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/security/sessions/sess_target");
      const res = await deleteSessionRoute(req, {
        params: Promise.resolve({ sessionId: "sess_target" }),
      });

      expect(res.status).toBe(401);
    });

    it("revokes target non-current session and preserves browser cookie", async () => {
      mockResolveSession.mockResolvedValueOnce(validSession);
      mockSecurityService.revokeSession.mockResolvedValueOnce({
        success: true,
        data: { success: true, message: "Session terminated successfully." },
      });

      const req = new Request("http://localhost:3000/api/security/sessions/sess_authoritative_alice_2", {
        method: "DELETE",
      });
      const res = await deleteSessionRoute(req, {
        params: Promise.resolve({ sessionId: "sess_authoritative_alice_2" }),
      });

      expect(res.status).toBe(200);
      expect(mockSecurityService.revokeSession).toHaveBeenCalledWith(
        "sess_authoritative_alice_2",
        validSession
      );
      // Non-current session: session cookie must NOT be cleared
      expect(mockClearSessionCookie).not.toHaveBeenCalled();
    });

    it("revokes current session and immediately clears browser cookie", async () => {
      mockResolveSession.mockResolvedValueOnce(validSession);
      mockSecurityService.revokeSession.mockResolvedValueOnce({
        success: true,
        data: { success: true, message: "Session terminated successfully." },
      });

      // Target is alice's current session
      const req = new Request("http://localhost:3000/api/security/sessions/sess_authoritative_alice_1", {
        method: "DELETE",
      });
      const res = await deleteSessionRoute(req, {
        params: Promise.resolve({ sessionId: "sess_authoritative_alice_1" }),
      });

      expect(res.status).toBe(200);
      expect(mockSecurityService.revokeSession).toHaveBeenCalledWith(
        "sess_authoritative_alice_1",
        validSession
      );
      // Current session revoked: session cookie MUST be cleared
      expect(mockClearSessionCookie).toHaveBeenCalled();
    });
  });

  describe("POST /api/security/sessions/revoke-others", () => {
    it("returns 401 when unauthenticated", async () => {
      mockResolveSession.mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/security/sessions/revoke-others", {
        method: "POST",
      });
      const res = await revokeOthersRoute(req);

      expect(res.status).toBe(401);
    });

    it("revokes other sessions and preserves current session cookie", async () => {
      mockResolveSession.mockResolvedValueOnce(validSession);
      mockSecurityService.revokeOtherSessions.mockResolvedValueOnce({
        success: true,
        data: { success: true, revokedCount: 2, message: "2 other active sessions were terminated." },
      });

      const req = new Request("http://localhost:3000/api/security/sessions/revoke-others", {
        method: "POST",
      });
      const res = await revokeOthersRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.revokedCount).toBe(2);
      expect(mockSecurityService.revokeOtherSessions).toHaveBeenCalledWith(validSession);
      // Current cookie remains preserved
      expect(mockClearSessionCookie).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/security/sessions/revoke-all", () => {
    it("returns 401 when unauthenticated", async () => {
      mockResolveSession.mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/security/sessions/revoke-all", {
        method: "POST",
      });
      const res = await revokeAllRoute(req);

      expect(res.status).toBe(401);
    });

    it("revokes all sessions and clears current session cookie", async () => {
      mockResolveSession.mockResolvedValueOnce(validSession);
      mockSecurityService.revokeAllSessions.mockResolvedValueOnce({
        success: true,
        data: { success: true, revokedCount: 3, message: "All active sessions terminated successfully." },
      });

      const req = new Request("http://localhost:3000/api/security/sessions/revoke-all", {
        method: "POST",
      });
      const res = await revokeAllRoute(req);

      expect(res.status).toBe(200);
      expect(mockClearSessionCookie).toHaveBeenCalled();
    });
  });

  describe("GET /api/security/events", () => {
    it("returns 401 when unauthenticated", async () => {
      mockResolveSession.mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/security/events");
      const res = await getEventsRoute(req);

      expect(res.status).toBe(401);
    });

    it("forwards request and returns security events", async () => {
      mockResolveSession.mockResolvedValueOnce(validSession);
      mockSecurityService.getEvents.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          events: [
            {
              id: "evt_1",
              action: "UserLoginSuccess",
              description: "Signed in successfully",
              outcome: "Success",
              timestamp: new Date().toISOString(),
              ipAddress: "192.168.1.1",
            },
          ],
          totalCount: 1,
        },
      });

      const req = new Request("http://localhost:3000/api/security/events");
      const res = await getEventsRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].description).toBe("Signed in successfully");
    });
  });
});
