import type { Metadata } from "next";
import { AdminRevisionStudioClient } from "./page-client";

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
  return <AdminRevisionStudioClient familyId={id} revisionId={revisionId} />;
}
