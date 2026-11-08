import { NextResponse } from "next/server";
import { systemAnalyticsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || undefined;
  const pathway = searchParams.get("pathway") || undefined;

  const res = await systemAnalyticsService.getReviewsOverview(
    { timeRange, pathway },
    auth.session
  );

  return NextResponse.json(res.data || { success: false }, { status: res.status });
}
