import { NextResponse } from "next/server";
import { invitationService } from "@/lib/invitation-service";
import { verifyAdminAuth } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action || "resend";

    if (action === "resend") {
      const updated = await invitationService.resendInvitation(id);
      return NextResponse.json({ success: true, invitation: updated });
    } else if (action === "revoke") {
      const updated = await invitationService.revokeInvitation(id);
      return NextResponse.json({ success: true, invitation: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process invitation action";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const updated = await invitationService.revokeInvitation(id);
    return NextResponse.json({ success: true, invitation: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
