import { ClientNeedsManagement } from "@/components/admin/exam-management/client-needs-management";

export default async function AdminStandaloneClientNeedEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientNeedsManagement initialMode="edit" initialEntityId={id} />;
}
