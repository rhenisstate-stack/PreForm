import type { Metadata } from "next";
import { Suspense } from "react";
import { CartPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Shopping Cart | PrepFord NCLEX",
  description: "Review your NCLEX-RN and NCLEX-PN preparation plans and proceed to checkout.",
};

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground">Loading your cart...</p>
          </div>
        </div>
      }
    >
      <CartPageClient />
    </Suspense>
  );
}
