import { NextResponse } from "next/server";
import { blogService } from "@/lib/blog-service";
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
    const { id: slug } = await params;
    const post = await blogService.getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, post });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch article";
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
    const { id: slug } = await params;
    const body = await request.json();
    const updated = await blogService.updatePost(slug, body);
    return NextResponse.json({ success: true, post: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update article";
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
    const { id: slug } = await params;
    const result = await blogService.deletePost(slug);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete article";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
