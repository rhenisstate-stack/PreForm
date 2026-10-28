import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createAuthoritativeCheckoutSession,
  isSandboxCheckoutPermitted,
  type AuthoritativePlan,
} from "@/lib/payment-provider";
import { getSubscriptionPlanByIdOrSlug } from "@/lib/subscription-store";
import {
  deriveCandidateIdFromEmail,
  upsertUserProfileMeta,
} from "@/lib/profile-image-db";

interface CandidateSession {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  pathway?: "rn" | "pn" | "both";
  activePlan?: string;
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("preform_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { success: false, error: "Authentication required to initiate checkout." },
        { status: 401 }
      );
    }

    let sessionData: CandidateSession = {};
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid session." },
        { status: 401 }
      );
    }

    if (!sessionData.email) {
      return NextResponse.json(
        { success: false, error: "Session missing candidate email." },
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
      isActive: product.isActive !== false,
    };

    const userId =
      sessionData.sub || sessionData.id || deriveCandidateIdFromEmail(sessionData.email);

    const sessionResult = await createAuthoritativeCheckoutSession(
      {
        planId: product.id,
        candidateUserId: userId,
        candidateEmail: sessionData.email,
        candidateName: sessionData.displayName || sessionData.name || "Candidate",
      },
      authoritativePlan
    );

    if (!sessionResult.success) {
      const statusCode = process.env.NODE_ENV === "production" ? 503 : 400;
      return NextResponse.json(
        {
          success: false,
          error: sessionResult.error,
          status: sessionResult.status,
        },
        { status: statusCode }
      );
    }

    // ── Safe Server-Controlled Sandbox Fulfillment (Non-Production Only) ──
    if (sessionResult.status === "sandbox_completed" && isSandboxCheckoutPermitted()) {
      const updatedRecord = upsertUserProfileMeta({
        userId,
        email: sessionData.email,
        displayName: sessionData.displayName || sessionData.name || "Nursing Candidate",
        pathway: authoritativePathway,
        activePlan: product.name,
      });

      const updatedSession: CandidateSession = {
        ...sessionData,
        sub: updatedRecord.userId,
        displayName: updatedRecord.displayName,
        name: updatedRecord.displayName,
        pathway: authoritativePathway,
        activePlan: product.name,
        updatedAt: new Date().toISOString(),
      };

      cookieStore.set("preform_session", JSON.stringify(updatedSession), {
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
    });
  } catch (error) {
    console.error("Checkout POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during checkout initiation." },
      { status: 500 }
    );
  }
}
