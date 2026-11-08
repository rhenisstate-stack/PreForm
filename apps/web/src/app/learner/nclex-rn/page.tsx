import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { DashboardClient } from "@/app/dashboard/page-client";

export const metadata: Metadata = {
  title: `NCLEX-RN Learner Dashboard | ${BRAND.name}`,
  description:
    "Comprehensive Registered Nurse clinical judgment, acute care scenarios, NCSBN RN Client Needs performance, and adaptive readiness assessments.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LearnerNCLEXRNDashboardPage() {
  return <DashboardClient lockedPathway="rn" />;
}
