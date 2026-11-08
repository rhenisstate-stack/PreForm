import { NextResponse } from "next/server";
import { performanceIntelligenceService, AnalyticsFilter } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter: AnalyticsFilter = {
    pathway: (searchParams.get("pathway") as "rn" | "pn" | "all") || undefined,
    timeframe: (searchParams.get("timeframe") as "7d" | "30d" | "90d" | "6m" | "all" | "custom") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    examType: searchParams.get("examType") || undefined,
    clientNeedCategory: searchParams.get("clientNeedCategory") || undefined,
    questionType: searchParams.get("questionType") || undefined,
    difficulty: searchParams.get("difficulty") || undefined,
  };

  const res = await performanceIntelligenceService.getCategories(session, filter);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
