import { NextResponse } from "next/server";
import { performanceIntelligenceService, QuestionReviewFilter } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter: QuestionReviewFilter = {
    pathway: searchParams.get("pathway") || undefined,
    attemptId: searchParams.get("attemptId") || undefined,
    categoryCode: searchParams.get("categoryCode") || undefined,
    questionTypeKey: searchParams.get("questionTypeKey") || undefined,
    difficulty: searchParams.get("difficulty") || undefined,
    onlyIncorrect: searchParams.has("onlyIncorrect") ? searchParams.get("onlyIncorrect") === "true" : undefined,
    isFlagged: searchParams.has("isFlagged") ? searchParams.get("isFlagged") === "true" : undefined,
    search: searchParams.get("search") || undefined,
    page: searchParams.has("page") ? parseInt(searchParams.get("page")!, 10) : undefined,
    pageSize: searchParams.has("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : undefined,
  };

  const res = await performanceIntelligenceService.getQuestionReview(session, filter);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
