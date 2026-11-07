import { NextResponse } from "next/server";
import { videoService } from "@/lib/video-service";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const programme = searchParams.get("programme") || undefined;
    const search = searchParams.get("search") || undefined;

    const videos = await videoService.getVideos({
      category,
      programme,
      search,
    });

    return NextResponse.json({ success: true, videos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch videos";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const video = await videoService.createVideo(body);
    return NextResponse.json({ success: true, video }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create video";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
