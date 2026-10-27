import { describe, it, expect } from "vitest";
import {
  getAllBlogPosts,
  getBlogPostBySlug,
  getPaginatedPosts,
  getRelatedPosts,
  getAllCategories,
} from "@/lib/blog-data";

describe("Blog Data & Pagination Logic", () => {
  it("provides educational NCLEX articles across expected categories", () => {
    const posts = getAllBlogPosts();
    expect(posts.length).toBeGreaterThanOrEqual(8);

    const categories = getAllCategories();
    expect(categories).toContain("Next Gen NCLEX");
    expect(categories).toContain("Pharmacology");
    expect(categories).toContain("Clinical Judgment");
  });

  it("retrieves individual blog post by unique slug", () => {
    const post = getBlogPostBySlug("mastering-ngn-clinical-judgment-measurement-model");
    expect(post).toBeDefined();
    expect(post?.title).toContain("Clinical Judgment Measurement Model");
    expect(post?.author.name).toBe("PREform Nurse Educator Team");

    const nonExistent = getBlogPostBySlug("non-existent-article-slug");
    expect(nonExistent).toBeUndefined();
  });

  it("paginates articles correctly across pages without duplication", () => {
    const page1 = getPaginatedPosts(1, 4);
    const page2 = getPaginatedPosts(2, 4);

    expect(page1.posts).toHaveLength(4);
    expect(page2.posts.length).toBeGreaterThan(0);
    expect(page1.currentPage).toBe(1);
    expect(page2.currentPage).toBe(2);

    // Verify disjoint sets (no overlap)
    const page1Slugs = new Set(page1.posts.map((p) => p.slug));
    for (const post of page2.posts) {
      expect(page1Slugs.has(post.slug)).toBe(false);
    }
  });

  it("filters articles by category", () => {
    const pharmPosts = getPaginatedPosts(1, 10, "Pharmacology");
    expect(pharmPosts.posts.length).toBeGreaterThan(0);
    for (const post of pharmPosts.posts) {
      expect(post.category).toBe("Pharmacology");
    }
  });

  it("filters articles by keyword search", () => {
    const searchResult = getPaginatedPosts(1, 10, "All", "Dosage");
    expect(searchResult.posts.length).toBeGreaterThan(0);
    for (const post of searchResult.posts) {
      const match =
        post.title.toLowerCase().includes("dosage") ||
        post.excerpt.toLowerCase().includes("dosage") ||
        post.tags.some((t) => t.toLowerCase().includes("dosage"));
      expect(match).toBe(true);
    }
  });

  it("safely handles out-of-bounds or invalid page numbers", () => {
    // Negative page clamps to 1
    const negativePage = getPaginatedPosts(-5, 4);
    expect(negativePage.currentPage).toBe(1);

    // Page far exceeding total pages clamps to totalPages
    const highPage = getPaginatedPosts(999, 4);
    expect(highPage.currentPage).toBe(highPage.totalPages);
  });

  it("retrieves related posts without including the current article", () => {
    const slug = "high-alert-medications-nclex-pharmacology";
    const related = getRelatedPosts(slug, 2);

    expect(related).toHaveLength(2);
    for (const post of related) {
      expect(post.slug).not.toBe(slug);
    }
  });
});
