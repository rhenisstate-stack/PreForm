import { NextResponse } from "next/server";
import { adminRolesService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { permissionId } = body || {};

  const res = await adminRolesService.assignPermission(id, permissionId, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
