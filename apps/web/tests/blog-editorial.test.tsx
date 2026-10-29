import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import * as React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => {
  const currentParams = new URLSearchParams();
  return {
    usePathname: () => "/blog",
    useRouter: () => ({
      push: vi.fn(),
      refresh: vi.fn(),
    }),
    useSearchParams: () => currentParams,
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  };
});

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, priority, ...props }: React.ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} data-priority={priority ? "true" : undefined} {...props} />;
  },
}));

import { BlogPageClient } from "@/app/blog/page-client";
import { ArticleDetailClient } from "@/app/blog/[slug]/page-client";
import {
  getBlogPostBySlug,
  getRelatedPosts,
  getAllCategories,
} from "@/lib/blog-data";
import { generateMetadata } from "@/app/blog/[slug]/page";

describe("Phase 1 & Phase 2: PrepFord Blog & Article Detail Transformation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Blog Listing & Editorial Hero (Phase 1)", () => {
    it("renders the dedicated editorial hero with title, copy, and real hero image", () => {
      render(<BlogPageClient />);

      // 1. Heading and supporting copy
      expect(
        screen.getByRole("heading", { level: 1, name: /PrepFord Nursing Insights/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Master Next Generation NCLEX clinical judgment/i)
      ).toBeInTheDocument();

      // 2. Real hero image
      const heroImg = screen.getByAltText(/Focused nursing student in scrubs studying NCLEX materials/i);
      expect(heroImg).toBeInTheDocument();
      expect(heroImg).toHaveAttribute("src", "/images/blog/prepford-blog-hero.jpg");
      expect(heroImg).toHaveAttribute("data-priority", "true");
    });

    it("renders editorial category navigation tabs with active selection styling", () => {
      render(<BlogPageClient />);

      const tablist = screen.getByRole("tablist", { name: /Article categories/i });
      expect(tablist).toBeInTheDocument();

      const categories = getAllCategories();
      expect(categories).toContain("Next Gen NCLEX");
      expect(categories).toContain("NCLEX-RN");
      expect(categories).toContain("NCLEX-PN");
      expect(categories).toContain("Clinical Judgment");
      expect(categories).toContain("Pharmacology");
      expect(categories).toContain("Study Strategies");
      expect(categories).toContain("Nursing Education");

      // "All" is active by default
      const allTab = within(tablist).getByRole("tab", { name: "All" });
      expect(allTab).toHaveAttribute("aria-selected", "true");
    });

    it("renders featured guide spotlight on default page 1 view", () => {
      render(<BlogPageClient />);

      expect(screen.getByText(/Featured Clinical Guide/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Understanding the Next Generation NCLEX: Clinical Judgment/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Read Complete Guide/i })).toHaveAttribute(
        "href",
        "/blog/understanding-the-next-generation-nclex"
      );
    });

    it("renders responsive article cards with thumbnails, category, date, author, and reading time", () => {
      render(<BlogPageClient />);

      const readButtons = screen.getAllByRole("link", { name: /Read article/i });
      expect(readButtons.length).toBeGreaterThan(0);

      // Verify at least one article card has thumbnail image
      const thumbnailImages = screen.getAllByRole("img");
      expect(thumbnailImages.length).toBeGreaterThanOrEqual(2);
    });

    it("supports search bar filtering and clearing", () => {
      render(<BlogPageClient />);

      const searchInput = screen.getByPlaceholderText(/Search clinical topics.../i);
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "Dosage" } });
      expect(searchInput).toHaveValue("Dosage");
    });
  });

  describe("Blog Article Detail Page & Seed Article (Phase 2)", () => {
    const post = getBlogPostBySlug("understanding-the-next-generation-nclex")!;
    const related = getRelatedPosts("understanding-the-next-generation-nclex", 2);

    it("verifies original seed article content model integrity", () => {
      expect(post).toBeDefined();
      expect(post.title).toContain("Understanding the Next Generation NCLEX");
      expect(post.category).toBe("Next Gen NCLEX");
      expect(post.featuredImage).toBe("/images/blog/prepford-ngn-article-hero.jpg");
      expect(post.content.lead).toContain("The Next Generation NCLEX (NGN) represents the most significant evolution");
      expect(post.content.keyTakeaways.length).toBeGreaterThanOrEqual(4);
      expect(post.content.sections.length).toBeGreaterThanOrEqual(4);
    });

    it("supports alias 'blog-next-generation-nclex' routing to the seed article", () => {
      const aliasPost = getBlogPostBySlug("blog-next-generation-nclex");
      expect(aliasPost).toBeDefined();
      expect(aliasPost?.slug).toBe("understanding-the-next-generation-nclex");
    });

    it("renders article hero, author credentials, mandatory hero image, and table of contents", () => {
      render(<ArticleDetailClient post={post} relatedPosts={related} />);

      // Heading
      expect(
        screen.getByRole("heading", { level: 1, name: /Understanding the Next Generation NCLEX/i })
      ).toBeInTheDocument();

      // Author credentials
      expect(screen.getByText("PrepFord Nurse Educator Team")).toBeInTheDocument();
      expect(screen.getByText(/Clinical Curriculum & Testing Specialist • MSN, RN, CNE/i)).toBeInTheDocument();

      // Mandatory hero image
      const heroImage = screen.getByAltText(post.imageAlt);
      expect(heroImage).toBeInTheDocument();
      expect(heroImage).toHaveAttribute("src", "/images/blog/prepford-ngn-article-hero.jpg");

      // Table of Contents with working anchor links
      const toc = screen.getByRole("navigation", { name: /Table of contents/i });
      expect(toc).toBeInTheDocument();
      expect(within(toc).getByText(/Why the NCLEX Changed: The Shift to Clinical Judgment/i)).toBeInTheDocument();
    });

    it("renders key clinical takeaways, structured sections, comparison table, and inline image with caption", () => {
      render(<ArticleDetailClient post={post} relatedPosts={related} />);

      // Key Takeaways
      expect(screen.getByRole("heading", { level: 2, name: /Key Clinical Takeaways/i })).toBeInTheDocument();
      expect(screen.getByText(/The NGN measures the 6 cognitive operations/i)).toBeInTheDocument();

      // Comparison Table
      expect(screen.getByText(/NCJMM Cognitive Step/i)).toBeInTheDocument();
      expect(screen.getAllByText(/1\. Recognize Cues/i)[0]).toBeInTheDocument();

      // Inline Image Caption
      expect(
        screen.getByText(/Figure 1: PrepFord simulated clinical study station with EHR multi-tab review/i)
      ).toBeInTheDocument();
    });

    it("renders contextual PrepFord CTA leading to real courses and RN pathway", () => {
      render(<ArticleDetailClient post={post} relatedPosts={related} />);

      expect(screen.getByText(/Build Clinical Judgment with PrepFord Case Studies/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Browse Courses/i })).toHaveAttribute("href", "/courses");
      expect(screen.getByRole("link", { name: /RN Pathway/i })).toHaveAttribute("href", "/nclex-rn");
    });

    it("renders social sharing buttons and back to blog link", () => {
      render(<ArticleDetailClient post={post} relatedPosts={related} />);

      expect(screen.getByRole("button", { name: /Copy article link/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Share on X \(formerly Twitter\)/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Share on LinkedIn/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Back to All Articles/i })).toHaveAttribute("href", "/blog");
    });

    it("generates comprehensive SEO metadata from the actual article record", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: "understanding-the-next-generation-nclex" }),
      });

      expect(meta.title).toContain("Understanding the Next Generation NCLEX");
      expect(meta.description).toContain("A candidate guide to the NCSBN Clinical Judgment Measurement Model");
      expect(meta.alternates?.canonical).toBe("/blog/understanding-the-next-generation-nclex");
      const og = meta.openGraph as { type?: string; images?: Array<{ url: string }> } | undefined;
      expect(og?.type).toBe("article");
      expect(og?.images?.[0].url).toBe("/images/blog/prepford-ngn-article-hero.jpg");
    });
  });
});
