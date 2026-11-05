import type { Metadata } from "next";
import { AdminReportsClient } from "./page-client";

export const metadata: Metadata = {
  title: "Reports & Analytics | Admin Studio | PrepFord",
  description: "Assessment outcomes, score distribution deciles, examination revision analytics, and question-bank performance.",
};

export default function AdminReportsPage() {
  return <AdminReportsClient />;
}
