import { NextResponse } from "next/server";
import { monetizationService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined;
  const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : undefined;

  try {
    const apiRes = await monetizationService.getTransactions(auth.session, {
      search,
      page,
      pageSize,
    });
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to load transactions" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
