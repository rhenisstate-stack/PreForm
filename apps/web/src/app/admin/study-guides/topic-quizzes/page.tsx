import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { AdminTopicQuizzesClient } from "./page-client";

export const metadata: Metadata = {
  title: `Topic Quizzes Management | ${BRAND.name} Admin`,
  description: "Create official topic quizzes, source questions from the question bank, review AI-drafted items, and track exam performance.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminTopicQuizzesPage() {
  return <AdminTopicQuizzesClient />;
}
