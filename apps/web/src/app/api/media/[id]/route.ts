import { NextResponse } from "next/server";
import { mediaService } from "@/lib/media-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await mediaService.getAssetById(id);
    if (!asset) {
      return NextResponse.json({ success: false, error: "Media asset not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, asset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch media asset";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const asset = await mediaService.updateMetadata(id, {
      altText: body.altText,
      caption: body.caption,
      category: body.category,
    });
    return NextResponse.json({ success: true, asset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update media metadata";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await mediaService.deleteAsset(id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete media asset";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
