import { PracticeExamsWorkspace } from "@/components/admin/exam-management/practice-exams-workspace";

export default async function AdminPracticeExamDeletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PracticeExamsWorkspace initialMode="delete" initialEntityId={id} />;
}
