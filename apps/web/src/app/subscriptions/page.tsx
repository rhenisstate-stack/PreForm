import type { Metadata } from "next";
import { subscriptionService } from "@/lib/api-services";
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

export default async function SubscriptionsPage() {
  let initialPlans;
  try {
    const apiRes = await subscriptionService.getActivePlans();
    if (apiRes.success && apiRes.data?.plans) {
      initialPlans = apiRes.data.plans;
    } else {
      initialPlans = getAllSubscriptionPlans(false);
    }
  } catch {
    try {
      initialPlans = getAllSubscriptionPlans(false);
    } catch {
      initialPlans = undefined;
    }
  }

  return <SubscriptionsPageClient initialPlans={initialPlans} />;
}
