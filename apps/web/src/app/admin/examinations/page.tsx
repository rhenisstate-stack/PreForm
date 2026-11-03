import type { Metadata } from "next";
import { AdminExaminationsClient } from "./page-client";

export const metadata: Metadata = {
  title: "Examination Catalogue & Governance",
  description: "Manage authoritative NCLEX-RN and NCLEX-PN examination families, versioned revisions, and question membership.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminExaminationsPage() {
  return <AdminExaminationsClient />;
}
