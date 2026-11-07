import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { AdminReviewSessionsClient } from "./page-client";

export const metadata: Metadata = {
  title: `Review Sessions Management | ${BRAND.name} Admin`,
  description: "Configure spaced repetition parameters, inspect learner review session logs, and analyze retention metrics.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminReviewSessionsPage() {
  return <AdminReviewSessionsClient />;
}
