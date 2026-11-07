import { NextResponse } from "next/server";
import { videoService } from "@/lib/video-service";

export async function GET() {
  try {
    const progress = await videoService.getLearnerProgress();
    return NextResponse.json({ success: true, progress });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch progress";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await videoService.updateProgress({
      videoId: body.videoId,
      progressPercent: body.progressPercent,
      lastWatchedSeconds: body.lastWatchedSeconds,
      completed: body.completed,
    });
    return NextResponse.json({ success: true, progress: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update progress";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
