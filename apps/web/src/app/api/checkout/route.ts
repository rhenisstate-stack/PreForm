import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  checkoutService,
  subscriptionService,
  type BackendSubscriptionPlan,
} from "@/lib/api-services";
import {
  createAuthoritativeCheckoutSession,
  isSandboxCheckoutPermitted,
  getAppEnvironment,
  type AuthoritativePlan,
} from "@/lib/payment-provider";
import { getSubscriptionPlanByIdOrSlug } from "@/lib/subscription-store";
import type { Product } from "@/lib/products";
import { upsertUserProfileMeta } from "@/lib/profile-image-db";
import { resolveSession, signSessionPayload, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await resolveSession(request);

    if (!session || !session.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required to initiate checkout." },
        { status: 401 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const planId = typeof body.planId === "string" ? body.planId.trim() : null;
    if (!planId) {
      return NextResponse.json(
        { success: false, error: "Plan identifier is required." },
        { status: 400 }
      );
    }

    // ── 1. Authoritative Plan Lookup from ASP.NET Core API or Catalog Store ──
    let product: BackendSubscriptionPlan | Product | null = null;
    const planRes = await subscriptionService.getPlanByIdOrSlug(planId, session);
    if (planRes.success && planRes.data?.plan) {
      product = planRes.data.plan;
    } else {
      product = getSubscriptionPlanByIdOrSlug(planId) ?? null;
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Plan '${planId}' does not exist in the catalogue.` },
        { status: 404 }
      );
    }

    if (product.isActive === false) {
      return NextResponse.json(
        { success: false, error: "The requested plan is currently archived or inactive." },
        { status: 400 }
      );
    }

    const authoritativePathway: "rn" | "pn" | "both" =
      product.pathway === "Both" ||
      (product.entitlements?.includes("rn") && product.entitlements?.includes("pn"))
        ? "both"
        : product.pathway === "PN" || product.entitlements?.includes("pn")
          ? "pn"
          : "rn";

    const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim() : undefined;

    // ── 2. Dispatch to Authoritative ASP.NET Core Checkout API ──
    const apiRes = await checkoutService.createCheckoutSession(session, {
      planId: product.id,
      pathway: authoritativePathway,
      promoCode,
      successUrl: typeof body.successUrl === "string" ? body.successUrl : undefined,
      cancelUrl: typeof body.cancelUrl === "string" ? body.cancelUrl : undefined,
    });

    if (apiRes.success && apiRes.data?.success) {
      const checkoutData = apiRes.data;

      // Update session cookie with updated entitlements
      const updatedToken = signSessionPayload({
        sid: session.sessionId,
        sub: session.userId,
        email: session.email,
        displayName: session.displayName || "Nursing Candidate",
        name: session.displayName || "Nursing Candidate",
        role: session.role,
        pathway: authoritativePathway,
        activePlan: product.name,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
        updatedAt: new Date().toISOString(),
      });

      const cookieStore = await cookies();
      setSessionCookie(cookieStore, updatedToken, 60 * 60 * 24 * 30);

      return NextResponse.json({
        success: true,
        sessionId: checkoutData.sessionId || checkoutData.orderId,
        checkoutUrl: checkoutData.sessionUrl || checkoutData.checkoutUrl || "/dashboard?checkout=success",
        isSimulated: checkoutData.isSimulated ?? true,
        simulationNotice:
          checkoutData.simulationNotice ||
          checkoutData.message ||
          "Staging sandbox transaction processed without live charges.",
        plan: {
          id: product.id,
          name: product.name,
          pathway: authoritativePathway,
        },
      });
    }

    // Fail-Closed Policy: In non-test environments, fail if backend rejects or is unreachable
    if (process.env.NODE_ENV !== "test") {
      const isProd = getAppEnvironment() === "production";
      const statusCode = apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : isProd ? 503 : 400;
      return NextResponse.json(
        {
          success: false,
          error: apiRes.error || "Checkout initiation failed on backend authority.",
          isSimulated: false,
        },
        { status: statusCode }
      );
    }

    // ── 3. Unit Test Fallback (Non-production test suite only) ──
    const authoritativePlan: AuthoritativePlan = {
      id: product.id,
      name: product.name,
      price: product.price,
      priceCents: Math.round(product.price * 100),
      currency: product.currency || "USD",
      pathway: authoritativePathway,
      billingInterval: product.billingInterval,
      isActive: Boolean(product.isActive ?? true),
    };

    const sessionResult = await createAuthoritativeCheckoutSession(
      {
        planId: product.id,
        candidateUserId: session.userId,
        candidateEmail: session.email,
        candidateName: session.displayName || "Candidate",
      },
      authoritativePlan
    );

    if (!sessionResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sessionResult.error,
          status: sessionResult.status,
          isSimulated: false,
        },
        { status: 400 }
      );
    }

    if (sessionResult.status === "sandbox_completed" && isSandboxCheckoutPermitted()) {
      const updatedRecord = upsertUserProfileMeta({
        userId: session.userId,
        email: session.email,
        displayName: session.displayName || "Nursing Candidate",
        pathway: authoritativePathway,
        activePlan: product.name,
      });

      const updatedToken = signSessionPayload({
        sid: session.sessionId,
        sub: updatedRecord.userId,
        email: session.email,
        displayName: updatedRecord.displayName,
        name: updatedRecord.displayName,
        role: session.role,
        pathway: authoritativePathway,
        activePlan: product.name,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
        updatedAt: new Date().toISOString(),
      });

      const cookieStore = await cookies();
      setSessionCookie(cookieStore, updatedToken, 60 * 60 * 24 * 30);

      return NextResponse.json({
        success: true,
        sessionId: sessionResult.sessionId,
        checkoutUrl: sessionResult.checkoutUrl,
        isSimulated: true,
        simulationNotice: sessionResult.simulationNotice,
        plan: {
          id: authoritativePlan.id,
          name: authoritativePlan.name,
          pathway: authoritativePlan.pathway,
        },
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.checkoutUrl,
      isSimulated: false,
    });
  } catch (error) {
    console.error("Checkout POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during checkout initiation." },
      { status: 500 }
    );
  }
}
