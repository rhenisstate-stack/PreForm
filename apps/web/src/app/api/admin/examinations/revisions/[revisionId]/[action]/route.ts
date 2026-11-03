import { NextResponse } from "next/server";
import { examinationsService } from "@/lib/api-services";
import { verifyAdminAuth } from "@/lib/session";

const VALID_ACTIONS = new Set([
  "submit",
  "recommend",
  "return",
  "approve",
  "publish",
  "archive",
  "restore",
  "retire",
  "emergency-retire",
]);

export async function POST(
  request: Request,
  props: { params: Promise<{ revisionId: string; action: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let actionName = "lifecycle";
  try {
    const { revisionId, action } = await props.params;
    actionName = action;
    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json({ success: false, error: `Invalid lifecycle action: ${action}` }, { status: 400 });
    }

    const body = await request.json();
    const { concurrencyToken, reason, notes } = body;

    if (concurrencyToken === undefined || concurrencyToken === null) {
      return NextResponse.json({ success: false, error: "ConcurrencyToken is required" }, { status: 400 });
    }

    const res = await examinationsService.transitionRevision(
      revisionId,
      action as any,
      {
        concurrencyToken: Number(concurrencyToken),
        reason: reason?.trim(),
        notes: notes?.trim(),
      },
      auth.session
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || `Failed to ${action} revision` }, { status: res.status });
    }

    return NextResponse.json(res.data);
  } catch (error) {
    console.error(`Admin revision ${actionName} POST error:`, error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
