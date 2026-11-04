import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/dashboard/settings/security",
}));

// Mock useAuth
const mockLogout = vi.fn();
const mockAuthValue = {
  user: {
    id: "usr_alice",
    email: "alice@example.com",
    displayName: "Alice Candidate",
    role: "candidate",
  },
  isAuthenticated: true,
  isLoading: false,
  logout: mockLogout,
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mockAuthValue,
}));

// Mock notifications
vi.mock("@/lib/notifications", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { SecuritySettingsClient } from "@/app/dashboard/settings/security/page-client";

describe("Phase 4: Learner Security Settings UI (/dashboard/settings/security)", () => {
  const sampleSessions = [
    {
      id: "sess_curr_1",
      deviceLabel: "Chrome on Windows 10/11",
      browser: "Chrome",
      operatingSystem: "Windows 10/11",
      deviceType: "Desktop",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      lastActiveAt: new Date(Date.now() - 60000).toISOString(),
      idleExpiresAt: new Date(Date.now() + 18000000).toISOString(),
      absoluteExpiresAt: new Date(Date.now() + 600000000).toISOString(),
      isCurrent: true,
      lastIpAddress: "192.168.1.10",
    },
    {
      id: "sess_other_2",
      deviceLabel: "Safari on iOS (iPhone)",
      browser: "Safari",
      operatingSystem: "iOS (iPhone)",
      deviceType: "Mobile",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      lastActiveAt: new Date(Date.now() - 1200000).toISOString(),
      idleExpiresAt: new Date(Date.now() + 18000000).toISOString(),
      absoluteExpiresAt: new Date(Date.now() + 600000000).toISOString(),
      isCurrent: false,
      lastIpAddress: "10.0.0.5",
    },
  ];

  const sampleEvents = [
    {
      id: "evt_1",
      action: "PasswordChanged",
      description: "Password changed successfully",
      outcome: "Success",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      ipAddress: "192.168.1.10",
    },
    {
      id: "evt_2",
      action: "UserLoginSuccess",
      description: "Signed in successfully",
      outcome: "Success",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      ipAddress: "192.168.1.10",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/security/sessions")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            sessions: sampleSessions,
            totalActiveCount: 2,
          }),
        };
      }
      if (url.includes("/api/security/events")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            events: sampleEvents,
            totalCount: 2,
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
  });

  it("renders page title, breadcrumb navigation, and active sessions count badge", async () => {
    render(<SecuritySettingsClient />);

    expect(screen.getByRole("heading", { name: /Account Security & Sessions/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Breadcrumb/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("2 Sessions")).toBeInTheDocument();
    });
  });

  it("distinguishes current session with prominent badge and labels device info", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByText("Chrome on Windows 10/11")).toBeInTheDocument();
      expect(screen.getByText("Safari on iOS (iPhone)")).toBeInTheDocument();
      expect(screen.getByText("Current Device / Session")).toBeInTheDocument();
      expect(screen.getAllByText(/IP: 192.168.1.10/i)[0]).toBeInTheDocument();
    });
  });

  it("renders 'Log Out Other Sessions' action when multiple sessions exist", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      const revokeOthersButton = screen.getByRole("button", { name: /Log Out Other Sessions/i });
      expect(revokeOthersButton).toBeInTheDocument();
    });
  });

  it("opens confirmation dialog when clicking 'Terminate Session' on a non-current session", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByText("Safari on iOS (iPhone)")).toBeInTheDocument();
    });

    const terminateBtn = screen.getByRole("button", { name: /Terminate Session/i });
    fireEvent.click(terminateBtn);

    // Dialog opens with title and device name
    expect(screen.getByRole("heading", { name: "Terminate Session?" })).toBeInTheDocument();
    expect(screen.getByText(/Safari on iOS \(iPhone\)/i)).toBeInTheDocument();

    // Cancel button closes dialog
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Terminate Session?" })).not.toBeInTheDocument();
    });
  });

  it("opens confirmation dialog when clicking 'Log Out Other Sessions'", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Log Out Other Sessions/i })).toBeInTheDocument();
    });

    const logOutOthersBtn = screen.getByRole("button", { name: /Log Out Other Sessions/i });
    fireEvent.click(logOutOthersBtn);

    expect(screen.getByRole("heading", { name: /Log Out All Other Sessions\?/i })).toBeInTheDocument();
    expect(screen.getByText(/sign out all other devices/i)).toBeInTheDocument();
  });

  it("renders chronological security events feed with friendly descriptions and outcomes", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByText("Password changed successfully")).toBeInTheDocument();
      expect(screen.getByText("Signed in successfully")).toBeInTheDocument();
      const successBadges = screen.getAllByText("Success");
      expect(successBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("displays error message and provides retry button when session fetch fails", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/security/sessions")) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, events: [] }) };
    });

    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't connect to the server|Unable to load active sessions/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Retry$/i })).toBeInTheDocument();
    });
  });
});
