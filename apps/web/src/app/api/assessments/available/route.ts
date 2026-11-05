import { NextResponse } from "next/server";
import { assessmentsService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const pathway = url.searchParams.get("pathway") || session.pathway || undefined;

  const res = await assessmentsService.getAvailableAssessments(session, pathway);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
