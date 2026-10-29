/**
 * Payment Provider Abstraction & Gateway Security Controller.
 *
 * Implements strict separation between client-facing cart presentation
 * and authoritative server-side payment execution. Prevents unverified
 * entitlement assignment and gates mock checkout strictly to non-production.
 */

export type AppEnvironment = "production" | "staging" | "development" | "test";

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
  isSimulated?: boolean;
  simulationNotice?: string;
}

/**
 * Resolves the effective application deployment environment.
 * Validates PREPFORD_ENV, APP_ENV, and NEXT_PUBLIC_APP_ENV before falling back to NODE_ENV.
 */
export function getAppEnvironment(): AppEnvironment {
  const explicitEnv = (
    process.env.PREPFORD_ENV ||
    process.env.APP_ENV ||
    process.env.NEXT_PUBLIC_APP_ENV ||
    ""
  ).toLowerCase().trim();

  if (explicitEnv === "production" || explicitEnv === "prod") return "production";
  if (explicitEnv === "staging" || explicitEnv === "stage") return "staging";
  if (explicitEnv === "development" || explicitEnv === "dev") return "development";
  if (explicitEnv === "test") return "test";

  // Fallback to NODE_ENV
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
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
 *
 * Isolation Rules:
 * 1. Production is ALWAYS blocked — no exceptions, even if ENABLE_MOCK_CHECKOUT="true".
 * 2. In Staging (even if built with NODE_ENV="production"), mock checkout requires explicit opt-in:
 *    ENABLE_MOCK_CHECKOUT="true" or NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT="true".
 * 3. In Development / Test, sandbox checkout is enabled for local automated QA.
 * 4. Any misconfigured or unrecognized environment fails closed.
 */
export function isSandboxCheckoutPermitted(): boolean {
  const env = getAppEnvironment();

  // Rule 1: Production fails closed unconditionally
  if (env === "production") {
    return false;
  }

  // Rule 2: Staging requires explicit opt-in
  if (env === "staging") {
    return (
      process.env.ENABLE_MOCK_CHECKOUT === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT === "true"
    );
  }

  // Rule 3: Development / Test environments permit local test simulation
  if (env === "development" || env === "test") {
    return true;
  }

  return false;
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
      isSimulated: false,
    };
  }

  const env = getAppEnvironment();

  // 1. Live Gateway Path (When production secrets are provided)
  if (isLivePaymentGatewayConfigured()) {
    // Live Stripe / Gateway implementation would initialize session here
    // with stripe.checkout.sessions.create({ ... }) using server-authoritative price.
    // For now, credentials are documented as required for live deployment.
    return {
      success: false,
      error: "Live payment provider initialization pending final merchant configuration.",
      status: "pending_provider",
      isSimulated: false,
    };
  }

  // 2. Production Guard: If in production with no gateway keys, strictly deny checkout
  if (env === "production") {
    return {
      success: false,
      error: "Payment gateway integration is pending configuration. Direct online checkout is temporarily disabled in production.",
      status: "pending_provider",
      isSimulated: false,
    };
  }

  // 3. Staging & Non-Production Sandbox Path (Controlled testing only)
  if (isSandboxCheckoutPermitted()) {
    const sandboxSessionId = `sand_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      sessionId: sandboxSessionId,
      checkoutUrl: `/profile?enrolled=true&sandbox_session=${sandboxSessionId}`,
      status: "sandbox_completed",
      isSimulated: true,
      simulationNotice: "SIMULATED CHECKOUT — Non-production staging/test transaction only. No real payment captured.",
    };
  }

  return {
    success: false,
    error: env === "staging"
      ? "Mock checkout is disabled in this staging environment. Set ENABLE_MOCK_CHECKOUT=true to permit sandbox validation."
      : "Checkout is unavailable in this environment.",
    status: "pending_provider",
    isSimulated: false,
  };
}
