import { StandaloneTestsWorkspace } from "@/components/admin/exam-management/standalone-tests-workspace";

export default async function AdminStandaloneTestDeletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StandaloneTestsWorkspace initialSubTab="tests" initialMode="delete" initialEntityId={id} />;
}
