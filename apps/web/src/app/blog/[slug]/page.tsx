import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllBlogPosts, getBlogPostBySlug, getRelatedPosts } from "@/lib/blog-data";
import { BRAND } from "@/lib/brand";
import { ArticleDetailClient } from "./page-client";

export function generateStaticParams() {
  const posts = getAllBlogPosts();
  const params = posts.map((post) => ({ slug: post.slug }));
  params.push({ slug: "blog-next-generation-nclex" });
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found | PrepFord NCLEX",
      description: "The requested NCLEX educational article could not be found.",
    };
  }

  const ogImage = post.featuredImage || "/images/blog/prepford-blog-hero.jpg";

  return {
    title: `${post.title} | PrepFord NCLEX Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author.name],
      tags: post.tags,
      siteName: BRAND.fullName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 675,
          alt: post.imageAlt || post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, 2);

  // Schema.org BlogPosting Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: `${post.author.role} (${post.author.credentials})`,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.fullName,
      logo: {
        "@type": "ImageObject",
        url: "/prepford-logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleDetailClient post={post} relatedPosts={relatedPosts} />
    </>
  );
}
