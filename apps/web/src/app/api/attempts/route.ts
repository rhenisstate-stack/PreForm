import { NextResponse } from "next/server";
import { attemptsService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const res = await attemptsService.getAttempts(session);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}

export async function POST(request: Request) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // Enforce single-pathway boundary for candidate role
  if (session.role === "candidate") {
    if (body.pathway && body.pathway.toLowerCase() !== session.pathway?.toLowerCase()) {
      return NextResponse.json({
        success: false,
        code: "PATHWAY_MISMATCH",
        error: `Cross-pathway access forbidden. Learner is enrolled in NCLEX-${session.pathway?.toUpperCase()} and cannot create NCLEX-${body.pathway.toUpperCase()} attempts.`
      }, { status: 403 });
    }
    body.pathway = session.pathway;
  }

  const res = await attemptsService.startAttempt(body, session);
  return NextResponse.json(res.data || { success: res.success, error: res.error }, { status: res.status });
}
