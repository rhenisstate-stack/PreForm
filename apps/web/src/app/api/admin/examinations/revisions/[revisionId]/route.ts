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
    const res = await examinationsService.getRevisionById(revisionId, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Revision not found" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
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
    const {
      title,
      description,
      examType,
      timeLimitMinutes,
      passingScorePercent,
      concurrencyToken,
      targetQuestionCount,
      selectionStrategy,
      isAvailable,
      availableFrom,
      availableTo,
      maxAttemptsAllowed,
      retakeCooldownHours,
      allowInterruptedResume,
      reviewPolicy,
      showRationales,
      showScoreImmediately,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    if (concurrencyToken === undefined || concurrencyToken === null) {
      return NextResponse.json({ success: false, error: "ConcurrencyToken is required" }, { status: 400 });
    }

    const res = await examinationsService.updateRevisionMetadata(
      revisionId,
      {
        title: title.trim(),
        description: description?.trim() || "",
        examType: Number(examType) || 0,
        timeLimitMinutes: Number(timeLimitMinutes) || 0,
        passingScorePercent: Number(passingScorePercent) || 75.0,
        concurrencyToken: Number(concurrencyToken),
        targetQuestionCount: targetQuestionCount !== undefined ? Number(targetQuestionCount) : undefined,
        selectionStrategy: typeof selectionStrategy === "string" ? selectionStrategy : undefined,
        isAvailable: typeof isAvailable === "boolean" ? isAvailable : undefined,
        availableFrom: availableFrom !== undefined ? availableFrom : undefined,
        availableTo: availableTo !== undefined ? availableTo : undefined,
        maxAttemptsAllowed: maxAttemptsAllowed !== undefined && maxAttemptsAllowed !== null ? Number(maxAttemptsAllowed) : (maxAttemptsAllowed === null ? null : undefined),
        retakeCooldownHours: retakeCooldownHours !== undefined ? Number(retakeCooldownHours) : undefined,
        allowInterruptedResume: typeof allowInterruptedResume === "boolean" ? allowInterruptedResume : undefined,
        reviewPolicy: typeof reviewPolicy === "string" ? reviewPolicy : undefined,
        showRationales: typeof showRationales === "boolean" ? showRationales : undefined,
        showScoreImmediately: typeof showScoreImmediately === "boolean" ? showScoreImmediately : undefined,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to update revision" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision PUT error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ revisionId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { revisionId } = await props.params;
    const { searchParams } = new URL(request.url);
    const tokenStr = searchParams.get("concurrencyToken");

    if (!tokenStr) {
      return NextResponse.json({ success: false, error: "concurrencyToken query parameter is required" }, { status: 400 });
    }

    const res = await examinationsService.discardDraftRevision(revisionId, Number(tokenStr), auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to discard revision" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
