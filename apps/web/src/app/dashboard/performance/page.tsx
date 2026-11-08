import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { resolveSession } from "@/lib/session";
import { PerformanceIntelligenceView } from "@/components/learner/performance/performance-intelligence-view";

export const metadata: Metadata = {
  title: `Performance Intelligence | ${BRAND.name}`,
  description:
    "Authoritative NCLEX performance analytics, NCSBN Client Needs category mastery, and clinical judgment development.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPerformancePage() {
  const session = await resolveSession();
  if (session) {
    if (session.pathway === "pn") {
      redirect("/dashboard/pn/performance");
    }
    redirect("/dashboard/rn/performance");
  }

  return <PerformanceIntelligenceView initialPathway="rn" />;
}
