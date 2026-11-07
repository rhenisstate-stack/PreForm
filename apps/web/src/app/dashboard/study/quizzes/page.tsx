import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { TopicQuizzesRunner } from "@/components/learner/study-studio/topic-quizzes-runner";

export const metadata: Metadata = {
  title: `Topic Quizzes & Practice Drills | ${BRAND.name}`,
  description: "Targeted clinical practice drills with canonical NCLEX questions, instant rationales, and Client Needs scoring.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudyQuizzesPage() {
  return <TopicQuizzesRunner />;
}
