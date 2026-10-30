"use client";

import * as React from "react";
import { type Product, getProductById } from "@/lib/products";

export interface CartItem {
  product: Product;
  quantity: number;
}

export const ACTIVE_PROMO_CODES: Record<string, { percent: number; description: string }> = {
  FUTURENURSE: { percent: 10, description: "10% Future Nurse Community Discount" },
  NURSE10: { percent: 10, description: "10% Nursing Student Discount" },
  PREPFORD10: { percent: 10, description: "10% PrepFord Welcome Discount" },
  CLINICAL20: { percent: 20, description: "20% Clinical Excellence Discount" },
};

export interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  discountAmount: number;
  appliedPromoCode: string | null;
  promoDiscountPercent: number;
  promoStatusMessage: string | null;
  promoError: string | null;
  applyPromoCode: (code: string) => { success: boolean; message?: string; error?: string };
  removePromoCode: () => void;
  addItem: (productId: string) => boolean;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "prepford_cart";
const LEGACY_CART_STORAGE_KEY = "preform_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [appliedPromoCode, setAppliedPromoCode] = React.useState<string | null>(null);
  const [promoDiscountPercent, setPromoDiscountPercent] = React.useState<number>(0);
  const [promoStatusMessage, setPromoStatusMessage] = React.useState<string | null>(null);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Load from localStorage on mount (checking prepford_cart first, then preform_cart)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem(LEGACY_CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        let rawItems: unknown[] = [];
        let storedPromo: string | null = null;

        if (Array.isArray(parsed)) {
          rawItems = parsed;
        } else if (parsed && typeof parsed === "object") {
          rawItems = Array.isArray(parsed.items) ? parsed.items : [];
          if (typeof parsed.promoCode === "string" && parsed.promoCode.trim()) {
            storedPromo = parsed.promoCode.trim().toUpperCase();
          }
        }

        const validatedItems: CartItem[] = [];
        for (const item of rawItems) {
          const castItem = item as { productId?: string; product?: { id?: string } };
          const productId = castItem.productId || castItem.product?.id;
          if (productId) {
            const product = getProductById(productId);
            if (product) {
              validatedItems.push({
                product,
                quantity: 1,
              });
            }
          }
        }
        setItems(validatedItems);

        if (storedPromo) {
          // Normalize legacy PREFORM10 to PREPFORD10
          if (storedPromo === "PREFORM10") storedPromo = "PREPFORD10";
          const promo = ACTIVE_PROMO_CODES[storedPromo];
          if (promo) {
            setAppliedPromoCode(storedPromo);
            setPromoDiscountPercent(promo.percent);
            setPromoStatusMessage(`${promo.percent}% off applied with ${storedPromo}`);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load cart from localStorage:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage on state change
  React.useEffect(() => {
    if (!isInitialized) return;
    try {
      const serializedItems = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));
      const payload = {
        items: serializedItems,
        promoCode: appliedPromoCode,
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to persist cart to localStorage:", e);
    }
  }, [items, appliedPromoCode, isInitialized]);

  const applyPromoCode = React.useCallback(
    (code: string): { success: boolean; message?: string; error?: string } => {
      setPromoError(null);
      setPromoStatusMessage(null);

      if (!code || !code.trim()) {
        const err = "Please enter a promotional code.";
        setPromoError(err);
        return { success: false, error: err };
      }

      let cleanCode = code.trim().toUpperCase();
      // Graceful brand migration alias
      if (cleanCode === "PREFORM10") cleanCode = "PREPFORD10";

      const promo = ACTIVE_PROMO_CODES[cleanCode];
      if (!promo) {
        const err = `The code '${cleanCode}' is invalid or expired. Try FUTURENURSE for 10% off.`;
        setPromoError(err);
        return { success: false, error: err };
      }

      setAppliedPromoCode(cleanCode);
      setPromoDiscountPercent(promo.percent);
      const msg = `${promo.percent}% off applied: ${promo.description}`;
      setPromoStatusMessage(msg);
      return { success: true, message: msg };
    },
    []
  );

  const removePromoCode = React.useCallback(() => {
    setAppliedPromoCode(null);
    setPromoDiscountPercent(0);
    setPromoStatusMessage(null);
    setPromoError(null);
  }, []);

  const addItem = React.useCallback((productId: string): boolean => {
    const product = getProductById(productId);
    if (!product) return false;

    setItems((prev) => {
      const exists = prev.some((i) => i.product.id === product.id);
      if (exists) return prev;

      if (product.planType === "readiness") {
        return [...prev, { product, quantity: 1 }];
      }

      const filtered = prev.filter((i) => {
        if (i.product.planType === "readiness") return true;
        const overlapsPathway =
          i.product.pathway === product.pathway ||
          i.product.pathway === "Both" ||
          product.pathway === "Both";
        return !overlapsPathway;
      });
      return [...filtered, { product, quantity: 1 }];
    });

    return true;
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
    setAppliedPromoCode(null);
    setPromoDiscountPercent(0);
    setPromoStatusMessage(null);
    setPromoError(null);
  }, []);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = promoDiscountPercent > 0 ? (subtotal * promoDiscountPercent) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        total,
        discountAmount,
        appliedPromoCode,
        promoDiscountPercent,
        promoStatusMessage,
        promoError,
        applyPromoCode,
        removePromoCode,
        addItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const defaultCartContext: CartContextType = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  total: 0,
  discountAmount: 0,
  appliedPromoCode: null,
  promoDiscountPercent: 0,
  promoStatusMessage: null,
  promoError: null,
  applyPromoCode: () => ({ success: false, error: "Cart not ready" }),
  removePromoCode: () => {},
  addItem: () => false,
  removeItem: () => {},
  clearCart: () => {},
};

export function useCart(): CartContextType {
  const context = React.useContext(CartContext);
  if (!context) {
    return defaultCartContext;
  }
  return context;
}
