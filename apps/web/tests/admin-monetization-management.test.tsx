import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminSubscriptionsClient } from "@/app/admin/subscriptions/page-client";
import { PlanAppearanceEditorTab } from "@/components/admin/monetization/plan-appearance-editor-tab";
import { ManualAuthorizationTab } from "@/components/admin/monetization/manual-authorization-tab";
import { LearnerSubscriptionsTab } from "@/components/admin/monetization/learner-subscriptions-tab";
import { TransactionsLedgerTab } from "@/components/admin/monetization/transactions-ledger-tab";
import { RevenueAnalyticsTab } from "@/components/admin/monetization/revenue-analytics-tab";

// Mock router & search params
let mockSearchParams = new URLSearchParams();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/subscriptions",
}));

// Mock auth context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "test-admin", role: "admin", email: "admin@prepford.com" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock notifications
vi.mock("@/lib/notifications", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Monetization Management Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Default global fetch mock
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/admin/subscriptions/appearance")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              appearance: {
                id: "app-default",
                version: 1,
                isPublished: true,
                typographyJson: JSON.stringify({ fontFamily: "Playfair Display, serif" }),
                colorsJson: JSON.stringify({ cardBgColor: "#ffffff", titleColor: "#0f172a" }),
                buttonStylingJson: JSON.stringify({ buttonBgColor: "#0d9488", buttonTextColor: "#ffffff" }),
              },
            }),
        });
      }

      if (url.includes("/api/admin/subscriptions")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              plans: [
                {
                  id: "rn-pro",
                  name: "NCLEX-RN Complete Preparation",
                  slug: "rn-pro",
                  description: "Full question bank for RN candidates",
                  pathway: "RN",
                  planType: "pro",
                  price: 59,
                  billingInterval: "month",
                  features: ["Question Bank", "Rationales"],
                  isActive: true,
                },
                {
                  id: "prep-premium",
                  name: "NCLEX-RN & PN All-Access",
                  slug: "prep-premium",
                  description: "Dual access for RN & PN",
                  pathway: "Both",
                  planType: "premium",
                  price: 89,
                  billingInterval: "month",
                  features: ["Dual Access", "RATs"],
                  isActive: true,
                },
              ],
            }),
        });
      }

      if (url.includes("/api/admin/monetization/analytics/summary")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                grossRevenue: 28450,
                netRevenue: 28100,
                activeSubscriptionsCount: 312,
                totalOrdersCount: 340,
                pendingVerificationCount: 2,
                mrr: 14200,
                rnRevenue: 17200,
                pnRevenue: 8250,
                dualRevenue: 3000,
                paymentMethodBreakdown: {
                  Card: 15400,
                  "M-Pesa": 8800,
                  BankTransfer: 4250,
                },
              },
            }),
        });
      }

      if (url.includes("/api/admin/monetization/manual-authorizations")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              totalCount: 1,
              authorizations: [
                {
                  id: "auth-1",
                  userId: "user-1",
                  userName: "Grace Hopper",
                  userEmail: "grace@navy.mil",
                  planId: "rn-pro",
                  planName: "NCLEX-RN Complete Preparation",
                  course: "RN",
                  paymentMethod: "M-Pesa",
                  amount: 59,
                  currency: "USD",
                  transactionReference: "MPESA-QHD7289X",
                  status: "PendingVerification",
                  recordedBy: "admin@prepford.com",
                  recordedAt: "2026-11-07T08:00:00Z",
                },
              ],
            }),
        });
      }

      if (url.includes("/api/admin/monetization/learner-subscriptions")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              totalCount: 1,
              subscriptions: [
                {
                  id: "sub-1",
                  userId: "user-2",
                  userName: "Florence Nightingale",
                  userEmail: "florence@scutari.org",
                  planName: "NCLEX-RN Complete Preparation",
                  pathway: "RN",
                  startsAt: "2026-11-01T00:00:00Z",
                  expiresAt: "2026-12-01T00:00:00Z",
                  remainingDays: 24,
                  status: "Active",
                  isManual: false,
                },
              ],
            }),
        });
      }

      if (url.includes("/api/admin/monetization/transactions")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              totalCount: 1,
              transactions: [
                {
                  id: "tx-1",
                  orderId: "ord-882194",
                  userName: "Florence Nightingale",
                  userEmail: "florence@scutari.org",
                  planName: "NCLEX-RN Complete Preparation",
                  course: "RN",
                  paymentMethod: "Card",
                  transactionReference: "ch_3M4f9A2eZvKYlo2C",
                  amount: 59,
                  currency: "USD",
                  status: "Succeeded",
                  createdAt: "2026-11-01T12:00:00Z",
                },
              ],
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  it("renders monetization management navigation tabs", () => {
    renderWithQuery(<AdminSubscriptionsClient />);

    expect(screen.getByRole("tab", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Subscription Plans/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Card Appearance/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Manual Authorization/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Learner Subscriptions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Transactions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Revenue Analytics/i })).toBeInTheDocument();
  });

  it("switches to Manual Authorization tab and navigates via URL query state", () => {
    renderWithQuery(<AdminSubscriptionsClient />);

    const manualTab = screen.getByRole("tab", { name: /Manual Authorization/i });
    fireEvent.click(manualTab);

    expect(mockReplace).toHaveBeenCalledWith("/admin/subscriptions?tab=manual");
  });
});

