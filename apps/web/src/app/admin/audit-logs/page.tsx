import type { Metadata } from "next";
import { AdminAuditLogsClient } from "./page-client";

export const metadata: Metadata = {
  title: "Audit Trail & Compliance | PrepFord Admin",
  description: "Comprehensive audit logging, security event tracking, correlation inspection, and forensic audit trail.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAuditLogsPage() {
  return <AdminAuditLogsClient />;
}
