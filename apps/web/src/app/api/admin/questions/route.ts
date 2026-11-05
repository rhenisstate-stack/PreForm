import { NextResponse } from "next/server";
import { adminQuestionsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const query = {
    search: url.searchParams.get("search") || undefined,
    type: url.searchParams.get("type") || undefined,
    pathway: url.searchParams.get("pathway") || undefined,
    topicId: url.searchParams.get("topicId") || undefined,
    subcategoryId: url.searchParams.get("subcategoryId") || undefined,
    categoryId: url.searchParams.get("categoryId") || undefined,
    courseId: url.searchParams.get("courseId") || undefined,
    clientNeedId: url.searchParams.get("clientNeedId") || undefined,
    difficulty: url.searchParams.has("difficulty") ? Number(url.searchParams.get("difficulty")) : undefined,
    status: url.searchParams.has("status") ? Number(url.searchParams.get("status")) : undefined,
    cognitiveLevel: url.searchParams.get("cognitiveLevel") || undefined,
    clinicalJudgmentStep: url.searchParams.get("clinicalJudgmentStep") || undefined,
    authorId: url.searchParams.get("authorId") || undefined,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : 1,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : 20,
    sortBy: url.searchParams.get("sortBy") || "updatedAt",
    sortDirection: url.searchParams.get("sortDirection") || "desc",
  };

  const res = await adminQuestionsService.getQuestions(query, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const res = await adminQuestionsService.createQuestion(body, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
