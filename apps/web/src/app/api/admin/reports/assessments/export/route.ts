import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const q = new URLSearchParams();
  for (const [key, val] of searchParams.entries()) {
    q.set(key, val);
  }
  const qs = q.toString() ? `?${q.toString()}` : "";

  const res = await apiClient.get<string>(`/api/v1/admin/reports/assessments/export${qs}`, {
    session: auth.session,
  });

  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error || "Export failed" }, { status: res.status });
  }

  const csvContent = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  const filename = `prepford-assessments-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
