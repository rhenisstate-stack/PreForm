import { NextResponse } from "next/server";
import { adminReportsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const res = await adminReportsService.getOverview(auth.session);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
