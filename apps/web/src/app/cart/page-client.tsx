"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CartPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();
  const { isAuthenticated, user, refreshSession } = useAuth();

  const [promoCode, setPromoCode] = React.useState("");
  const [promoApplied, setPromoApplied] = React.useState<number | null>(null);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = React.useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);

  const { items, itemCount, subtotal, removeItem, clearCart, addItem } = cart;

  const hasRecurringSubscription = items.some(
    (item) => item.product.billingInterval !== "one-time"
  );
  const cartPathwayLabel =
    items.length > 0
      ? Array.from(
          new Set(
            items.map((item) =>
              item.product.pathway === "Both" ? "RN & PN" : item.product.pathway
            )
          )
        ).join(" + ")
      : (user?.pathway || "RN").toUpperCase();

  // Process ?add=<productId> from query string
  React.useEffect(() => {
    const addParam = searchParams.get("add");
    if (addParam) {
      const added = addItem(addParam);
      if (added) {
        // Strip the query param from the URL to avoid re-adding on refresh
        router.replace("/cart", { scroll: false });
      }
    }
  }, [searchParams, addItem, router]);

  const discountAmount = promoApplied ? subtotal * promoApplied : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);

    const cleanCode = promoCode.trim().toUpperCase();
    if (cleanCode === "NURSE10" || cleanCode === "PREPFORD10" || cleanCode === "PREFORM10" || cleanCode === "FUTURENURSE") {
      setPromoApplied(0.1); // 10% discount
    } else if (cleanCode === "CLINICAL20") {
      setPromoApplied(0.2); // 20% discount
    } else if (cleanCode === "") {
      setPromoError("Please enter a valid promotional code.");
    } else {
      setPromoError("Invalid code. Try using 'FUTURENURSE' for 10% off.");
    }
  };

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      router.push("/sign-in?from=/cart");
      return;
    }
    setIsCheckingOut(true);
  };

  const handleConfirmCheckout = async () => {
    if (checkoutSuccess) return;
    setCheckoutError(null);
    setCheckoutSuccess(true);

    const primaryItem = items[0];
    if (!primaryItem) {
      setIsCheckingOut(false);
      setCheckoutSuccess(false);
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: primaryItem.product.slug || primaryItem.product.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await refreshSession();
        clearCart();
        setIsCheckingOut(false);
        router.push(data.checkoutUrl || "/profile?enrolled=true");
      } else {
        setCheckoutSuccess(false);
        setCheckoutError(data.error || "Checkout could not be processed.");
      }
    } catch {
      setCheckoutSuccess(false);
      setCheckoutError("Failed to communicate with the checkout service. Please try again.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb & Heading */}
        <div className="mb-8">
          <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Cart</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-foreground">Review Your Cart</h1>
            {itemCount > 0 && (
              <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                {itemCount} {itemCount === 1 ? "Plan" : "Plans"}
              </Badge>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto max-w-[200px] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs p-1 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/illustrations/prepford-empty-recent-activity.png"
                alt="Empty study plan cart"
                className="w-full h-auto object-contain"
              />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-foreground">Your cart is currently empty</h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              Explore our NCLEX-RN and NCLEX-PN pathways to choose a preparation plan tailored to your exam target. Every plan includes original NGN and practical nursing questions, detailed clinical rationales, and readiness assessments.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm">
                <Link href="/subscriptions?programme=RN">
                  Browse NCLEX-RN Plans
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-medium">
                <Link href="/subscriptions?programme=PN">
                  Browse NCLEX-PN Plans
                </Link>
              </Button>
            </div>

            <div className="mt-8 pt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-secondary" />
              <span>All plans include immediate study workspace and Study Guide access upon confirmation.</span>
            </div>
          </div>
        ) : (
          /* Populated Cart State */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Preparation Plan
                </span>
                <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Price
                </span>
              </div>

              {items.map(({ product }) => (
                <Card key={product.id} className="border-border bg-card shadow-sm hover:shadow transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-semibold text-xs border-secondary/40 text-secondary">
                            {product.pathway === "Both" ? "NCLEX-RN & PN" : `NCLEX-${product.pathway}`}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {product.planType === "readiness"
                              ? "One-Time Assessment Pack"
                              : product.billingInterval === "quarter"
                                ? "90-Day Subscription"
                                : "Monthly Subscription"}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {product.durationLabel ??
                              (product.billingInterval === "month"
                                ? "30-Day Monthly Access"
                                : product.billingInterval === "quarter"
                                  ? "90-Day Quarterly Access"
                                  : "One-Time Access")}
                          </span>
                        </div>

                        <h3 className="text-xl font-serif font-bold text-foreground">
                          {product.name}
                        </h3>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {product.description}
                        </p>

                        <div className="pt-2">
                          <p className="text-xs font-semibold text-foreground mb-1.5">Includes:</p>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                            {product.features.map((f) => (
                              <li key={f} className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Price & Remove Button */}
                      <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-border">
                        <div>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <div className="text-xs text-muted-foreground line-through">
                              ${product.originalPrice.toFixed(2)}
                            </div>
                          )}
                          <div className="text-2xl font-serif font-bold text-foreground">
                            ${product.price.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.currency} /{" "}
                            {product.billingInterval === "month"
                              ? "mo"
                              : product.billingInterval === "quarter"
                                ? "90 days"
                                : "one-time pack"}
                          </div>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <div className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              Save ${(product.originalPrice - product.price).toFixed(0)}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline p-1"
                          aria-label={`Remove ${product.name} from cart`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="pt-4 flex items-center justify-between text-sm">
                <Link
                  href="/subscriptions"
                  className="inline-flex items-center gap-1.5 font-medium text-secondary hover:underline"
                >
                  <span>← Continue browsing preparation plans</span>
                </Link>
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="text-xs text-muted-foreground hover:text-destructive underline"
                >
                  Clear all items
                </button>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-4 border-b border-border">
                  <CardTitle className="text-lg font-serif font-bold text-foreground">
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({itemCount} item{itemCount > 1 ? "s" : ""})</span>
                    <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span>
                  </div>

                  {promoApplied && (
                    <div className="flex items-center justify-between text-sm text-secondary">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        Promo Discount ({(promoApplied * 100).toFixed(0)}%)
                      </span>
                      <span className="font-medium">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Estimated Tax
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Exempt</span>
                    </span>
                    <span className="font-medium text-foreground">$0.00</span>
                  </div>

                  <div className="border-t border-border pt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-base font-bold text-foreground">Total Due</span>
                      <p className="text-[11px] text-muted-foreground">Includes all platform study tools</p>
                    </div>
                    <span className="text-2xl font-serif font-bold text-foreground">
                      ${finalTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Promo Code Form */}
                  <form onSubmit={handleApplyPromo} className="pt-3 border-t border-border">
                    <label htmlFor="promo-code" className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Have a promotional code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="promo-code"
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="e.g. FUTURENURSE"
                        className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary uppercase"
                      />
                      <Button type="submit" variant="outline" size="sm" className="text-xs">
                        Apply
                      </Button>
                    </div>
                    {promoApplied && (
                      <p className="mt-1 text-xs text-secondary font-medium">
                        Code applied: {(promoApplied * 100).toFixed(0)}% off your order!
                      </p>
                    )}
                    {promoError && (
                      <p className="mt-1 text-xs text-destructive">
                        {promoError}
                      </p>
                    )}
                  </form>
                </CardContent>

                <CardFooter className="p-6 pt-0 flex flex-col gap-3">
                  <Button
                    size="lg"
                    onClick={handleCheckoutClick}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md flex items-center justify-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{isAuthenticated ? "Proceed to Checkout" : "Sign In to Checkout"}</span>
                  </Button>

                  <div className="space-y-2 pt-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span>256-bit SSL encrypted checkout</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span>Transparent pricing with no hidden fees</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span>Immediate access upon account confirmation</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Confirmation Modal */}
      <Dialog open={isCheckingOut} onOpenChange={setIsCheckingOut}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif text-foreground">
              {hasRecurringSubscription
                ? "Confirm Subscription Checkout"
                : "Confirm Assessment Pack Checkout"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Review your candidate study access order before finalizing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-lg bg-muted p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Candidate Account:</span>
                <span className="font-semibold text-foreground">{user?.displayName || user?.name || "Candidate"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-foreground">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected Pathway:</span>
                <span className="font-semibold text-secondary uppercase">{cartPathwayLabel}</span>
              </div>
              <div className="border-t border-border pt-2 space-y-1.5">
                {items.map(({ product }) => (
                  <div key={product.id} className="flex justify-between text-foreground">
                    <span>
                      {product.name} ({product.billingInterval === "one-time" ? "One-Time" : product.billingInterval === "quarter" ? "90 Days" : "Monthly"})
                    </span>
                    <span className="font-semibold">${product.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-foreground">
                <span>Total Amount:</span>
                <span>${finalTotal.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="rounded-md border border-secondary/30 bg-secondary/10 p-3 text-xs text-foreground space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-secondary">
                <ShieldCheck className="h-4 w-4" />
                <span>Authoritative Checkout Security</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Order details are verified against authoritative plan records. Transactions are processed securely via server-validated session tokens.
              </p>
            </div>

            {checkoutError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {checkoutSuccess && !checkoutError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300 text-xs font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span>Order verified! Launching candidate profile...</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCheckingOut(false)}
              disabled={checkoutSuccess}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCheckout}
              disabled={checkoutSuccess}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm"
            >
              {checkoutSuccess ? "Activating..." : "Confirm & Activate Study Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
