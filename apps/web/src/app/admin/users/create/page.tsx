import { AdminUsersClient } from "../page-client";

export const metadata = {
  title: "Create User Account | Admin Dashboard | PrepFord NCLEX",
};

export default function AdminCreateUserPage() {
  return <AdminUsersClient initialMode="create" />;
}
