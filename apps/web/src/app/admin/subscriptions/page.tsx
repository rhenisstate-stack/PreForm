import type { Metadata } from "next";
import { AdminSubscriptionsClient } from "./page-client";

export const metadata: Metadata = {
  title: "Subscription Plans Management",
  description: "Configure authoritative NCLEX-RN and NCLEX-PN subscription plans, pricing, card appearance, and entitlements.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSubscriptionsPage() {
  return <AdminSubscriptionsClient />;
}
