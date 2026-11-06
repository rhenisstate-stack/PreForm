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
    const res = await examinationsService.getPoolPreview(revisionId, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to fetch question pool preview" }, { status: res.status });
    }

    const raw = res.data as any;
    if (raw && !raw.preview && Array.isArray(raw.quotas)) {
      return NextResponse.json({
        success: true,
        preview: {
          revisionId: raw.revisionId,
          pathway: raw.pathway || "rn",
          selectionStrategy: raw.selectionStrategy,
          totalRequiredQuestions: raw.targetQuestionCount ?? 0,
          totalAvailableApprovedQuestions: raw.totalEligibleInPool ?? 0,
          isOverallPoolSufficient: Boolean(raw.allQuotasSatisfied),
          items: raw.quotas.map((q: any) => ({
            clientNeedId: q.clientNeedId || q.clientNeedCode,
            clientNeedName: q.clientNeedName,
            requiredCount: q.targetCount ?? 0,
            availableApprovedQuestions: q.availablePoolCount ?? 0,
            isSufficient: Boolean(q.isSatisfied),
          })),
        },
      });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision pool-preview GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
