import { NextResponse } from "next/server";
import { monetizationService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const paymentMethod = searchParams.get("paymentMethod") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined;
  const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : undefined;

  try {
    const apiRes = await monetizationService.getManualAuthorizations(auth.session, {
      status,
      paymentMethod,
      search,
      page,
      pageSize,
    });
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to load authorizations" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Get manual authorizations error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const apiRes = await monetizationService.recordManualPayment(auth.session, body);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to record manual payment" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Record manual payment error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
