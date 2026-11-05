import { NextResponse } from "next/server";
import { adminIpRulesService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json();
  const res = await adminIpRulesService.updateRule(id, body, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}

export async function DELETE(request: Request, context: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const res = await adminIpRulesService.deleteRule(id, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
