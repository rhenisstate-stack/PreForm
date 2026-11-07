import { NextResponse } from "next/server";
import { mediaService, MediaAsset } from "@/lib/media-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const result = await mediaService.getAssets({
      search,
      category,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch media assets";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const altText = (formData.get("altText") as string) || "";
      const caption = (formData.get("caption") as string) || undefined;
      const category = (formData.get("category") as MediaAsset["category"]) || "general";

      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
      }

      const asset = await mediaService.uploadAsset({
        file,
        fileName: file.name,
        altText,
        caption,
        category,
      });

      return NextResponse.json({ success: true, asset }, { status: 201 });
    }

    // Handle JSON payload (e.g. metadata registration)
    const body = await request.json();
    const asset = await mediaService.uploadAsset({
      file: new Blob([body.data || ""], { type: body.contentType || "image/png" }),
      fileName: body.fileName || `media-${Date.now()}.png`,
      altText: body.altText || "",
      caption: body.caption,
      category: body.category || "general",
    });

    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
