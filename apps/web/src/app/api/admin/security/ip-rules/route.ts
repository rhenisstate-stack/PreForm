import { NextResponse } from "next/server";
import { adminIpRulesService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const ruleType = searchParams.get("ruleType") || undefined;
  const activeOnly = searchParams.has("activeOnly") ? searchParams.get("activeOnly") === "true" : undefined;

  const res = await adminIpRulesService.getRules({ ruleType, activeOnly }, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const res = await adminIpRulesService.createRule(body, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
