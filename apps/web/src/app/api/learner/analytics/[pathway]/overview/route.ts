import { NextResponse } from "next/server";
import { systemAnalyticsService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pathway: string }> }
) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const { pathway: rawPathway } = await params;
  const pathway = rawPathway?.toLowerCase();

  if (pathway !== "rn" && pathway !== "pn") {
    return NextResponse.json(
      { success: false, error: "Invalid pathway specified. Must be 'rn' or 'pn'." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || undefined;

  const res = await systemAnalyticsService.getLearnerOverview(
    pathway,
    { timeRange },
    session
  );

  return NextResponse.json(res.data || { success: false }, { status: res.status });
}
