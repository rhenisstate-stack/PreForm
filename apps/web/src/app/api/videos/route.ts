import { NextResponse } from "next/server";
import { videoService } from "@/lib/video-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const programme = searchParams.get("programme") || undefined;
    const search = searchParams.get("search") || undefined;

    const videos = await videoService.getVideos({
      category,
      programme,
      search,
      isPublished: true,
    });

    return NextResponse.json({ success: true, videos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch videos";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
