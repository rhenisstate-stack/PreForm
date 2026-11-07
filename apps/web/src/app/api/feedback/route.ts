import { NextResponse } from "next/server";
import { feedbackService } from "@/lib/feedback-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await feedbackService.submitFeedback(body);
    return NextResponse.json({ success: true, feedback: item }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit feedback";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
