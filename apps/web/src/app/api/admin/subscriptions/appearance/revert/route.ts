import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId") || undefined;

  try {
    const apiRes = await subscriptionService.revertAppearance(auth.session, planId);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to revert appearance" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Revert appearance error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
