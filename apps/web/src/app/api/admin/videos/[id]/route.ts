import { NextResponse } from "next/server";
import { videoService } from "@/lib/video-service";
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
    const video = await videoService.getVideoBySlug(id);
    if (!video) {
      return NextResponse.json({ success: false, error: "Video not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, video });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch video";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
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
    const updated = await videoService.updateVideo(id, body);
    return NextResponse.json({ success: true, video: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update video";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    await videoService.deleteVideo(id);
    return NextResponse.json({ success: true, message: "Video deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete video";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
