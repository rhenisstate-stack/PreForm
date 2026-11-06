import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pathway = searchParams.get("pathway") || undefined;
    const search = searchParams.get("search") || undefined;
    const clientNeedId = searchParams.get("clientNeedId") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const subjectDomainId = searchParams.get("subjectDomainId") || undefined;
    const questionType = searchParams.get("questionType") || undefined;
    const difficulty = searchParams.get("difficulty") || undefined;

    const hasExtraFilters = Boolean(clientNeedId || courseId || subjectDomainId || questionType || difficulty);
    const res = hasExtraFilters
      ? await examinationsService.getEligibleQuestions(pathway, search, auth.session, {
          clientNeedId,
          courseId,
          subjectDomainId,
          questionType,
          difficulty,
        })
      : await examinationsService.getEligibleQuestions(pathway, search, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to load eligible questions" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin eligible questions GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
