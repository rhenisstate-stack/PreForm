import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ revisionId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { revisionId } = await props.params;
    const res = await examinationsService.getRevisionQuestions(revisionId, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to load questions" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision questions GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ revisionId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { revisionId } = await props.params;
    const body = await request.json();
    const { questionId, displayOrder, concurrencyToken } = body;

    if (!questionId || typeof questionId !== "string" || questionId.trim().length === 0) {
      return NextResponse.json({ success: false, error: "QuestionId is required" }, { status: 400 });
    }

    if (concurrencyToken === undefined || concurrencyToken === null) {
      return NextResponse.json({ success: false, error: "ConcurrencyToken is required" }, { status: 400 });
    }

    const res = await examinationsService.addQuestionToRevision(
      revisionId,
      {
        questionId: questionId.trim(),
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
        concurrencyToken: Number(concurrencyToken),
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to add question" }, { status: res.status });
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    console.error("Admin revision questions POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
