import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminRevisionStudioClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Examination Revision Authoring Studio",
  description: "Compose, edit metadata, manage question membership, and execute lifecycle state transitions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminRevisionStudioPage(props: {
  params: Promise<{ id: string; revisionId: string }>;
}) {
  const { id, revisionId } = await props.params;
  return (
    <Suspense fallback={<BrandedLoading message="Loading revision authoring studio..." fullScreen={false} />}>
      <AdminRevisionStudioClient familyId={id} revisionId={revisionId} />
    </Suspense>
  );
}
