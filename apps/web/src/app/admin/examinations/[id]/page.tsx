import type { Metadata } from "next";
import { AdminExaminationFamilyClient } from "./page-client";

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
  return <AdminExaminationFamilyClient id={id} />;
}
