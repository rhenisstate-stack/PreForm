import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await props.params;
    const res = await examinationsService.getFamilyRevisions(id, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to load revisions" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin family revisions GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await props.params;
    const body = await request.json();
    const { title, description, examType, timeLimitMinutes, passingScorePercent } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const res = await examinationsService.createRevision(
      id,
      {
        title: title.trim(),
        description: description?.trim() || "",
        examType: Number(examType) || 0,
        timeLimitMinutes: Number(timeLimitMinutes) || 0,
        passingScorePercent: Number(passingScorePercent) || 75.0,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to create revision" }, { status: res.status });
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    console.error("Admin examination revision POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
