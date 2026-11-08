import { NextResponse } from "next/server";
import { learnerReportsService, AnalyticsFilter } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";
import { enforceLearnerPathway } from "@/lib/pathway-enforcement";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedPathway = searchParams.get("pathway");
  const check = enforceLearnerPathway(session, requestedPathway);
  if (!check.allowed) return check.errorResponse!;

  const filter: AnalyticsFilter = {
    pathway: check.effectivePathway,
    timeframe: (searchParams.get("timeframe") as "7d" | "30d" | "90d" | "6m" | "all" | "custom") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    examType: searchParams.get("examType") || undefined,
  };

  const res = await learnerReportsService.getPerformanceReport(session, filter);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
