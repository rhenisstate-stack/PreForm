import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { DashboardClient } from "../page-client";

export const metadata: Metadata = {
  title: `NCLEX-RN Learner Dashboard | ${BRAND.name}`,
  description:
    "Comprehensive Registered Nurse clinical judgment, acute care scenarios, NCSBN RN Client Needs performance, and adaptive readiness assessments.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NCLEXRNDashboardPage() {
  return <DashboardClient lockedPathway="rn" />;
}
