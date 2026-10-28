"use client";

import { HeroSection } from "@/components/home/hero-section";
import { ExamPathwayCards } from "@/components/home/exam-pathway-cards";
import { QuestionLearningShowcase } from "@/components/home/question-learning-showcase";
import { StudyGuidePreview } from "@/components/home/study-guide-preview";
import { TestimonialsPreview } from "@/components/home/testimonials-preview";
import { FinalCTA } from "@/components/home/final-cta";

export function HomeClient() {
  return (
    <>
      <HeroSection />
      <ExamPathwayCards />
      <QuestionLearningShowcase />
      <StudyGuidePreview />
      <TestimonialsPreview />
      <FinalCTA />
    </>
  );
}
