import { AdminQuestionsClient } from "../../page-client";

export default async function AdminQuestionDeletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminQuestionsClient initialMode="delete" initialQuestionId={id} />;
}
