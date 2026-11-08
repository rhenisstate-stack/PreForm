import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
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

export default function DashboardPerformancePage() {
  return <PerformanceIntelligenceView initialPathway="rn" canSwitchPathway={true} />;
}
