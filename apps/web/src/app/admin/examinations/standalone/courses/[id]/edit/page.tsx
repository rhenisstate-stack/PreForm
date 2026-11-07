import { CourseSubjectManagement } from "@/components/admin/exam-management/course-subject-management";

export default async function AdminStandaloneCourseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseSubjectManagement initialMode="edit" initialEntityId={id} />;
}
