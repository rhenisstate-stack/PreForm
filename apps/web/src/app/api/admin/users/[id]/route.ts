import { NextResponse } from "next/server";
import { adminUsersService } from "@/lib/api-services";
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
  const res = await adminUsersService.getUserById(id, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}

export async function PUT(request: Request, context: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json();
  const res = await adminUsersService.updateUser(id, body, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
