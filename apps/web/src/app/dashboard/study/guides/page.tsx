import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { CuratedGuidesBrowser } from "@/components/learner/study-studio/curated-guides-browser";

export const metadata: Metadata = {
  title: `Curated Study Guides | ${BRAND.name}`,
  description: "Peer-reviewed clinical NCLEX study guides with key takeaways and instant flashcard conversion.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudyGuidesPage() {
  return <CuratedGuidesBrowser />;
}
