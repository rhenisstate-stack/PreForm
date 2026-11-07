import { AdminQuestionsClient } from "../page-client";

export default async function AdminQuestionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminQuestionsClient initialMode="details" initialQuestionId={id} />;
}
