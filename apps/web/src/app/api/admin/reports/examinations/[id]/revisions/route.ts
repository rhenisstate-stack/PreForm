import { NextResponse } from "next/server";
import { adminReportsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const res = await adminReportsService.getExaminationRevisions(id, auth.session);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
