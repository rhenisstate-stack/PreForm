import { PracticeExamsWorkspace } from "@/components/admin/exam-management/practice-exams-workspace";

export default async function AdminPracticeExamEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PracticeExamsWorkspace initialMode="edit" initialEntityId={id} />;
}
