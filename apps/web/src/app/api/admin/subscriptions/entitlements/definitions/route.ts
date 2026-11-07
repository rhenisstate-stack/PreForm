import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  try {
    const apiRes = await subscriptionService.getEntitlementDefinitions(auth.session);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to load entitlement definitions" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Get entitlement definitions error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
