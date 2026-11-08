import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PerformanceIntelligenceView } from "@/components/learner/performance/performance-intelligence-view";

export const metadata: Metadata = {
  title: `NCLEX-PN Performance Intelligence | ${BRAND.name}`,
  description:
    "Authoritative NCLEX-PN performance analytics, Practical Nursing Client Needs category mastery, clinical procedure accuracy, and personalized study interventions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NCLEXPNPerformancePage() {
  return <PerformanceIntelligenceView initialPathway="pn" />;
}
