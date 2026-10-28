import type { Metadata } from "next";
import { getAllSubscriptionPlans } from "@/lib/subscription-store";
import { SubscriptionsPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Subscriptions & Study Plans",
  description:
    "Compare NCLEX-RN and NCLEX-PN subscription plans and select the preparation option that fits your needs.",
  alternates: {
    canonical: "/subscriptions",
  },
  openGraph: {
    title: "Subscriptions & Study Plans | PrepFord",
    description:
      "Compare NCLEX-RN and NCLEX-PN subscription plans and select the preparation option that fits your needs.",
    url: "/subscriptions",
  },
};

export default function SubscriptionsPage() {
  let initialPlans;
  try {
    initialPlans = getAllSubscriptionPlans(false);
  } catch {
    initialPlans = undefined;
  }

  return <SubscriptionsPageClient initialPlans={initialPlans} />;
}
