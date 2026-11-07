import { NextResponse } from "next/server";
import { monetizationService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";

  try {
    const apiRes = await monetizationService.searchLearners(auth.session, query);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to search learners" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Search learners error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
