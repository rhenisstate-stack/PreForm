import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CartProvider, useCart } from "@/lib/cart-context";
import { CartPageClient } from "@/app/cart/page-client";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockAuthState = {
  user: null as null | {
    id: string;
    email: string;
    name: string;
    displayName: string;
    pathway: "rn" | "pn";
  },
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  registerUser: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
};

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
  useAuth: () => mockAuthState,
}));

function CartHarness() {
  const { items, subtotal, addItem, removeItem, clearCart } = useCart();
  return (
    <div>
      <div data-testid="cart-ids">{items.map((i) => i.product.id).join(",")}</div>
      <div data-testid="cart-subtotal">{subtotal}</div>
      <button type="button" onClick={() => addItem("pn-readiness")}>
        Add PN Readiness
      </button>
      <button type="button" onClick={() => addItem("pn-starter")}>
        Add PN Starter Monthly
      </button>
      <button type="button" onClick={() => addItem("pn-pro")}>
        Add PN Pro Monthly
      </button>
      <button type="button" onClick={() => addItem("pn-pro-90")}>
        Add PN Pro 90
      </button>
      <button type="button" onClick={() => addItem("prep-premium-90")}>
        Add Premium 90
      </button>
      <button type="button" onClick={() => removeItem("pn-readiness")}>
        Remove PN Readiness
      </button>
      <button type="button" onClick={() => clearCart()}>
        Clear Cart
      </button>
    </div>
  );
}

describe("Cart Context & Checkout Verification (NCLEX-PN)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSearchParams = new URLSearchParams();
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      registerUser: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    };
  });

  it("preserves standalone pn-readiness pack regardless of whether it is added before or after a PN subscription plan", () => {
    render(
      <CartProvider>
        <CartHarness />
      </CartProvider>
    );

    // Add standalone readiness pack first, then 90-day PN Pro subscription
    fireEvent.click(screen.getByText("Add PN Readiness"));
    expect(screen.getByTestId("cart-ids").textContent).toBe("pn-readiness");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("39");

    fireEvent.click(screen.getByText("Add PN Pro 90"));
    expect(screen.getByTestId("cart-ids").textContent).toBe("pn-readiness,pn-pro-90");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("188");

    // Switching from PN Pro 90 to PN Starter Monthly replaces the subscription but keeps pn-readiness
    fireEvent.click(screen.getByText("Add PN Starter Monthly"));
    expect(screen.getByTestId("cart-ids").textContent).toBe("pn-readiness,pn-starter");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("68");

    // Upgrading to RN & PN All-Access 90-Day replaces the single-pathway PN subscription without duplicating
    fireEvent.click(screen.getByText("Add Premium 90"));
    expect(screen.getByTestId("cart-ids").textContent).toBe("pn-readiness,prep-premium-90");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("268");

    // Removing pn-readiness leaves only prep-premium-90
    fireEvent.click(screen.getByText("Remove PN Readiness"));
    expect(screen.getByTestId("cart-ids").textContent).toBe("prep-premium-90");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("229");
  });

  it("rehydrates cart from localStorage using canonical server prices and drops tampered prices or invalid IDs", async () => {
    localStorage.setItem(
      "preform_cart",
      JSON.stringify([
        { productId: "pn-pro-90", quantity: 5, product: { id: "pn-pro-90", price: 1 } },
        { productId: "invalid-product-id", quantity: 1 },
      ])
    );

    render(
      <CartProvider>
        <CartHarness />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("cart-ids").textContent).toBe("pn-pro-90");
      expect(screen.getByTestId("cart-subtotal").textContent).toBe("149");
    });
  });

  it("renders 90-day quarterly duration, savings badge, and USD / 90 days billing label on /cart?add=pn-pro-90", async () => {
    mockSearchParams = new URLSearchParams("add=pn-pro-90");

    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("NCLEX-PN Complete Preparation (90-Day)")).toBeTruthy();
    });

    expect(screen.getByText("90-Day Quarterly Access")).toBeTruthy();
    expect(screen.getByText("90-Day Subscription")).toBeTruthy();
    expect(screen.getByText(/USD \/ 90 days/i)).toBeTruthy();
    expect(screen.getByText("$177.00")).toBeTruthy();
    expect(screen.getByText("Save $28")).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith("/cart", { scroll: false });
  });

  it("renders NCLEX-RN & PN badge (not NCLEX-Both) for prep-premium-90 and redirects signed-out users to /sign-in?from=/cart", async () => {
    mockSearchParams = new URLSearchParams("add=prep-premium-90");

    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("NCLEX-RN & PN All-Access (90-Day)")).toBeTruthy();
    });

    expect(screen.getByText("NCLEX-RN & PN")).toBeTruthy();
    expect(screen.queryByText("NCLEX-Both")).toBeNull();

    const signInCheckoutBtn = screen.getByRole("button", { name: /Sign In to Checkout/i });
    fireEvent.click(signInCheckoutBtn);
    expect(mockPush).toHaveBeenCalledWith("/sign-in?from=/cart");
  });

  it("renders non-recurring assessment pack checkout modal for pn-readiness and prevents duplicate submission", async () => {
    mockSearchParams = new URLSearchParams("add=pn-readiness");
    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: true,
      user: {
        id: "cand-pn-1",
        email: "pn.candidate@prepford.com",
        name: "Grace LPN",
        displayName: "Grace LPN",
        pathway: "pn",
      },
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(
      <CartProvider>
        <CartPageClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("NCLEX-PN Readiness Assessment Pack")).toBeTruthy();
    });

    expect(screen.getAllByText("One-Time Assessment Pack").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/USD \/ one-time pack/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Proceed to Checkout/i }));

    await waitFor(() => {
      expect(screen.getByText("Confirm Assessment Pack Checkout")).toBeTruthy();
    });

    expect(screen.getByText(/one-time assessment pack \(non-recurring\)/i)).toBeTruthy();

    const confirmBtn = screen.getByRole("button", { name: /Confirm & Activate Study Access/i });
    fireEvent.click(confirmBtn);
    // Second click while activating should be ignored
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    fetchSpy.mockRestore();
  });
});
