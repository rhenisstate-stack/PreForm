import type { Metadata } from "next";
import { AdminUsersClient } from "./page-client";

export const metadata: Metadata = {
  title: "User & Account Governance | PrepFord Admin",
  description: "Search, inspect, and manage learner and administrative accounts, role assignments, and security status.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
