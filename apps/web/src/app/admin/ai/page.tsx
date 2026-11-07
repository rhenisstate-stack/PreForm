import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { AdminAIGovernanceClient } from "./page-client";

export const metadata: Metadata = {
  title: `AI Studio Governance | ${BRAND.name} Admin`,
  description: "Provider settings, feature toggles, per-user quotas, and token cost monitoring.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAIPage() {
  return <AdminAIGovernanceClient />;
}
