import { NextResponse } from "next/server";
import { assessmentsService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedPathway = url.searchParams.get("pathway");

  if (session.role === "candidate" && requestedPathway && requestedPathway.toLowerCase() !== session.pathway?.toLowerCase()) {
    return NextResponse.json({
      success: false,
      code: "PATHWAY_MISMATCH",
      error: `Cross-pathway access forbidden. Learner is enrolled in NCLEX-${session.pathway?.toUpperCase()} and cannot query NCLEX-${requestedPathway.toUpperCase()} assessments.`
    }, { status: 403 });
  }

  const effectivePathway = session.role === "candidate"
    ? session.pathway
    : (requestedPathway || session.pathway || undefined);

  const res = await assessmentsService.getAvailableAssessments(session, effectivePathway);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
