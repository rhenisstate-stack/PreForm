import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pathway = searchParams.get("pathway") || undefined;
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const revisionStatus = searchParams.get("revisionStatus") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortDirection = (searchParams.get("sortDirection") as "asc" | "desc") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

    const res = await examinationsService.queryExaminations(
      { pathway, search, status, revisionStatus, sortBy, sortDirection, page, pageSize },
      auth.session
    );
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to load examinations" }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin examinations GET error:", error);
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
    const { pathway, title, description, timeLimitMinutes, passingScorePercent } = body;

    if (!pathway || (pathway !== "rn" && pathway !== "pn")) {
      return NextResponse.json({ success: false, error: "Pathway must be 'rn' or 'pn'" }, { status: 400 });
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const res = await examinationsService.createExamination(
      {
        pathway,
        title: title.trim(),
        description: description?.trim(),
        timeLimitMinutes: Number(timeLimitMinutes) || 0,
        passingScorePercent: Number(passingScorePercent) || 75.0,
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to create examination" }, { status: res.status });
    }

    return NextResponse.json(res.data, { status: 201 });
  } catch (error) {
    console.error("Admin examination POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
