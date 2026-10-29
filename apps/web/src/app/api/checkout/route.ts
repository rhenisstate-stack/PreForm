import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createAuthoritativeCheckoutSession,
  isSandboxCheckoutPermitted,
  getAppEnvironment,
  type AuthoritativePlan,
} from "@/lib/payment-provider";
import { getSubscriptionPlanByIdOrSlug } from "@/lib/subscription-store";
import { upsertUserProfileMeta } from "@/lib/profile-image-db";
import { resolveSession, signSessionPayload } from "@/lib/session";

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

    // ── Authoritative Plan Lookup from Database ──
    const product = getSubscriptionPlanByIdOrSlug(planId);
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
      const isProd = getAppEnvironment() === "production";
      const statusCode = isProd ? 503 : 400;
      return NextResponse.json(
        {
          success: false,
          error: sessionResult.error,
          status: sessionResult.status,
          isSimulated: false,
        },
        { status: statusCode }
      );
    }

    // ── Safe Server-Controlled Sandbox Fulfillment (Non-Production Only) ──
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
      cookieStore.set("preform_session", updatedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

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
