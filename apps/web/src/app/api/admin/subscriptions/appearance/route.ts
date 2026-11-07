import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId") || undefined;

  try {
    const apiRes = await subscriptionService.getAppearance(auth.session, planId);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to load appearance" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Get appearance error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized || !auth.session) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId") || undefined;

  try {
    const body = await request.json();
    const apiRes = await subscriptionService.saveAppearance(auth.session, body, planId);
    if (!apiRes.success) {
      return NextResponse.json({ success: false, error: apiRes.error || "Failed to save appearance" }, { status: apiRes.status });
    }
    return NextResponse.json(apiRes.data);
  } catch (error) {
    console.error("Save appearance error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
