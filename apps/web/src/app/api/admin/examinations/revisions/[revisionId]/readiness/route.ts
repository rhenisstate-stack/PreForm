import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ revisionId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { revisionId } = await props.params;
    const res = await examinationsService.getReadiness(revisionId, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to fetch examination readiness" }, { status: res.status });
    }

    const raw = res.data as any;
    if (raw && !raw.readiness && Array.isArray(raw.checks)) {
      const statusMap: Record<string, "READY" | "NEEDS_ATTENTION" | "BLOCKED"> = {
        PASS: "READY",
        READY: "READY",
        WARN: "NEEDS_ATTENTION",
        NEEDS_ATTENTION: "NEEDS_ATTENTION",
        BLOCK: "BLOCKED",
        BLOCKED: "BLOCKED",
      };
      return NextResponse.json({
        success: true,
        readiness: {
          revisionId: raw.revisionId,
          examinationCode: raw.examinationCode || "",
          title: raw.title || "",
          lifecycleState: raw.lifecycleState || "Draft",
          overallStatus: statusMap[raw.overallStatus] || "NEEDS_ATTENTION",
          canPublish: raw.overallStatus === "PASS" || raw.overallStatus === "READY",
          evaluatedAtUtc: raw.evaluatedAtUtc || new Date().toISOString(),
          checks: raw.checks.map((c: any, idx: number) => ({
            code: c.code || `${c.category || "CHECK"}_${idx + 1}`,
            area: c.area || c.category || "General",
            severity: c.severity || c.status || "PASS",
            message: c.message || c.name || "",
          })),
        },
      });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision readiness GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
