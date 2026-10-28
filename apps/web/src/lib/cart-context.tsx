"use client";

import * as React from "react";
import { type Product, getProductById } from "@/lib/products";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  addItem: (productId: string) => boolean;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "preform_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Re-hydrate with canonical server products to prevent tampered prices
          const validatedItems: CartItem[] = [];
          for (const item of parsed) {
            const product = getProductById(item.productId || item.product?.id);
            if (product) {
              validatedItems.push({
                product,
                quantity: 1, // Single-seat subscription
              });
            }
          }
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(validatedItems);
        }
      }
    } catch (e) {
      console.warn("Failed to read cart from localStorage:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage whenever items change
  React.useEffect(() => {
    if (!isInitialized) return;
    try {
      const serialized = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serialized));
    } catch (e) {
      console.warn("Failed to persist cart to localStorage:", e);
    }
  }, [items, isInitialized]);

  const addItem = React.useCallback((productId: string): boolean => {
    const product = getProductById(productId);
    if (!product) return false;

    setItems((prev) => {
      // If product already in cart, return existing list (single subscription)
      const exists = prev.some((i) => i.product.id === product.id);
      if (exists) return prev;

      // Standalone readiness assessment packs can be purchased alongside any subscription plan
      if (product.planType === "readiness") {
        return [...prev, { product, quantity: 1 }];
      }

      // If user is adding a recurring subscription plan, preserve any standalone readiness packs,
      // and replace any overlapping subscription plan (same pathway or "Both" all-access bundle)
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
  }, []);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const total = subtotal;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        total,
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
