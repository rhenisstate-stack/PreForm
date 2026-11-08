import { NextResponse } from "next/server";
import { performanceIntelligenceService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: "Recommendation ID is required." }, { status: 400 });
  }

  let body: { status?: "New" | "InProgress" | "Completed" | "Dismissed" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ success: false, error: "Status is required." }, { status: 400 });
  }

  const res = await performanceIntelligenceService.updateRecommendationStatus(session, id, body.status);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
