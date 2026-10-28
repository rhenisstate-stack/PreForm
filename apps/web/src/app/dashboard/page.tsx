import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { DashboardClient } from "./page-client";

export const metadata: Metadata = {
  title: `Student Workspace | ${BRAND.name}`,
  description: "Personalized NCLEX study portal, practice questions, readiness assessments, and learning progress.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
