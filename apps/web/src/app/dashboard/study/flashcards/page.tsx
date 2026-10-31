import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { StudyFlashcardsClient } from "@/components/learner/study-studio/study-flashcards-client";

export const metadata: Metadata = {
  title: `Flashcard Decks | ${BRAND.name}`,
  description: "Create and manage personal flashcard decks with curated-guided or manual cards.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudyFlashcardsPage() {
  return <StudyFlashcardsClient />;
}
