import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockResolveSession = vi.fn();
const mockCreateServerSession = vi.fn();
const mockSetSessionCookie = vi.fn();

vi.mock("@/lib/session", () => ({
  resolveSession: (...args: unknown[]) => mockResolveSession(...args),
  createServerSession: (...args: unknown[]) => mockCreateServerSession(...args),
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}));

const mockEnsureClientId = vi.fn();
vi.mock("@/lib/client-id", () => ({
  ensureClientId: (...args: unknown[]) => mockEnsureClientId(...args),
}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => mockCookieStore),
}));

const mockReauthenticateAttempt = vi.fn();
vi.mock("@/lib/api-services", () => ({
  attemptsService: {
    reauthenticateAttempt: (...args: unknown[]) => mockReauthenticateAttempt(...args),
  },
}));

import { POST as reauthRoute } from "@/app/api/exam-attempts/[id]/reauthenticate/route";

describe("Phase 7: Examination Continuity & Reauthentication BFF Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureClientId.mockReturnValue({ clientId: "client_test_device_01" });
    mockCreateServerSession.mockReturnValue({
      token: "mocked_session_jwt_token",
      maxAgeSeconds: 86400,
    });
  });

  it("POST /api/exam-attempts/[id]/reauthenticate successfully verifies credentials and mints session cookie", async () => {
    mockResolveSession.mockResolvedValueOnce({
      userId: "cand_alice_01",
      email: "alice@prepford.com",
      role: "candidate",
    });

    mockReauthenticateAttempt.mockResolvedValueOnce({
      success: true,
      status: 200,
      data: {
        success: true,
        sessionId: "sess_fresh_999",
        token: "tok_backend_xyz",
        user: {
          id: "cand_alice_01",
          email: "alice@prepford.com",
          name: "Alice Candidate",
          displayName: "Alice Candidate",
          role: "candidate",
          pathway: "rn",
        },
        attempt: {
          id: "att_active_123",
          startedAt: "2026-11-04T22:00:00Z",
          timeLimitMinutes: 60,
          deadlineUtc: "2026-11-04T23:00:00Z",
          remainingSeconds: 2700,
          status: "InProgress",
          totalResponses: 5,
          responses: [],
        },
      },
    });

    const request = new NextRequest("http://localhost:3000/api/exam-attempts/att_active_123/reauthenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "ValidPassword123!" }),
    });

    const response = await reauthRoute(request, { params: Promise.resolve({ id: "att_active_123" }) });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.sessionId).toBe("sess_fresh_999");
    expect(json.attempt.id).toBe("att_active_123");
    expect(json.attempt.remainingSeconds).toBe(2700);

    // Verify session cookie was set
    expect(mockCreateServerSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "cand_alice_01",
        email: "alice@prepford.com",
        sessionId: "sess_fresh_999",
        clientId: "client_test_device_01",
      })
    );
    expect(mockSetSessionCookie).toHaveBeenCalledWith(
      mockCookieStore,
      "mocked_session_jwt_token",
      86400
    );
  });

  it("POST rejects request without password with 400 Bad Request", async () => {
    const request = new NextRequest("http://localhost:3000/api/exam-attempts/att_123/reauthenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "" }),
    });

    const response = await reauthRoute(request, { params: Promise.resolve({ id: "att_123" }) });
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe("INVALID_REQUEST");
    expect(mockReauthenticateAttempt).not.toHaveBeenCalled();
  });

  it("POST propagates backend 401 on invalid credentials without setting cookie", async () => {
    mockResolveSession.mockResolvedValueOnce({
      userId: "cand_alice_01",
      email: "alice@prepford.com",
    });

    mockReauthenticateAttempt.mockResolvedValueOnce({
      success: false,
      status: 401,
      error: "Invalid password. Reauthentication failed.",
      data: {
        success: false,
        errorCode: "INVALID_CREDENTIALS",
        error: "Invalid password. Reauthentication failed.",
      },
    });

    const request = new NextRequest("http://localhost:3000/api/exam-attempts/att_123/reauthenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "WrongPassword!" }),
    });

    const response = await reauthRoute(request, { params: Promise.resolve({ id: "att_123" }) });
    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe("INVALID_CREDENTIALS");
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
  });

  it("POST propagates backend 410 when attempt deadline has passed", async () => {
    mockResolveSession.mockResolvedValueOnce({
      userId: "cand_alice_01",
      email: "alice@prepford.com",
    });

    mockReauthenticateAttempt.mockResolvedValueOnce({
      success: false,
      status: 410,
      error: "The time limit for this examination has expired.",
      data: {
        success: false,
        errorCode: "ATTEMPT_EXPIRED",
        error: "The time limit for this examination has expired. Continuation is not permitted.",
      },
    });

    const request = new NextRequest("http://localhost:3000/api/exam-attempts/att_123/reauthenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "ValidPassword123!" }),
    });

    const response = await reauthRoute(request, { params: Promise.resolve({ id: "att_123" }) });
    expect(response.status).toBe(410);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe("ATTEMPT_EXPIRED");
    expect(mockSetSessionCookie).not.toHaveBeenCalled();
  });
});
