import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { AdminStudyGuidesClient } from "./page-client";

export const metadata: Metadata = {
  title: `Study Guide Management | ${BRAND.name} Admin`,
  description: "Official study guide authoring, categorization, and versioning console.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminStudyGuidesPage() {
  return <AdminStudyGuidesClient />;
}
