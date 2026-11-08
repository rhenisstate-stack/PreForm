import { NextResponse } from "next/server";
import { performanceIntelligenceService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const res = await performanceIntelligenceService.getInterventions(session);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
