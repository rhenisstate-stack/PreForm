import { NextResponse } from "next/server";
import { adminRolesService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string; permissionId: string }>;
}

export async function DELETE(request: Request, context: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id, permissionId } = await context.params;
  const res = await adminRolesService.removePermission(id, permissionId, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
