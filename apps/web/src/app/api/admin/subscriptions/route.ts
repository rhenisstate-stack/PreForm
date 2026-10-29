import { NextResponse } from "next/server";
import {
  getAllSubscriptionPlans,
  createSubscriptionPlan,
  validateSubscriptionColors,
  type PlanMutationInput,
} from "@/lib/subscription-store";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request?: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const plans = getAllSubscriptionPlans(true);
    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error("Admin subscriptions GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to query plans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
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

    // Field validations
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Plan name is required" }, { status: 400 });
    }

    if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug.trim())) {
      return NextResponse.json(
        { success: false, error: "Slug must be lowercase alphanumeric with hyphens (e.g. rn-pro)" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json({ success: false, error: "Plan description is required" }, { status: 400 });
    }

    if (!["RN", "PN", "Both"].includes(pathway)) {
      return NextResponse.json({ success: false, error: "Pathway must be 'RN', 'PN', or 'Both'" }, { status: 400 });
    }

    if (!["starter", "pro", "premium", "readiness"].includes(planType)) {
      return NextResponse.json({ success: false, error: "Invalid planType" }, { status: 400 });
    }

    if (typeof price !== "number" || price <= 0 || isNaN(price)) {
      return NextResponse.json({ success: false, error: "Price must be a positive number" }, { status: 400 });
    }

    if (originalPrice !== undefined && originalPrice !== null) {
      if (typeof originalPrice !== "number" || originalPrice <= 0 || isNaN(originalPrice)) {
        return NextResponse.json({ success: false, error: "Original price must be positive if specified" }, { status: 400 });
      }
    }

    if (!["month", "quarter", "one-time"].includes(billingInterval)) {
      return NextResponse.json({ success: false, error: "Invalid billing interval" }, { status: 400 });
    }

    if (!Array.isArray(features)) {
      return NextResponse.json({ success: false, error: "Features must be an array of strings" }, { status: 400 });
    }

    // Color and Contrast Validation Safeguards (WCAG AA: 4.5:1 for body/badge text, 3.0:1 for graphical UI)
    const colorValidation = validateSubscriptionColors({
      bgColour,
      textColour,
      accentColour,
    });

    if (!colorValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: colorValidation.errors[0] || "Invalid color or insufficient contrast ratio",
          contrastErrors: colorValidation.errors,
          textContrastRatio: colorValidation.textContrastRatio,
          accentContrastRatio: colorValidation.accentContrastRatio,
        },
        { status: 400 }
      );
    }

    const planInput: PlanMutationInput = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      audience: audience?.trim(),
      pathway,
      planType,
      price,
      originalPrice: originalPrice || undefined,
      currency: currency || "USD",
      billingInterval,
      durationLabel: durationLabel?.trim(),
      features: features.map((f: unknown) => String(f).trim()).filter(Boolean),
      popular: Boolean(popular),
      bgColour: bgColour?.trim(),
      accentColour: accentColour?.trim(),
      textColour: textColour?.trim(),
      badgeText: badgeText?.trim(),
      displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      isActive: isActive !== false,
      entitlements: Array.isArray(entitlements) ? entitlements : pathway === "Both" ? ["rn", "pn"] : [pathway.toLowerCase() as "rn" | "pn"],
    };

    const created = createSubscriptionPlan(planInput);
    return NextResponse.json({ success: true, plan: created }, { status: 201 });
  } catch (error) {
    console.error("Admin subscriptions POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create subscription plan" }, { status: 500 });
  }
}
