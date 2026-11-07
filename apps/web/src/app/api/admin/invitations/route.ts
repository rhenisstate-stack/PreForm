import { NextResponse } from "next/server";
import { invitationService } from "@/lib/invitation-service";
import { verifyAdminAuth } from "@/lib/session";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const invitations = await invitationService.getInvitations();
    return NextResponse.json({ success: true, invitations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch staff invitations";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const invitation = await invitationService.createInvitation({
      email: body.email,
      role: body.role,
      invitedBy: auth.session?.user?.email || "admin@prepford.com",
      notes: body.notes,
      expiryHours: body.expiryHours || 72,
    });

    return NextResponse.json({ success: true, invitation }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create staff invitation";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
