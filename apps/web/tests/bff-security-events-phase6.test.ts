import { describe, it, expect, vi, beforeEach } from "vitest";

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
  getEvents: vi.fn(),
};

const mockAdminSecurityService = {
  getEvents: vi.fn(),
};

vi.mock("@/lib/api-services", () => ({
  securityService: {
    getEvents: (...args: unknown[]) => mockSecurityService.getEvents(...args),
  },
  adminSecurityService: {
    getEvents: (...args: unknown[]) => mockAdminSecurityService.getEvents(...args),
  },
}));

import { GET as getLearnerEventsRoute } from "@/app/api/security/events/route";
import { GET as getAdminEventsRoute } from "@/app/api/admin/security/events/route";

describe("Phase 6: Risk-Aware Security Events & Version Invalidation (BFF Routes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates sanitized Phase 6 security events to learner feed", async () => {
    mockResolveSession.mockResolvedValueOnce({
      userId: "u123",
      email: "candidate@prepford.com",
      role: "candidate",
      sessionId: "sess_curr_1",
    });

    mockSecurityService.getEvents.mockResolvedValueOnce({
      success: true,
      status: 200,
      data: {
        success: true,
        events: [
          {
            id: "ev1",
            action: "NewClientDetected",
            description: "Signed in from a new device",
            outcome: "Success",
            timestamp: "2026-11-04T20:00:00Z",
            ipAddress: "192.168.1.1",
          },
          {
            id: "ev2",
            action: "UserAgentChanged",
            description: "Browser or operating system updated",
            outcome: "Updated",
            timestamp: "2026-11-04T20:05:00Z",
            ipAddress: "192.168.1.1",
          },
          {
            id: "ev3",
            action: "IpAddressChanged",
            description: "Network connection changed",
            outcome: "Allowed",
            timestamp: "2026-11-04T20:10:00Z",
            ipAddress: "172.56.21.89",
          },
          {
            id: "ev4",
            action: "SecurityVersionIncremented",
            description: "Account security version updated",
            outcome: "Success",
            timestamp: "2026-11-04T20:15:00Z",
          },
          {
            id: "ev5",
            action: "SessionsInvalidatedBySecurityVersion",
            description: "All prior active sessions signed out for account protection",
            outcome: "Success",
            timestamp: "2026-11-04T20:15:01Z",
          },
        ],
      },
    });

    const request = new Request("http://localhost:3000/api/security/events");
    const response = await getLearnerEventsRoute(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.events).toHaveLength(5);

    // Verify sanitized, non-alarming descriptions
    expect(data.events[0].description).toBe("Signed in from a new device");
    expect(data.events[1].description).toBe("Browser or operating system updated");
    expect(data.events[2].description).toBe("Network connection changed");
    expect(data.events[3].description).toBe("Account security version updated");
    expect(data.events[4].description).toBe("All prior active sessions signed out for account protection");

    // Strictly verify no raw tokens, passwords, or secret hashes
    const stringified = JSON.stringify(data);
    expect(stringified).not.toContain("password");
    expect(stringified).not.toContain("tokenHash");
    expect(stringified).not.toContain("secret");
  });

  it("propagates high-severity risk events to Super Admin audit feed", async () => {
    mockResolveSession.mockResolvedValueOnce({
      userId: "admin_super",
      email: "superadmin@prepford.com",
      role: "superadmin",
      sessionId: "sess_admin_1",
    });

    mockAdminSecurityService.getEvents.mockResolvedValueOnce({
      success: true,
      status: 200,
      data: {
        success: true,
        events: [
          {
            id: "ev_admin_1",
            action: "SuspiciousSessionContext",
            actorId: "u123",
            actorEmail: "candidate@prepford.com",
            description: "Suspicious session context: Operating system changed from Windows 10/11 to iOS (iPhone) on active session",
            outcome: "Flagged",
            ipAddress: "10.0.0.1",
            timestamp: "2026-11-04T20:20:00Z",
          },
          {
            id: "ev_admin_2",
            action: "SecurityVersionIncremented",
            actorId: "u123",
            actorEmail: "candidate@prepford.com",
            description: "Security version incremented to 2 (Reason: PasswordChangeRemediation)",
            outcome: "Success",
            timestamp: "2026-11-04T20:25:00Z",
          },
        ],
        totalCount: 2,
        page: 1,
        limit: 20,
      },
    });

    const request = new Request("http://localhost:3000/api/admin/security/events?page=1&limit=20");
    const response = await getAdminEventsRoute(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.events).toHaveLength(2);
    expect(data.events[0].action).toBe("SuspiciousSessionContext");
    expect(data.events[0].outcome).toBe("Flagged");
    expect(data.events[1].action).toBe("SecurityVersionIncremented");
  });

  it("denies access to admin risk feed for non-superadmin users", async () => {
    mockResolveSession.mockResolvedValueOnce({
      userId: "u_candidate",
      email: "candidate@prepford.com",
      role: "candidate",
    });

    const request = new Request("http://localhost:3000/api/admin/security/events");
    const response = await getAdminEventsRoute(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Forbidden");
  });
});
