/**
 * Curated-guide → active-recall flashcard generation for PrepFord AI Study
 * Studio Phase 1.
 *
 * IMPORTANT — provenance & honesty guarantees:
 * - Cards are derived verbatim from the curated PrepFord study guide content
 *   (`study-guide-data.ts`) which was authored and reviewed by PrepFord
 *   educators. Nothing is synthesized, paraphrased by an AI model, or
 *   auto-published on the learner's behalf.
 * - Generated decks are personal (`curated_guide` source, cards start in the
 *   `personal_unreviewed` state) and only become "active" personal material
 *   after the learner's first Good-or-better SM-2 review.
 * - Fully AI-generated flashcards from learner-uploaded documents are a
 *   deliberate Phase 2 capability and are NOT available in Phase 1.
 */

import { STUDY_GUIDE_CATEGORIES, type StudyGuideSubject } from "@/lib/study-guide-data";

export interface GeneratedGuideCard {
  front: string;
  back: string;
}

export interface CuratedGuideDeckBlueprint {
  name: string;
  sourceReference: string;
  topicSlug: string;
  topicTitle: string;
  cards: GeneratedGuideCard[];
}

export function listCuratedGuideSubjects(): Array<{
  categorySlug: string;
  categoryTitle: string;
  subjectSlug: string;
  subjectTitle: string;
  subject: StudyGuideSubject;
}> {
  const options: ReturnType<typeof listCuratedGuideSubjects> = [];
  for (const category of STUDY_GUIDE_CATEGORIES) {
    for (const subject of category.subjects) {
      options.push({
        categorySlug: category.slug,
        categoryTitle: category.title,
        subjectSlug: subject.slug,
        subjectTitle: subject.title,
        subject,
      });
    }
  }
  return options;
}

/**
 * Builds recall prompts from one study-guide subject:
 * - every `clinicalKeyTakeaways` entry becomes a numbered recall card;
 * - every section earmarked as a clinical alert becomes a Q/A card keyed on
 *   its alert title; sections without alerts contribute their core teaching
 *   point keyed on the section heading.
 */
export function buildCuratedGuideCards(subject: StudyGuideSubject): GeneratedGuideCard[] {
  const cards: GeneratedGuideCard[] = [];

  const takeawayTotal = subject.clinicalKeyTakeaways.length;
  subject.clinicalKeyTakeaways.forEach((takeaway, index) => {
    cards.push({
      front:
        takeawayTotal === 1
          ? `State the key clinical takeaway for ${subject.title}.`
          : `Recall key clinical takeaway ${index + 1} of ${takeawayTotal} for ${subject.title}.`,
      back: takeaway,
    });
  });

  for (const section of subject.sections) {
    if (section.clinicalAlert) {
      cards.push({
        front: `What does the clinical alert "${section.clinicalAlert.title}" require you to remember?`,
        back: section.clinicalAlert.text,
      });
    } else {
      cards.push({
        front: `Core teaching point — ${section.heading}: what are the exam-relevant facts?`,
        back: section.body,
      });
    }
  }

  return cards;
}

/**
 * Full deck blueprint for one subject, ready to be submitted via the
 * flashcard API (sourceType "curated_guide").
 */
export function buildCuratedGuideDeckBlueprint(subject: StudyGuideSubject): CuratedGuideDeckBlueprint {
  return {
    name: `${subject.title} — Curated Guide Cards`,
    sourceReference: `PrepFord Study Guide — ${subject.title}`,
    topicSlug: subject.slug,
    topicTitle: subject.title,
    cards: buildCuratedGuideCards(subject),
  };
}
