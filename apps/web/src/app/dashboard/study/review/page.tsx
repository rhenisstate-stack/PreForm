import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { StudyReviewClient } from "@/components/learner/study-studio/study-review-client";

export const metadata: Metadata = {
  title: `Review Session | ${BRAND.name}`,
  description: "Spaced-repetition flashcard review with server-side SM-2 scheduling.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudyReviewPage() {
  return <StudyReviewClient />;
}
