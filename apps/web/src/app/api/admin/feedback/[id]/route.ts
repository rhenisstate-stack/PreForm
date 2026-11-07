import { NextResponse } from "next/server";
import { feedbackService } from "@/lib/feedback-service";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const item = await feedbackService.getFeedbackById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Feedback item not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, feedback: item });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch feedback item";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await feedbackService.updateFeedback(id, {
      status: body.status,
      adminNotes: body.adminNotes,
      resolvedBy: auth.session?.user?.email || "admin@prepford.com",
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update feedback item";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
