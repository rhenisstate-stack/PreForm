import { NextResponse } from "next/server";
import { adminUsersService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string; roleId: string }>;
}

export async function DELETE(request: Request, context: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id, roleId } = await context.params;
  const res = await adminUsersService.removeRole(id, roleId, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
