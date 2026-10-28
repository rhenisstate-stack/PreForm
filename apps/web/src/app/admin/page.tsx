import type { Metadata } from "next";
import { AdminOverviewClient } from "./page-client";

export const metadata: Metadata = {
  title: "Administrator Workspace | PrepFord",
  description: "PrepFord administration workspace for managing items, users, and platform operations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminOverviewClient />;
}
