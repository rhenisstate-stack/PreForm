import { AdminQuestionsClient } from "../../../questions/page-client";

export default async function AdminQuestionRepositoryEditPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  return <AdminQuestionsClient initialMode="edit" initialQuestionId={questionId} />;
}
