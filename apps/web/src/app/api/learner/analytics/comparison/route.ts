import { NextResponse } from "next/server";
import { performanceIntelligenceService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const attemptId1 = searchParams.get("attemptId1") || undefined;
  const attemptId2 = searchParams.get("attemptId2") || undefined;

  const res = await performanceIntelligenceService.getAttemptComparison(session, attemptId1, attemptId2);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
