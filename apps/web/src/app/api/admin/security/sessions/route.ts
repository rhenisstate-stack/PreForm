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

    const { searchParams } = new URL(request.url);
    const query = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20,
      status: searchParams.get("status") || "all",
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || "lastActive",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    const apiRes = await adminSecurityService.getSessions(query, session);
    if (!apiRes.success || !apiRes.data) {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Failed to fetch active sessions." },
        { status: apiRes.status || 500 }
      );
    }

    return NextResponse.json(apiRes.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
