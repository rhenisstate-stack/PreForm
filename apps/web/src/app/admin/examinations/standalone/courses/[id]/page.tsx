import { CourseSubjectManagement } from "@/components/admin/exam-management/course-subject-management";

export default async function AdminStandaloneCourseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseSubjectManagement initialMode="details" initialEntityId={id} />;
}
