import type { Metadata } from "next";
import { AdminMonitoringClient } from "./page-client";

export const metadata: Metadata = {
  title: "System Health & Observability | Admin Studio | PrepFord",
  description: "Real-time PostgreSQL round-trip latency, active sessions, committed memory, and operational incidents.",
};

export default function AdminMonitoringPage() {
  return <AdminMonitoringClient />;
}
