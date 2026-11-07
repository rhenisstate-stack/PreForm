import { AdminQuestionsClient } from "../../page-client";

export default async function AdminQuestionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminQuestionsClient initialMode="edit" initialQuestionId={id} />;
}
