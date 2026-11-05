import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminQuestionsClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Question Bank & Curriculum | PrepFord Admin",
  description: "Author, review, approve, publish, and manage canonical NCLEX questions and curriculum hierarchy.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminQuestionsPage() {
  return (
    <Suspense fallback={<BrandedLoading message="Loading Question Bank..." fullScreen={false} />}>
      <AdminQuestionsClient />
    </Suspense>
  );
}
