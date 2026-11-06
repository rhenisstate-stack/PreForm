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
    const courseId = url.searchParams.get("courseId") || undefined;
    const activeOnly = url.searchParams.get("activeOnly") === "true";
    const pathway = url.searchParams.get("pathway") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const res = await adminCurriculumService.getSubjectDomains(
      { courseId, activeOnly, pathway, search },
      auth.session
    );
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to load subject domains" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data || { success: true, subjectDomains: [] });
  } catch (error) {
    console.error("Admin subject-domains GET error:", error);
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
    const { courseId, code, pathway, title, description, displayOrder, isActive } = body;

    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ success: false, error: "Course selection is required" }, { status: 400 });
    }
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Subject title is required" }, { status: 400 });
    }

    const res = await adminCurriculumService.createSubjectDomain(
      {
        courseId,
        code: code?.trim(),
        pathway,
        title: title.trim(),
        description: description?.trim() || "",
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive ?? true,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to create subject domain" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    console.error("Admin subject-domains POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
