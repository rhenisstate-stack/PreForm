import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSecuritySessionsClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Super Admin Session Security & Device Monitoring | PrepFord Studio",
  description: "Configure global session policies, monitor active candidate sessions, and perform administrative session revocation.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSecuritySessionsPage() {
  return (
    <Suspense fallback={<BrandedLoading message="Loading Session Security Console..." />}>
      <AdminSecuritySessionsClient />
    </Suspense>
  );
}
