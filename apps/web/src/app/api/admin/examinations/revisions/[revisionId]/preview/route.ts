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
    const res = await examinationsService.getAdminPreview(revisionId, auth.session);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || "Failed to fetch examination preview" }, { status: res.status });
    }

    const raw = res.data as any;
    if (raw && !raw.preview && Array.isArray(raw.questions)) {
      return NextResponse.json({
        success: true,
        preview: {
          revisionId: raw.revisionId,
          examinationCode: raw.examinationCode || "",
          title: raw.revisionTitle || raw.examinationTitle || raw.title || "",
          pathway: raw.pathway || "rn",
          selectionStrategy: raw.selectionStrategy || "Preset",
          targetQuestionCount: raw.questionCount ?? raw.questions.length,
          timeLimitMinutes: raw.timeLimitMinutes ?? 0,
          passingScorePercent: raw.passingScorePercent ?? 75,
          reviewPolicy: raw.reviewPolicy || "FullReviewWithRationales",
          questions: raw.questions.map((q: any, idx: number) => ({
            id: q.questionId || q.id,
            displayOrder: q.displayOrder ?? idx + 1,
            stem: q.stem,
            questionTypeKey: q.questionTypeKey,
            clientNeedId: q.clientNeedCode || q.clientNeedId || null,
            clientNeedName: q.clientNeedName || null,
            topicTitle: q.topicName || q.topicTitle || null,
            overallRationale: q.rationale || q.overallRationale || null,
            options: Array.isArray(q.options)
              ? q.options.map((o: any, oIdx: number) => ({
                  id: o.id || `${q.questionId || q.id}_opt_${oIdx}`,
                  optionKey: o.optionKey || o.key || String.fromCharCode(65 + oIdx),
                  content: o.content || o.text || "",
                  isCorrect: Boolean(o.isCorrect),
                  rationale: o.rationale || null,
                  displayOrder: o.displayOrder ?? oIdx + 1,
                }))
              : [],
          })),
        },
      });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error("Admin revision preview GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
