import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/admin/authz";
import { adminSecurityService } from "@/lib/api-services";

export async function GET(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdmin(session.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Super Administrator authorization required." },
        { status: 403 }
      );
    }

    const apiRes = await adminSecurityService.getPolicy(session);
    if (!apiRes.success || !apiRes.data) {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Failed to fetch session security policy." },
        { status: apiRes.status || 500 }
      );
    }

    return NextResponse.json(apiRes.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdmin(session.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Super Administrator authorization required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const apiRes = await adminSecurityService.updatePolicy(body, session);

    if (!apiRes.success || !apiRes.data) {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Failed to update session security policy." },
        { status: apiRes.status || 500 }
      );
    }

    return NextResponse.json(apiRes.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
