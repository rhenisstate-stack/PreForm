import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  archiveSubscriptionPlan,
  isValidHexColor,
  checkContrastRatio,
  type PlanMutationInput,
} from "@/lib/subscription-store";

export const dynamic = "force-dynamic";

interface AdminUserSession {
  role?: string;
  email?: string;
  [key: string]: unknown;
}

async function verifyAdminAuth(request?: Request) {
  let sessionCookieValue: string | undefined;

  try {
    const cookieStore = await cookies();
    sessionCookieValue = cookieStore.get("preform_session")?.value;
  } catch {
    // cookies() unavailable outside request scope
  }

  if (!sessionCookieValue && request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/preform_session=([^;]+)/);
      if (match) {
        sessionCookieValue = decodeURIComponent(match[1]);
      }
    }
  }

  if (!sessionCookieValue) {
    return { authorized: false, status: 401, error: "Authentication required" };
  }

  let session: AdminUserSession = {};
  try {
    session = JSON.parse(sessionCookieValue);
  } catch {
    return { authorized: false, status: 401, error: "Invalid session format" };
  }

  const role = (session.role || "").toLowerCase();
  const isPrivileged =
    role.includes("admin") ||
    role.includes("manager") ||
    role.includes("superadmin");

  if (!isPrivileged) {
    return { authorized: false, status: 403, error: "Administrative privilege required" };
  }

  return { authorized: true, user: session };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const plan = getSubscriptionPlanById(id);
  if (!plan) {
    return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, plan });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const existing = getSubscriptionPlanById(id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      audience,
      pathway,
      planType,
      price,
      originalPrice,
      currency,
      billingInterval,
      durationLabel,
      features,
      popular,
      bgColour,
      accentColour,
      textColour,
      badgeText,
      displayOrder,
      isActive,
      entitlements,
    } = body;

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ success: false, error: "Name must be non-empty" }, { status: 400 });
    }

    if (pathway !== undefined && !["RN", "PN", "Both"].includes(pathway)) {
      return NextResponse.json({ success: false, error: "Pathway must be 'RN', 'PN', or 'Both'" }, { status: 400 });
    }

    if (price !== undefined && (typeof price !== "number" || price <= 0 || isNaN(price))) {
      return NextResponse.json({ success: false, error: "Price must be a positive number" }, { status: 400 });
    }

    if (originalPrice !== undefined && originalPrice !== null) {
      if (typeof originalPrice !== "number" || originalPrice <= 0 || isNaN(originalPrice)) {
        return NextResponse.json({ success: false, error: "Original price must be positive if specified" }, { status: 400 });
      }
    }

    // Color and Contrast Validation Safeguards
    if (bgColour && !isValidHexColor(bgColour)) {
      return NextResponse.json({ success: false, error: "Background color must be a valid hex code" }, { status: 400 });
    }

    if (accentColour && !isValidHexColor(accentColour)) {
      return NextResponse.json({ success: false, error: "Accent color must be a valid hex code" }, { status: 400 });
    }

    if (textColour && !isValidHexColor(textColour)) {
      return NextResponse.json({ success: false, error: "Text color must be a valid hex code" }, { status: 400 });
    }

    const effectiveBg = bgColour || existing.bgColour;
    const effectiveText = textColour || existing.textColour;
    if (effectiveBg && effectiveText) {
      const contrast = checkContrastRatio(effectiveBg, effectiveText);
      if (contrast < 3.0) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient color contrast (${contrast.toFixed(1)}:1). Must be at least 3.0:1 for accessibility safety.`,
          },
          { status: 400 }
        );
      }
    }

    const updates: Partial<PlanMutationInput> = {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(audience !== undefined && { audience: audience.trim() }),
      ...(pathway !== undefined && { pathway }),
      ...(planType !== undefined && { planType }),
      ...(price !== undefined && { price }),
      ...(originalPrice !== undefined && { originalPrice: originalPrice || undefined }),
      ...(currency !== undefined && { currency }),
      ...(billingInterval !== undefined && { billingInterval }),
      ...(durationLabel !== undefined && { durationLabel: durationLabel.trim() }),
      ...(features !== undefined && { features: Array.isArray(features) ? features.map((f: unknown) => String(f).trim()).filter(Boolean) : [] }),
      ...(popular !== undefined && { popular: Boolean(popular) }),
      ...(bgColour !== undefined && { bgColour: bgColour.trim() }),
      ...(accentColour !== undefined && { accentColour: accentColour.trim() }),
      ...(textColour !== undefined && { textColour: textColour.trim() }),
      ...(badgeText !== undefined && { badgeText: badgeText.trim() }),
      ...(displayOrder !== undefined && { displayOrder }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(entitlements !== undefined && { entitlements }),
    };

    const updated = updateSubscriptionPlan(id, updates);
    return NextResponse.json({ success: true, plan: updated });
  } catch (error) {
    console.error("Admin subscriptions PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update subscription plan" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const archived = archiveSubscriptionPlan(id);
  if (!archived) {
    return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Subscription plan has been safely archived (deactivated) to preserve historical purchases.",
  });
}
