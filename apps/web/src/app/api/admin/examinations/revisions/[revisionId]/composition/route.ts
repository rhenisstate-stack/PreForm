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
    const res = await examinationsService.getComposition(revisionId, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to fetch composition" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision composition GET error:", error);
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
    const { targetQuestionCount, selectionStrategy, allowedQuestionTypes, clientNeedQuotas, concurrencyToken } = body;

    if (concurrencyToken === undefined || concurrencyToken === null) {
      return NextResponse.json({ success: false, error: "concurrencyToken is required" }, { status: 400 });
    }

    const res = await examinationsService.updateComposition(
      revisionId,
      {
        targetQuestionCount: Number(targetQuestionCount) || 10,
        selectionStrategy: typeof selectionStrategy === "string" ? selectionStrategy : "Preset",
        allowedQuestionTypes: Array.isArray(allowedQuestionTypes) ? allowedQuestionTypes : [],
        clientNeedQuotas: Array.isArray(clientNeedQuotas) ? clientNeedQuotas : [],
        concurrencyToken: Number(concurrencyToken),
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to update composition" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision composition PUT error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
