import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PerformanceIntelligenceView } from "@/components/learner/performance/performance-intelligence-view";

export const metadata: Metadata = {
  title: `NCLEX-RN Performance Intelligence | ${BRAND.name}`,
  description:
    "Authoritative NCLEX-RN performance analytics, NCSBN Client Needs mastery, Clinical Judgment Measurement Model (NCJMM) cognitive analytics, and personalized remediation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NCLEXRNPerformancePage() {
  return <PerformanceIntelligenceView initialPathway="rn" canSwitchPathway={true} />;
}
