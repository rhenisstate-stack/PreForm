import { NextResponse } from "next/server";
import { monetizationService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { id } = await params;
  try {
    const apiRes = await monetizationService.reinstateSubscription(auth.session, id);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to reinstate subscription" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Reinstate subscription error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
