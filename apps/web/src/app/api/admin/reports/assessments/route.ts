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
  const examinationId = searchParams.get("examinationId") || undefined;
  const status = searchParams.get("status") || undefined;
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  const res = await adminReportsService.getAssessments(
    { pathway, examinationId, status, fromDate, toDate },
    auth.session
  );
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
