import { NextResponse } from "next/server";
import { adminCurriculumService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const pathway = url.searchParams.get("pathway") || undefined;
  const activeOnly = url.searchParams.get("activeOnly") === "true";

  const res = await adminCurriculumService.getClientNeeds(pathway, activeOnly, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
