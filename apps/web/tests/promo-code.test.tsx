import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CartProvider } from "@/lib/cart-context";
import { CartPageClient } from "@/app/cart/page-client";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
const mockRefreshSession = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "cand-1",
      email: "candidate@prepford.com",
      name: "Jane Candidate",
      displayName: "Jane Candidate",
      pathway: "rn",
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    registerUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: mockRefreshSession,
  }),
}));

describe("Phase 4: Promotional Discount Codes Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSearchParams = new URLSearchParams("add=rn-pro"); // $59 / mo
    global.fetch = vi.fn();
  });

  it("applies FUTURENURSE for 10% discount and updates order summary", async () => {
    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    // Initial subtotal for rn-pro is $59.00
    await waitFor(() => {
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });

    const promoInput = screen.getByLabelText(/Promotional code/i);
    const applyButton = screen.getByRole("button", { name: /^Apply$/i });

    fireEvent.change(promoInput, { target: { value: "FUTURENURSE" } });
    fireEvent.click(applyButton);

    // After 10% discount: 59 * 0.10 = $5.90 discount, total = $53.10
    await waitFor(() => {
      expect(screen.getByText("-$5.90")).toBeInTheDocument();
      expect(screen.getByText("$53.10")).toBeInTheDocument();
    });
  });

  it("applies CLINICAL20 for 20% discount and updates total to $47.20", async () => {
    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });

    const promoInput = screen.getByLabelText(/Promotional code/i);
    const applyButton = screen.getByRole("button", { name: /^Apply$/i });

    fireEvent.change(promoInput, { target: { value: "clinical20" } }); // test case insensitivity
    fireEvent.click(applyButton);

    // After 20% discount: 59 * 0.20 = $11.80 discount, total = $47.20
    await waitFor(() => {
      expect(screen.getByText("-$11.80")).toBeInTheDocument();
      expect(screen.getByText("$47.20")).toBeInTheDocument();
    });
  });

  it("normalizes legacy PREFORM10 to PREPFORD10 and applies 10% discount", async () => {
    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });

    const promoInput = screen.getByLabelText(/Promotional code/i);
    const applyButton = screen.getByRole("button", { name: /^Apply$/i });

    fireEvent.change(promoInput, { target: { value: "PREFORM10" } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("-$5.90")).toBeInTheDocument();
      expect(screen.getByText("$53.10")).toBeInTheDocument();
    });
  });

  it("shows an error when an invalid promo code is submitted", async () => {
    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });

    const promoInput = screen.getByLabelText(/Promotional code/i);
    const applyButton = screen.getByRole("button", { name: /^Apply$/i });

    fireEvent.change(promoInput, { target: { value: "INVALID99" } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid or expired/i);
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });
  });

  it("allows removing an applied promo code to restore full price", async () => {
    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });

    const promoInput = screen.getByLabelText(/Promotional code/i);
    const applyButton = screen.getByRole("button", { name: /^Apply$/i });

    fireEvent.change(promoInput, { target: { value: "NURSE10" } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("$53.10")).toBeInTheDocument();
    });

    const removeButton = screen.getByLabelText(/Remove promotional code/i);
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText("-$5.90")).not.toBeInTheDocument();
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });
  });

  it("passes promoCode in the body payload to /api/checkout", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, checkoutUrl: "/dashboard?checkout=completed" }),
    });

    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("$59.00")).toBeInTheDocument();
    });

    const promoInput = screen.getByLabelText(/Promotional code/i);
    const applyButton = screen.getByRole("button", { name: /^Apply$/i });

    fireEvent.change(promoInput, { target: { value: "PREPFORD10" } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("$53.10")).toBeInTheDocument();
    });

    const checkoutBtn = screen.getByRole("button", { name: /Proceed to Checkout/i });
    fireEvent.click(checkoutBtn);

    // Wait for Dialog to appear and confirm
    await waitFor(() => {
      expect(screen.getByText(/Confirm Subscription Checkout/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: /Confirm & Activate Study Access/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/checkout",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            planId: "rn-pro",
            promoCode: "PREPFORD10",
          }),
        })
      );
    });
  });
});
