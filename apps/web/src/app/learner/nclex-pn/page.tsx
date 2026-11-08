import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { DashboardClient } from "@/app/dashboard/page-client";

export const metadata: Metadata = {
  title: `NCLEX-PN Learner Dashboard | ${BRAND.name}`,
  description:
    "Practical and vocational nursing bedside care, clinical procedures, NCSBN PN Client Needs performance, and practical readiness assessments.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LearnerNCLEXPNDashboardPage() {
  return <DashboardClient lockedPathway="pn" />;
}
