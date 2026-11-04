import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
    name: "Alice Candidate",
    role: "candidate",
    pathway: "rn" as const,
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
import { notify } from "@/lib/notifications";

describe("PrepFord Learner Dashboard Security Center (/dashboard/settings/security)", () => {
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
    {
      id: "sess_other_3",
      deviceLabel: "Firefox on macOS",
      browser: "Firefox",
      operatingSystem: "macOS",
      deviceType: "Desktop",
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
      idleExpiresAt: new Date(Date.now() + 18000000).toISOString(),
      absoluteExpiresAt: new Date(Date.now() + 600000000).toISOString(),
      isCurrent: false,
      lastIpAddress: "172.16.0.4",
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
      action: "SessionRevoked",
      description: "Terminated session on Firefox on macOS",
      outcome: "Success",
      timestamp: new Date(Date.now() - 2400000).toISOString(),
      ipAddress: "192.168.1.10",
    },
    {
      id: "evt_3",
      action: "UserLoginSuccess",
      description: "Signed in successfully",
      outcome: "Success",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      ipAddress: "192.168.1.10",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method || "GET";

      if (url.includes("/api/security/sessions/revoke-others") && method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            revokedCount: 2,
            message: "All 2 other active session(s) have been terminated.",
          }),
        };
      }

      if (url.includes("/api/security/sessions/") && method === "DELETE") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            sessionId: "sess_other_2",
            message: "Session terminated successfully.",
          }),
        };
      }

      if (url.includes("/api/security/sessions") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            sessions: sampleSessions,
            totalActiveCount: 3,
          }),
        };
      }

      if (url.includes("/api/security/events") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            events: sampleEvents,
            totalCount: 3,
          }),
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });
  });

  it("1. renders within persistent dashboard shell with sidebar, header, and active route highlight", async () => {
    render(<SecuritySettingsClient />);

    // Sidebar navigation is rendered
    const sidebar = screen.getByTestId("learner-sidebar");
    expect(sidebar).toBeInTheDocument();

    // Security & Devices navigation item exists in sidebar
    const securityNavLink = screen.getByTestId("sidebar-nav-security");
    expect(securityNavLink).toBeInTheDocument();
    expect(securityNavLink).toHaveAttribute("href", "/dashboard/settings/security");
    expect(securityNavLink).toHaveAttribute("aria-current", "page");

    // Header with breadcrumbs and pathway toggles is present
    const header = screen.getByTestId("dashboard-header");
    expect(header).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-breadcrumbs")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-pathway-rn")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-pathway-pn")).toBeInTheDocument();

    // Page title
    expect(screen.getByRole("heading", { name: /Account Security & Sessions/i })).toBeInTheDocument();
  });

  it("2. displays the 4 Security Overview metric cards with live counts and protection status", async () => {
    render(<SecuritySettingsClient />);

    const metricsContainer = screen.getByTestId("security-overview-metrics");
    expect(metricsContainer).toBeInTheDocument();

    await waitFor(() => {
      // Metric 1: Active Sessions
      const activeSessionsCard = screen.getByTestId("metric-active-sessions");
      expect(activeSessionsCard).toBeInTheDocument();
      expect(within(activeSessionsCard).getByText("3")).toBeInTheDocument();
      expect(within(activeSessionsCard).getByText(/simultaneous/i)).toBeInTheDocument();

      // Metric 2: Other Devices (3 sessions - 1 current = 2 other devices)
      const otherDevicesCard = screen.getByTestId("metric-other-devices");
      expect(otherDevicesCard).toBeInTheDocument();
      expect(within(otherDevicesCard).getByText("2")).toBeInTheDocument();
      expect(within(otherDevicesCard).getByText(/remote logins/i)).toBeInTheDocument();

      // Metric 3: Current Device
      const currentDeviceCard = screen.getByTestId("metric-current-device");
      expect(currentDeviceCard).toBeInTheDocument();
      expect(within(currentDeviceCard).getByText("Chrome")).toBeInTheDocument();
      expect(within(currentDeviceCard).getByText("Active")).toBeInTheDocument();

      // Metric 4: Protection Status
      const protectionCard = screen.getByTestId("metric-protection-status");
      expect(protectionCard).toBeInTheDocument();
      expect(within(protectionCard).getByText("Enforced")).toBeInTheDocument();
      expect(within(protectionCard).getByText("Guarded")).toBeInTheDocument();
    });
  });

  it("3. distinguishes current device and displays IP and timestamps for each session", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      // All 3 device labels are shown
      expect(screen.getByText("Chrome on Windows 10/11")).toBeInTheDocument();
      expect(screen.getByText("Safari on iOS (iPhone)")).toBeInTheDocument();
      expect(screen.getByText("Firefox on macOS")).toBeInTheDocument();

      // Current session badge
      expect(screen.getByText("Current Device / Session")).toBeInTheDocument();

      // IP addresses (may appear in both active sessions and events feed)
      expect(screen.getAllByText(/IP: 192\.168\.1\.10/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/IP: 10\.0\.0\.5/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/IP: 172\.16\.0\.4/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("4. supports individual session termination with confirmation dialog and refresh", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByText("Safari on iOS (iPhone)")).toBeInTheDocument();
    });

    // Find and click Terminate Session button for Safari
    const terminateButtons = screen.getAllByRole("button", { name: /Terminate Session/i });
    expect(terminateButtons.length).toBe(2); // 2 non-current sessions

    fireEvent.click(terminateButtons[0]);

    // Modal opens
    expect(screen.getByRole("heading", { name: "Terminate Session?" })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to terminate the session on/i)).toBeInTheDocument();

    // Confirm termination
    const confirmBtn = screen.getByRole("button", { name: "Terminate Session" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/security/sessions/sess_other_2"),
        expect.objectContaining({ method: "DELETE" })
      );
      expect(notify.success).toHaveBeenCalledWith("Session terminated successfully.");
    });
  });

  it("5. executes bulk 'Log Out Other Sessions' flow with confirmation modal", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Log Out Other Sessions \(2\)/i })).toBeInTheDocument();
    });

    const logoutOthersBtn = screen.getByRole("button", { name: /Log Out Other Sessions \(2\)/i });
    fireEvent.click(logoutOthersBtn);

    // Modal dialog appears
    expect(screen.getByRole("heading", { name: /Log Out All Other Sessions\?/i })).toBeInTheDocument();
    expect(screen.getByText(/This will immediately sign out all other devices \(2 sessions\)/i)).toBeInTheDocument();

    // Confirm button inside modal
    const confirmBtn = screen.getByRole("button", { name: /Log Out Other Devices/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/security/sessions/revoke-others",
        expect.objectContaining({ method: "POST" })
      );
      expect(notify.success).toHaveBeenCalledWith("Other sessions terminated successfully.");
    });
  });

  it("6. triggers 'Sign Out This Device' flow and calls auth logout", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sign Out This Device/i })).toBeInTheDocument();
    });

    const signOutBtn = screen.getByRole("button", { name: /Sign Out This Device/i });
    fireEvent.click(signOutBtn);

    // Confirmation dialog for current device
    expect(screen.getByRole("heading", { name: "Sign Out Current Device?" })).toBeInTheDocument();
    expect(
      screen.getByText(/You are about to sign out of this browser\. You will need to log back in/i)
    ).toBeInTheDocument();

    const confirmSignOutBtn = screen.getByRole("button", { name: "Sign Out" });
    fireEvent.click(confirmSignOutBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/security/sessions/sess_curr_1"),
        expect.objectContaining({ method: "DELETE" })
      );
      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/sign-in");
    });
  });

  it("7. renders security guidance callout explaining concurrency and idle timeouts", async () => {
    render(<SecuritySettingsClient />);

    expect(screen.getByText("Session Security Safeguards")).toBeInTheDocument();
    expect(
      screen.getByText(/PrepFord automatically protects your account by limiting simultaneous active sessions/i)
    ).toBeInTheDocument();
  });

  it("8. renders security activity event feed with icons, dates, and outcomes", async () => {
    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Recent Security Events/i })).toBeInTheDocument();
      expect(screen.getByText("Password changed successfully")).toBeInTheDocument();
      expect(screen.getByText("Terminated session on Firefox on macOS")).toBeInTheDocument();
      expect(screen.getByText("Signed in successfully")).toBeInTheDocument();
    });
  });

  it("9. handles API error states gracefully and offers retry functionality", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/security/sessions")) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, events: [] }) };
    });

    render(<SecuritySettingsClient />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't connect to the server|Unable to load active sessions/i)).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /^Retry$/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });

  it("10. supports collapsing and expanding the sidebar via toggle button", async () => {
    render(<SecuritySettingsClient />);

    const collapseToggle = screen.getByTestId("sidebar-collapse-toggle");
    expect(collapseToggle).toBeInTheDocument();

    // Toggle collapse
    fireEvent.click(collapseToggle);

    // Sidebar should have collapsed width class
    const sidebar = screen.getByTestId("learner-sidebar");
    expect(sidebar.className).toContain("w-20");

    // Toggle expand
    fireEvent.click(collapseToggle);
    expect(sidebar.className).toContain("w-64");
  });
});
