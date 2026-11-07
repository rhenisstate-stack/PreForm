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
    const rawItems = Array.isArray(raw?.quotas)
      ? raw.quotas
      : Array.isArray(raw?.clientNeedBreakdown)
        ? raw.clientNeedBreakdown
        : null;
    if (raw && !raw.preview && rawItems) {
      return NextResponse.json({
        success: true,
        preview: {
          revisionId: raw.revisionId,
          pathway: raw.pathway || "rn",
          selectionStrategy: raw.selectionStrategy || "Preset",
          totalRequiredQuestions: raw.targetQuestionCount ?? 0,
          totalAvailableApprovedQuestions: raw.totalEligibleInPool ?? raw.totalEligiblePublishedQuestions ?? 0,
          isOverallPoolSufficient: Boolean(raw.allQuotasSatisfied ?? raw.isPoolSufficient),
          items: rawItems.map((q: any) => ({
            clientNeedId: q.clientNeedId || q.clientNeedCode || q.code,
            clientNeedName: q.clientNeedName || q.name,
            requiredCount: q.targetCount ?? q.requestedCount ?? 0,
            availableApprovedQuestions: q.availablePoolCount ?? q.availableCount ?? 0,
            isSufficient: Boolean(q.isSatisfied ?? q.isSufficient),
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
