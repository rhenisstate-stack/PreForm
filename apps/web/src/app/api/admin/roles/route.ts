import { NextResponse } from "next/server";
import { adminRolesService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const res = await adminRolesService.getRoles(auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const res = await adminRolesService.createRole(body, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
