import { NextResponse } from "next/server";
import { adminUsersService } from "@/lib/api-services";
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
  const { status, reason } = body || {};

  const res = await adminUsersService.updateStatus(id, status, reason, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
