import { AdminQuestionsClient } from "../../../questions/page-client";

export default async function AdminQuestionRepositoryDeletePage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  return <AdminQuestionsClient initialMode="delete" initialQuestionId={questionId} />;
}
