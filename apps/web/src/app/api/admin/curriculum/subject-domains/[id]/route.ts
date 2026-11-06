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
    const res = await adminCurriculumService.getSubjectDomainById(id, auth.session);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Subject domain not found" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin subject-domain GET error:", error);
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
    const { courseId, code, pathway, title, description, displayOrder, isActive } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Subject title is required" }, { status: 400 });
    }

    const res = await adminCurriculumService.updateSubjectDomain(
      id,
      {
        courseId,
        code: code?.trim(),
        pathway,
        title: title.trim(),
        description: description?.trim() ?? "",
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive ?? true,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to update subject domain" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin subject-domain PUT error:", error);
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
    const res = await adminCurriculumService.deleteSubjectDomain(id, auth.session);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Cannot delete subject domain with existing dependencies" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data || { success: true });
  } catch (error) {
    console.error("Admin subject-domain DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
