import { NextResponse } from "next/server";
import { adminUsersService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const res = await adminUsersService.getUsers({ search, role, status, page, pageSize }, auth.session);
    return NextResponse.json(res.data || { success: false }, { status: res.status });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to query users." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const res = await adminUsersService.createUser(body, auth.session);
    return NextResponse.json(res.data || { success: res.success }, { status: res.status });
  } catch (error) {
    console.error("Admin users POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create user." }, { status: 500 });
  }
}
