import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Performance Intelligence | ${BRAND.name}`,
  description:
    "Authoritative NCLEX performance analytics, NCSBN Client Needs category mastery, and clinical judgment development.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
