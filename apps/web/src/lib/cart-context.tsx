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

      // If user is adding another plan for the same pathway, replace it so they don't buy duplicate subscriptions
      const filtered = prev.filter((i) => i.product.pathway !== product.pathway || product.planType === "readiness");
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

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
