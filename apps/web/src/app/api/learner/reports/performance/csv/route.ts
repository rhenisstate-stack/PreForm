import { NextResponse } from "next/server";
import { learnerReportsService, AnalyticsFilter } from "@/lib/api-services";
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
  };

  const res = await learnerReportsService.getPerformanceCsv(session, filter);
  if (!res.success || !res.data) {
    return NextResponse.json({ success: false, error: res.error || "Failed to generate report CSV" }, { status: res.status });
  }

  const csvContent = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  const filename = `PrepFord-Performance-Data-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
