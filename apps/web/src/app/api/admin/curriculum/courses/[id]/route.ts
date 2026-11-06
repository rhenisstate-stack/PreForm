import { NextResponse } from "next/server";
import { adminCurriculumService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await props.params;
    const res = await adminCurriculumService.getCourseById(id, auth.session);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Course not found" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin course GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await props.params;
    const body = await request.json();
    const { code, pathway, title, description, displayOrder, isPublished, isActive } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Course title is required" }, { status: 400 });
    }

    const res = await adminCurriculumService.updateCourse(
      id,
      {
        code: code?.trim(),
        pathway,
        title: title.trim(),
        description: description?.trim() ?? "",
        displayOrder: Number(displayOrder) || 0,
        isPublished: isPublished ?? true,
        isActive: isActive ?? true,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to update course" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin course PUT error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await props.params;
    const res = await adminCurriculumService.deleteCourse(id, auth.session);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Cannot delete course with existing dependencies" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data || { success: true });
  } catch (error) {
    console.error("Admin course DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
