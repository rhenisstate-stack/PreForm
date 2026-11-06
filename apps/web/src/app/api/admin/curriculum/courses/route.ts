import { NextResponse } from "next/server";
import { adminCurriculumService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("activeOnly") === "true";
    const pathway = url.searchParams.get("pathway") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const res = await adminCurriculumService.getCourses(
      { activeOnly, pathway, search },
      auth.session
    );
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to load courses" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data || { success: true, courses: [] });
  } catch (error) {
    console.error("Admin courses GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { programmeId, code, pathway, title, description, displayOrder, isPublished, isActive } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Course title is required" }, { status: 400 });
    }

    const res = await adminCurriculumService.createCourse(
      {
        programmeId,
        code: code?.trim(),
        pathway: pathway || "rn",
        title: title.trim(),
        description: description?.trim() || "",
        displayOrder: Number(displayOrder) || 0,
        isPublished: isPublished ?? true,
        isActive: isActive ?? true,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to create course" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    console.error("Admin courses POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
