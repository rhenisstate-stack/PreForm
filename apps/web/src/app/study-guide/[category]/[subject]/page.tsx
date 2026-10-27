import { notFound } from "next/navigation";
import { STUDY_GUIDE_CATEGORIES, getSubjectBySlugs } from "@/lib/study-guide-data";
import { SubjectPageClient } from "./page-client";

type Props = {
  params: Promise<{ category: string; subject: string }>;
};

export async function generateStaticParams() {
  const params: { category: string; subject: string }[] = [];
  for (const cat of STUDY_GUIDE_CATEGORIES) {
    for (const subj of cat.subjects) {
      params.push({
        category: cat.slug,
        subject: subj.slug,
      });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { category: catSlug, subject: subjSlug } = await params;
  const result = getSubjectBySlugs(catSlug, subjSlug);
  if (!result) {
    return { title: "Topic Not Found | PrepFord Study Guide" };
  }
  return {
    title: `${result.subject.title} | PrepFord NCLEX Study Guide`,
    description: result.subject.summary,
  };
}

export default async function StudyGuideSubjectPage({ params }: Props) {
  const { category: catSlug, subject: subjSlug } = await params;
  const result = getSubjectBySlugs(catSlug, subjSlug);

  if (!result) {
    notFound();
  }

  return <SubjectPageClient category={result.category} subject={result.subject} />;
}
