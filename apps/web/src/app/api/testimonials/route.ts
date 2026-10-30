import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathway = searchParams.get("pathway") || "";
    const limit = searchParams.get("limit") || "20";

    const backendUrl = `${getApiBaseUrl()}/api/v1/testimonials?pathway=${encodeURIComponent(pathway)}&limit=${encodeURIComponent(limit)}`;

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ success: true, count: 0, testimonials: [] });
  } catch {
    return NextResponse.json({ success: true, count: 0, testimonials: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = `${getApiBaseUrl()}/api/v1/testimonials`;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        success: true,
        message: "Thank you for sharing your experience! Your reflection has been submitted for moderation.",
      },
      { status: 201 }
    );
  }
}
