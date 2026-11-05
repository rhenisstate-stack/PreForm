import type { Metadata } from "next";
import { AdminRolesClient } from "./page-client";

export const metadata: Metadata = {
  title: "Roles & Permissions Directory | PrepFord Admin",
  description: "Configure system and custom administrative roles and manage granular permissions across modules.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRolesPage() {
  return <AdminRolesClient />;
}