describe("Plan Appearance & Typography Editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders appearance controls and live responsive canvas with WCAG AA compliance", async () => {
    renderWithQuery(<PlanAppearanceEditorTab />);

    await waitFor(() => {
      expect(
        screen.getByText("Subscription Card Appearance & Typography Customizer")
      ).toBeInTheDocument();
    });

    // Check WCAG AA indicators
    expect(screen.getByText(/WCAG AA Contrast Monitor/i)).toBeInTheDocument();
    expect(screen.getByText(/Title vs Card:/i)).toBeInTheDocument();

    // Check Responsive Viewport Buttons
    expect(screen.getByRole("button", { name: /Desktop/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tablet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mobile/i })).toBeInTheDocument();

    // Check Live Preview Render
    expect(screen.getByText("NCLEX-RN Starter")).toBeInTheDocument();
    expect(screen.getByText("NCLEX-RN & PN All-Access")).toBeInTheDocument();
  });

  it("changes viewport preview mode to Mobile", async () => {
    renderWithQuery(<PlanAppearanceEditorTab />);

    const mobileBtn = screen.getByRole("button", { name: /Mobile/i });
    fireEvent.click(mobileBtn);

    expect(mobileBtn.className).toContain("bg-primary/10");
  });
});

describe("Manual Subscription Authorization", () => {
  it("renders pending queue and displays manual payment reference", async () => {
    renderWithQuery(<ManualAuthorizationTab canManagePlans={true} />);

    await waitFor(() => {
      expect(screen.getByText("MPESA-QHD7289X")).toBeInTheDocument();
      expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
      expect(screen.getByText("$59 USD")).toBeInTheDocument();
    });

    // Verify button exists
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("opens the multi-step offline payment recording wizard", async () => {
    renderWithQuery(<ManualAuthorizationTab canManagePlans={true} />);

    const recordBtn = screen.getByRole("button", { name: /Record Offline Payment/i });
    fireEvent.click(recordBtn);

    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by full name, email address, or ID/i)).toBeInTheDocument();
  });
});

describe("Learner Subscriptions Management", () => {
  it("renders learner list with status and remaining days", async () => {
    renderWithQuery(<LearnerSubscriptionsTab canManagePlans={true} />);

    await waitFor(() => {
      expect(screen.getByText("Florence Nightingale")).toBeInTheDocument();
      expect(screen.getByText("24d")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Extend/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Suspend/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("opens extension modal and offers preset day options", async () => {
    renderWithQuery(<LearnerSubscriptionsTab canManagePlans={true} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Extend/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Extend/i }));

    expect(screen.getByText("Extend Learner Subscription")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+7 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+30 Days" })).toBeInTheDocument();
  });
});

describe("Transactions Ledger & Revenue Analytics", () => {
  it("renders transaction ledger records and export CSV button", async () => {
    renderWithQuery(<TransactionsLedgerTab canManagePlans={true} />);

    await waitFor(() => {
      expect(screen.getByText(/ord-882194/i)).toBeInTheDocument();
      expect(screen.getByText("ch_3M4f9A2eZvKYlo2C")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
    });
  });

  it("renders revenue analytics KPI cards and course splits", async () => {
    renderWithQuery(<RevenueAnalyticsTab canManagePlans={true} />);

    await waitFor(() => {
      expect(screen.getByText("$28,450.00")).toBeInTheDocument(); // Gross
      expect(screen.getByText("$28,100.00")).toBeInTheDocument(); // Net
      expect(screen.getByText("$14,200.00")).toBeInTheDocument(); // MRR
      expect(screen.getByText(/Course Revenue Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment Channel Share/i)).toBeInTheDocument();
    });
  });
});
