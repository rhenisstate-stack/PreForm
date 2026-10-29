import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/api-services";
import {
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  archiveSubscriptionPlan,
  isValidHexColor,
  validateSubscriptionColors,
} from "@/lib/subscription-store";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  // 1. Query ASP.NET Core API
  if (auth.session) {
    const apiRes = await subscriptionService.getPlanByIdOrSlug(id, auth.session);
    if (apiRes.success && apiRes.data?.plan) {
      return NextResponse.json({ success: true, plan: apiRes.data.plan });
    }
  }

  // 2. Unit test / fallback store
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
    const effectiveAccent = accentColour || existing.accentColour;
    const effectiveText = textColour || existing.textColour;

    if (effectiveBg || effectiveAccent || effectiveText) {
      const colorCheck = validateSubscriptionColors({
        bgColour: effectiveBg,
        accentColour: effectiveAccent,
        textColour: effectiveText,
      });

      if (!colorCheck.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: `Contrast validation failed: ${colorCheck.errors.join("; ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Dispatch to ASP.NET Core API
    if (auth.session) {
      const apiRes = await subscriptionService.updatePlan(auth.session, id, body);
      if (apiRes.success && apiRes.data?.plan) {
        return NextResponse.json({ success: true, plan: apiRes.data.plan });
      }

      if (!apiRes.success && process.env.NODE_ENV !== "test") {
        return NextResponse.json(
          { success: false, error: apiRes.error || "Failed to update plan in backend datastore" },
          { status: apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : 503 }
        );
      }
    }

    // Unit test / fallback store
    const updated = updateSubscriptionPlan(id, {
      name: name?.trim(),
      description: description?.trim(),
      audience: audience?.trim(),
      pathway,
      planType,
      price,
      originalPrice,
      currency,
      billingInterval,
      durationLabel: durationLabel?.trim(),
      features,
      popular,
      bgColour,
      accentColour,
      textColour,
      badgeText: badgeText?.trim(),
      displayOrder,
      isActive,
      entitlements: Array.isArray(entitlements)
        ? (entitlements.filter((e) => e === "rn" || e === "pn") as ("rn" | "pn")[])
        : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Failed to update plan" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: updated });
  } catch (error) {
    console.error("Admin subscription PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update plan" }, { status: 500 });
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
  const existing = getSubscriptionPlanById(id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
  }

  try {
    // Dispatch to ASP.NET Core API
    if (auth.session) {
      const apiRes = await subscriptionService.archivePlan(auth.session, id);
      if (!apiRes.success && process.env.NODE_ENV !== "test") {
        return NextResponse.json(
          { success: false, error: apiRes.error || "Failed to archive plan in backend datastore" },
          { status: apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : 503 }
        );
      }
    }

    // Unit test / fallback store
    const archived = archiveSubscriptionPlan(id);
    if (!archived) {
      return NextResponse.json({ success: false, error: "Failed to archive plan" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Plan archived successfully" });
  } catch (error) {
    console.error("Admin subscription DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to archive plan" }, { status: 500 });
  }
}
