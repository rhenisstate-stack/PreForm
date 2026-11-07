import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { id } = await params;
  try {
    const apiRes = await subscriptionService.getPlanEntitlements(auth.session, id);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to load plan entitlements" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Get plan entitlements error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const entitlementCodes: string[] = Array.isArray(body.entitlementCodes) ? body.entitlementCodes : [];
    const apiRes = await subscriptionService.configurePlanEntitlements(auth.session, id, entitlementCodes);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to configure entitlements" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Configure plan entitlements error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
