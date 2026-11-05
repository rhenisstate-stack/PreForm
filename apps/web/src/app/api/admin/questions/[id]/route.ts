import { NextResponse } from "next/server";
import { adminQuestionsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const res = await adminQuestionsService.getQuestionById(id, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();
  const res = await adminQuestionsService.updateQuestion(id, body, auth.session);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}
