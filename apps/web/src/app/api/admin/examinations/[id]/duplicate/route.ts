import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

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
    const body = await request.json().catch(() => ({}));
    const { title, sourceRevisionId, description, timeLimitMinutes, passingScorePercent } = body;

    const res = await examinationsService.duplicateExamination(
      id,
      {
        title: typeof title === "string" && title.trim().length > 0 ? title.trim() : undefined,
        sourceRevisionId: typeof sourceRevisionId === "string" && sourceRevisionId.trim().length > 0 ? sourceRevisionId.trim() : undefined,
        description: typeof description === "string" ? description.trim() : undefined,
        timeLimitMinutes: typeof timeLimitMinutes === "number" ? timeLimitMinutes : undefined,
        passingScorePercent: typeof passingScorePercent === "number" ? passingScorePercent : undefined,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to duplicate examination" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    console.error("Admin examination duplicate POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
