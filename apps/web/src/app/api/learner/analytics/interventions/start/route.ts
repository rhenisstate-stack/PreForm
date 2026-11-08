import { NextResponse } from "next/server";
import { performanceIntelligenceService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  let body: { recommendationId?: string; title: string; targetCategoryCode?: string; targetCategoryName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.title) {
    return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 });
  }

  const res = await performanceIntelligenceService.startIntervention(session, body);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
