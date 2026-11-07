import { NextResponse } from "next/server";
import { feedbackService } from "@/lib/feedback-service";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;

    const feedback = await feedbackService.getFeedback({
      category,
      status,
      priority,
      search,
    });

    return NextResponse.json({ success: true, feedback });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch feedback";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
