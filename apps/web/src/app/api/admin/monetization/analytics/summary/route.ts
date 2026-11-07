import { NextResponse } from "next/server";
import { monetizationService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const courseFilter = searchParams.get("courseFilter") || undefined;

  try {
    const apiRes = await monetizationService.getAnalyticsSummary(auth.session, courseFilter);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to load monetization summary" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Monetization analytics error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
