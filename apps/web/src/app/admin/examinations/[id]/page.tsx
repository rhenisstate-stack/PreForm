import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminExaminationFamilyClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Examination Family Lineage Studio",
  description: "View and manage versioned revisions, lifecycle lineage, and administrative metadata.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminExaminationFamilyPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return (
    <Suspense fallback={<BrandedLoading message="Loading examination lineage..." fullScreen={false} />}>
      <AdminExaminationFamilyClient id={id} />
    </Suspense>
  );
}
