import { AdminExaminationFamilyClient } from "@/app/admin/examinations/[id]/page-client";

export default async function AdminRatDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminExaminationFamilyClient id={id} />;
}
