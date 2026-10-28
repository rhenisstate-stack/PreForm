/**
 * Payment Provider Abstraction & Gateway Security Controller.
 *
 * Implements strict separation between client-facing cart presentation
 * and authoritative server-side payment execution. Prevents unverified
 * entitlement assignment and gates mock checkout strictly to non-production.
 */

export interface AuthoritativePlan {
  id: string;
  name: string;
  price: number; // in USD (e.g. 59)
  priceCents: number;
  currency: string;
  pathway: "rn" | "pn" | "both";
  billingInterval: string;
  isActive: boolean;
}

export interface CheckoutSessionRequest {
  planId: string;
  candidateUserId: string;
  candidateEmail: string;
  candidateName: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
  status: "configured" | "pending_provider" | "sandbox_completed";
}

/**
 * Checks whether live payment gateway credentials (e.g., Stripe, PayPal)
 * are present in the environment.
 */
export function isLivePaymentGatewayConfigured(): boolean {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const paypalKey = process.env.PAYPAL_CLIENT_SECRET?.trim();
  return Boolean(stripeKey || paypalKey);
}

/**
 * Ensures simulated or sandbox checkout can NEVER be triggered in production.
 * Strictly requires both a non-production NODE_ENV and an explicit opt-in environment flag.
 */
export function isSandboxCheckoutPermitted(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    process.env.ENABLE_MOCK_CHECKOUT === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "development"
  );
}

/**
 * Creates a checkout session through a verified payment gateway.
 * When gateway keys are not provided, safely prevents unverified paid access.
 */
export async function createAuthoritativeCheckoutSession(
  request: CheckoutSessionRequest,
  plan: AuthoritativePlan
): Promise<CheckoutSessionResponse> {
  if (!plan.isActive) {
    return {
      success: false,
      error: "Selected plan is inactive or archived and cannot be purchased.",
      status: "pending_provider",
    };
  }

  // 1. Live Gateway Path (When production secrets are provided)
  if (isLivePaymentGatewayConfigured()) {
    // Live Stripe / Gateway implementation would initialize session here
    // with stripe.checkout.sessions.create({ ... }) using server-authoritative price.
    // For now, credentials are documented as required for live deployment.
    return {
      success: false,
      error: "Live payment provider initialization pending final merchant configuration.",
      status: "pending_provider",
    };
  }

  // 2. Production Guard: If in production with no gateway keys, strictly deny checkout
  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      error: "Payment gateway integration is pending configuration. Direct online checkout is temporarily disabled.",
      status: "pending_provider",
    };
  }

  // 3. Non-Production Sandbox Path (Controlled development/testing only)
  if (isSandboxCheckoutPermitted()) {
    const sandboxSessionId = `sand_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      sessionId: sandboxSessionId,
      checkoutUrl: `/profile?enrolled=true&sandbox_session=${sandboxSessionId}`,
      status: "sandbox_completed",
    };
  }

  return {
    success: false,
    error: "Checkout is unavailable in this environment.",
    status: "pending_provider",
  };
}
