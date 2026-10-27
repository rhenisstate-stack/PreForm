import { notFound } from "next/navigation";
import { STUDY_GUIDE_CATEGORIES, getCategoryBySlug } from "@/lib/study-guide-data";
import { CategoryPageClient } from "./page-client";

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  return STUDY_GUIDE_CATEGORIES.map((cat) => ({
    category: cat.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) {
    return { title: "Category Not Found | PrepFord Study Guide" };
  }
  return {
    title: `${category.title} Study Notes | PrepFord NCLEX Prep`,
    description: category.description,
  };
}

export default async function StudyGuideCategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return <CategoryPageClient category={category} />;
}
