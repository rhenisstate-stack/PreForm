import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSubscriptionsClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Subscription Plans Management",
  description: "Configure authoritative NCLEX-RN and NCLEX-PN subscription plans, pricing, card appearance, and entitlements.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <BrandedLoading message="Loading subscription management..." fullScreen={false} />
        </div>
      }
    >
      <AdminSubscriptionsClient />
    </Suspense>
  );
}
