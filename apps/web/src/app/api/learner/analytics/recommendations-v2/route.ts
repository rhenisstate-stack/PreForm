import { NextResponse } from "next/server";
import { performanceIntelligenceService } from "@/lib/api-services";
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

  const res = await performanceIntelligenceService.getRecommendationsV2(session, check.effectivePathway);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
