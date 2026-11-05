import { NextResponse } from "next/server";
import { adminAuditLogsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const actorId = searchParams.get("actorId") || undefined;
  const action = searchParams.get("action") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const entityId = searchParams.get("entityId") || undefined;
  const correlationId = searchParams.get("correlationId") || undefined;
  const severity = searchParams.get("severity") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 25;

  const res = await adminAuditLogsService.getAuditLogs(
    { actorId, action, entityType, entityId, correlationId, severity, from, to, page, pageSize },
    auth.session
  );
  return NextResponse.json(res.data || { success: false }, { status: res.status });
}
