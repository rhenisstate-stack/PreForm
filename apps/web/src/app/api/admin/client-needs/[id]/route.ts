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
    const res = await adminCurriculumService.getClientNeedById(id, auth.session);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Client Need category not found" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin client-need GET error:", error);
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
    const { code, name, description, displayOrder, isActive, pathway } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const res = await adminCurriculumService.updateClientNeed(
      id,
      {
        code: code?.trim(),
        name: name.trim(),
        description: description?.trim() ?? "",
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive ?? true,
        pathway: pathway || "both",
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to update Client Need category" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin client-need PUT error:", error);
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
    const res = await adminCurriculumService.deleteClientNeed(id, auth.session);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Cannot delete Client Need category with existing dependencies" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data || { success: true });
  } catch (error) {
    console.error("Admin client-need DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
