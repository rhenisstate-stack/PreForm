import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ revisionId: string; questionId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { revisionId, questionId } = await props.params;
    const { searchParams } = new URL(request.url);
    const tokenStr = searchParams.get("concurrencyToken");

    if (!tokenStr) {
      return NextResponse.json({ success: false, error: "concurrencyToken query parameter is required" }, { status: 400 });
    }

    const res = await examinationsService.removeQuestionFromRevision(
      revisionId,
      questionId,
      Number(tokenStr),
      auth.session
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to remove question" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision question DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
