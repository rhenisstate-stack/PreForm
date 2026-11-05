import type { Metadata } from "next";
import { AdminIpRulesClient } from "./page-client";

export const metadata: Metadata = {
  title: "IP Access Rule Governance | PrepFord Admin",
  description: "Configure explicit IP blacklists and whitelists with CIDR notation support for edge perimeter security.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminIpRulesPage() {
  return <AdminIpRulesClient />;
}
