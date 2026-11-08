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
  const category = searchParams.get("category") || undefined;
  const limit = Number(searchParams.get("limit")) || 20;

  const res = await systemAnalyticsService.getAdminActivity(
    { timeRange, category, limit },
    auth.session
  );

  return NextResponse.json(res.data || { success: false }, { status: res.status });
}
