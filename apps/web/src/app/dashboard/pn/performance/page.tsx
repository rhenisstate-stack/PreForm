import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PerformanceIntelligenceView } from "@/components/learner/performance/performance-intelligence-view";

export const metadata: Metadata = {
  title: `NCLEX-PN Performance Intelligence | ${BRAND.name}`,
  description:
    "Authoritative NCLEX-PN performance analytics, practical nursing Client Needs category mastery, and bedside procedural precision.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPNPerformancePage() {
  return <PerformanceIntelligenceView initialPathway="pn" />;
}
