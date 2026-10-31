import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { TopicQuizClient } from "@/components/learner/study-studio/topic-quiz-client";

export const metadata: Metadata = {
  title: `Topic Quizzes | ${BRAND.name}`,
  description: "Unscored NCLEX topic drills with immediate clinical rationales.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudyQuizzesPage() {
  return <TopicQuizClient />;
}
