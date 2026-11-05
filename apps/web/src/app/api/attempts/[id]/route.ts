import { NextResponse } from "next/server";
import { attemptsService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const res = await attemptsService.getAttemptById(id, session);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
