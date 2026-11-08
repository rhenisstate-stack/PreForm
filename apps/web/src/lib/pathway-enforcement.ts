import { NextResponse } from "next/server";
import type { VerifiedSession } from "@/lib/session";

/**
 * Enforces authoritative single-pathway boundary for student learners.
 * Candidates are strictly bound to their enrolled pathway ('rn' | 'pn').
 * Multi-pathway or cross-pathway queries result in an immediate 403 Forbidden.
 */
export function enforceLearnerPathway(
  session: VerifiedSession,
  requestedPathway?: string | null
): { allowed: boolean; effectivePathway: "rn" | "pn"; errorResponse?: NextResponse } {
  if (session.role !== "candidate") {
    const p = requestedPathway?.toLowerCase() === "pn" ? "pn" : "rn";
    return { allowed: true, effectivePathway: p };
  }

  const studentPathway = session.pathway === "pn" ? "pn" : "rn";

  if (requestedPathway) {
    const normalized = requestedPathway.trim().toLowerCase();
    if (normalized !== studentPathway) {
      return {
        allowed: false,
        effectivePathway: studentPathway,
        errorResponse: NextResponse.json(
          {
            success: false,
            code: "PATHWAY_MISMATCH",
            error: `Cross-pathway access forbidden. Learner is enrolled in NCLEX-${studentPathway.toUpperCase()} and cannot access NCLEX-${normalized.toUpperCase()}.`,
          },
          { status: 403 }
        ),
      };
    }
  }

  return { allowed: true, effectivePathway: studentPathway };
}
