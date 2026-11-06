import { NextResponse } from "next/server";
import { adminCurriculumService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const pathway = url.searchParams.get("pathway") || undefined;
  const activeOnly = url.searchParams.get("activeOnly") === "true";
  const search = url.searchParams.get("search") || undefined;

  const res = await adminCurriculumService.getClientNeeds(pathway, activeOnly, auth.session, search);
  return NextResponse.json(res.data || { success: res.success }, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { code, name, description, displayOrder, isActive, pathway } = body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Category code is required" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Category name is required" }, { status: 400 });
    }

    const res = await adminCurriculumService.createClientNeed(
      {
        code: code.trim(),
        name: name.trim(),
        description: description?.trim() || "",
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive ?? true,
        pathway: pathway || "both",
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to create Client Need category" },
        { status: res.status }
      );
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    console.error("Admin client-needs POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
