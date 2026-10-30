import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSession();
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const isFlagged = typeof body.isFlagged === "boolean" ? body.isFlagged : true;

    return NextResponse.json({
      success: true,
      questionId: id,
      isFlagged,
      userId: session?.userId || "anonymous",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update question flag." },
      { status: 500 }
    );
  }
}
