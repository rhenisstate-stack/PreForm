import { AdminQuestionsClient } from "../../questions/page-client";

export default async function AdminQuestionRepositoryDetailsPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  return <AdminQuestionsClient initialMode="details" initialQuestionId={questionId} />;
}
