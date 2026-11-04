import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth
let mockCurrentUser = {
  id: "usr_super_01",
  email: "superadmin@prepford.com",
  displayName: "Super Administrator",
  role: "superadmin",
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock notifications
vi.mock("@/lib/notifications", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { AdminSecuritySessionsClient } from "@/app/admin/security/sessions/page-client";

describe("Phase 5: Super Admin Security Dashboard UI (/admin/security/sessions)", () => {
  const sampleMetrics = {
    success: true,
    totalActiveSessions: 24,
    activeUsersCount: 20,
    expiringSoonCount: 2,
    revokedLast24HoursCount: 4,
    limitRejectionsLast24HoursCount: 1,
    securityVersionInvalidationsLast24HoursCount: 1,
  };

  const samplePolicy = {
    success: true,
    id: "global_policy",
    maxConcurrentSessions: 2,
    maxSessionsPerClient: 1,
    idleTimeoutMinutes: 300,
    absoluteTimeoutMinutes: 10080,
    enforceFingerprint: true,
    enforceIpConsistency: false,
    allowIpDrift: true,
    rotateOnLogin: true,
    rotateOnPrivilegeChange: true,
    rotateOnPasswordChange: true,
    policyVersion: 2,
    updatedAt: new Date().toISOString(),
    updatedBy: "superadmin",
    isActive: true,
  };

  const sampleSessions = {
    success: true,
    items: [
      {
        id: "sess_1",
        userId: "u1",
        userEmail: "alice@example.com",
        userDisplayName: "Alice Candidate",
        role: "candidate",
        clientId: "cid_1234567890abcdef1234567890abcdef",
        deviceLabel: "Chrome on Windows 10/11",
        browser: "Chrome",
        operatingSystem: "Windows 10/11",
        deviceType: "Desktop",
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        idleExpiresAt: new Date().toISOString(),
        absoluteExpiresAt: new Date().toISOString(),
        effectiveExpiresAt: new Date().toISOString(),
        revoked: false,
        status: "Active",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 15,
    totalPages: 1,
  };

  const sampleEvents = {
    success: true,
    items: [
      {
        id: "evt_1",
        action: "SessionPolicyUpdated",
        description: "Updated session policy to v2",
        outcome: "Success",
        actorId: "usr_super_01",
        actorEmail: "superadmin@prepford.com",
        timestamp: new Date().toISOString(),
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 15,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      id: "usr_super_01",
      email: "superadmin@prepford.com",
      displayName: "Super Administrator",
      role: "superadmin",
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/admin/security/metrics")) {
        return { ok: true, status: 200, json: async () => sampleMetrics };
      }
      if (url.includes("/api/admin/security/session-policy")) {
        return { ok: true, status: 200, json: async () => samplePolicy };
      }
      if (url.includes("/api/admin/security/sessions")) {
        return { ok: true, status: 200, json: async () => sampleSessions };
      }
      if (url.includes("/api/admin/security/events")) {
        return { ok: true, status: 200, json: async () => sampleEvents };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
  });

  it("denies access and displays warning when user role is not superadmin", async () => {
    mockCurrentUser = {
      id: "usr_regular_admin",
      email: "admin@prepford.com",
      displayName: "Standard Admin",
      role: "admin", // not superadmin
    };

    render(<AdminSecuritySessionsClient />);

    expect(screen.getByRole("heading", { name: /Super Administrator Access Required/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Admin Studio/i })).toHaveAttribute("href", "/admin");
  });

  it("renders page header and metrics summary for superadmin", async () => {
    render(<AdminSecuritySessionsClient />);

    expect(screen.getByRole("heading", { name: /Session Security & Device Management/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("24")).toBeInTheDocument(); // active sessions
      expect(screen.getByText("20")).toBeInTheDocument(); // active learners
    });
  });

  it("renders active sessions monitoring table with learner details and revoke button", async () => {
    render(<AdminSecuritySessionsClient />);

    await waitFor(() => {
      expect(screen.getByText("Alice Candidate")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("Chrome on Windows 10/11")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Revoke$/i })).toBeInTheDocument();
    });
  });

  it("opens administrative revocation dialog with target learner info", async () => {
    render(<AdminSecuritySessionsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Revoke$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Revoke$/i }));

    expect(screen.getByRole("heading", { name: /Administratively Revoke Session\?/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Alice Candidate/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Administrative Reason/i)).toBeInTheDocument();
  });

  it("switches to Global Security Policy tab and displays persisted policy fields", async () => {
    render(<AdminSecuritySessionsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Global Security Policy/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Global Security Policy/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Maximum Concurrent Sessions per Learner/i)).toHaveValue(2);
      expect(screen.getByLabelText(/Maximum Sessions per Browser Client/i)).toHaveValue(1);
      expect(screen.getByLabelText(/Idle Inactivity Timeout/i)).toHaveValue(300);
      expect(screen.getByLabelText(/Absolute Lifetime Timeout/i)).toHaveValue(10080);
      expect(screen.getByRole("button", { name: /Reset to Platform Defaults/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save Policy Changes/i })).toBeInTheDocument();
    });
  });

  it("opens confirmation dialog when clicking 'Reset to Platform Defaults'", async () => {
    render(<AdminSecuritySessionsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Global Security Policy/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Global Security Policy/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reset to Platform Defaults/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Reset to Platform Defaults/i }));

    expect(screen.getByRole("heading", { name: /Reset Policy to System Defaults\?/i })).toBeInTheDocument();
    expect(screen.getByText(/2 concurrent sessions, 1 session per client/i)).toBeInTheDocument();
  });

  it("switches to Administrative Audit Feed tab and displays security events", async () => {
    render(<AdminSecuritySessionsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Administrative Audit Feed/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Administrative Audit Feed/i }));

    await waitFor(() => {
      expect(screen.getByText("SessionPolicyUpdated")).toBeInTheDocument();
      expect(screen.getByText("Updated session policy to v2")).toBeInTheDocument();
      expect(screen.getByText("superadmin@prepford.com")).toBeInTheDocument();
    });
  });
});
