import { NextResponse } from "next/server";
import { adminReportsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const pathway = searchParams.get("pathway") || undefined;
  const questionTypeKey = searchParams.get("questionTypeKey") || undefined;
  const difficulty = searchParams.get("difficulty") || undefined;
  const clientNeedCode = searchParams.get("clientNeedCode") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

  const res = await adminReportsService.getQuestionsPerformance(
    { pathway, questionTypeKey, difficulty, clientNeedCode, search, page, pageSize },
    auth.session
  );
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
