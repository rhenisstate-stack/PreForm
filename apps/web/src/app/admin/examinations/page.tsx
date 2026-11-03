import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminExaminationsClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Examination Catalogue & Governance",
  description: "Manage authoritative NCLEX-RN and NCLEX-PN examination families, versioned revisions, and question membership.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminExaminationsPage() {
  return (
    <Suspense fallback={<BrandedLoading message="Loading examination catalogue..." fullScreen={false} />}>
      <AdminExaminationsClient />
    </Suspense>
  );
}
