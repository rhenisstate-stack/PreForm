import { RatsManagementWorkspace } from "@/components/admin/exam-management/rats-management-workspace";

export default async function AdminRatDeletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RatsManagementWorkspace initialMode="delete" initialEntityId={id} />;
}
