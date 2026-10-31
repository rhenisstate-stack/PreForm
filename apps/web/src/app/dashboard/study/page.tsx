import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { StudyStudioOverview } from "@/components/learner/study-studio/study-studio-overview";

export const metadata: Metadata = {
  title: `AI Study Studio | ${BRAND.name}`,
  description: "Personal active-recall workspace: flashcard decks, spaced-repetition review, and topic drills.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudyStudioPage() {
  return <StudyStudioOverview />;
}
