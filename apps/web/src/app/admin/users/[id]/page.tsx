import { AdminUsersClient } from "../page-client";

export const metadata = {
  title: "User Account Details | Admin Dashboard | PrepFord NCLEX",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUsersClient initialMode="detail" initialUserId={id} />;
}
