import { BLOG_POSTS, BlogPost, BlogAuthor } from "@/lib/blog-data";

export interface AdminBlogPost extends BlogPost {
  status: "published" | "draft" | "scheduled" | "archived";
  scheduledPublishDate?: string;
  views?: number;
}

// In-memory initialized store with the canonical articles
let adminBlogPosts: AdminBlogPost[] = BLOG_POSTS.map((post, idx) => ({
  ...post,
  status: "published",
  views: 1250 - idx * 95,
}));

// Add a draft and a scheduled post for realistic editorial state
adminBlogPosts.push(
  {
    slug: "pediatric-fluid-management-and-burn-resuscitation",
    title: "Pediatric Fluid Management and Parkland Formula Calculations in Critical Care",
    excerpt: "Essential clinical protocols for calculating 24-hour crystalloid requirements and monitoring urine output in pediatric burn stabilization.",
    category: "Clinical Judgment",
    author: {
      name: "Dr. Evelyn Reed",
      role: "Pediatric Emergency Nurse Specialist",
      credentials: "DNP, CPNP-AC, CCRN",
    },
    publishedAt: new Date().toISOString().split("T")[0],
    readingTime: "7 min read",
    featuredImage: "/images/blog/prepford-pediatric-dosage-hero.jpg",
    imageAlt: "Pediatric critical care infusion pump and clinical calculations reference chart",
    tags: ["Pediatrics", "Burn Care", "Calculations", "Emergency"],
    status: "draft",
    views: 0,
    content: {
      lead: "Accurate fluid resuscitation in pediatric burn trauma requires strict adherence to modified Parkland protocols.",
      keyTakeaways: [
        "First 8 hours deliver half of the calculated 24-hour volume.",
        "Maintenance fluid with dextrose must be run concurrently in children under 30 kg.",
        "Target urine output is strictly 1 to 2 mL/kg/hr for infants and young children.",
      ],
      sections: [
        {
          id: "parkland-formula-overview",
          heading: "1. The Parkland Protocol for Pediatric Resuscitation",
          body: [
            "Burn shock involves massive capillary leak and rapid hypovolemia. Calculating fluid needs promptly within the first hour of injury is life-saving.",
            "Lactated Ringer's solution remains the isotonic crystalloid of choice.",
          ],
        },
      ],
    },
  },
  {
    slug: "2027-nclex-test-plan-updates-preview",
    title: "Preview of Upcoming NCLEX Test Plan Revisions and Clinical Judgment Enhancements",
    excerpt: "An early analysis of NCSBN three-year test plan evaluation cycles and upcoming psychometric adjustments.",
    category: "Next Gen NCLEX",
    author: {
      name: "PrepFord Nurse Educator Team",
      role: "Licensure Policy & Psychometrics",
      credentials: "MSN, RN, CNE",
    },
    publishedAt: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
    scheduledPublishDate: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
    readingTime: "6 min read",
    featuredImage: "/images/blog/prepford-ngn-article-hero.jpg",
    imageAlt: "NCSBN licensure documentation and computerized adaptive testing station",
    tags: ["Test Plan", "Policy", "Psychometrics", "NCLEX-RN"],
    status: "scheduled",
    views: 0,
    content: {
      lead: "NCSBN reviews practice analysis data on a rigorous 3-year cycle.",
      keyTakeaways: [
        "Passing standards remain aligned with entry-level safe nursing practice.",
        "Clinical judgment case studies will continue to expand across all health settings.",
      ],
      sections: [
        {
          id: "triennial-review",
          heading: "Triennial Practice Analysis Cycle",
          body: [
            "Every three years, thousands of newly licensed nurses participate in the nationwide RN and PN practice analyses.",
          ],
        },
      ],
    },
  }
);

export const blogService = {
  async getPosts(params?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ posts: AdminBlogPost[]; total: number; page: number; pageSize: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    let filtered = [...adminBlogPosts];

    if (params?.status && params.status !== "all") {
      filtered = filtered.filter((p) => p.status === params.status);
    }

    if (params?.category && params.category !== "all") {
      filtered = filtered.filter((p) => p.category === params.category);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const posts = filtered.slice(start, start + pageSize);

    return { posts, total, page, pageSize };
  },

  async getPostBySlug(slug: string): Promise<AdminBlogPost | null> {
    return adminBlogPosts.find((p) => p.slug === slug) || null;
  },

  async createPost(
    postData: Omit<AdminBlogPost, "slug"> & { slug?: string }
  ): Promise<AdminBlogPost> {
    const slug =
      postData.slug?.trim() ||
      postData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    if (adminBlogPosts.some((p) => p.slug === slug)) {
      throw new Error(`An article with slug '${slug}' already exists.`);
    }

    const newPost: AdminBlogPost = {
      ...postData,
      slug,
      status: postData.status || "draft",
      views: 0,
      publishedAt: postData.publishedAt || new Date().toISOString().split("T")[0],
    };

    adminBlogPosts.unshift(newPost);
    return newPost;
  },

  async updatePost(
    slug: string,
    updates: Partial<AdminBlogPost>
  ): Promise<AdminBlogPost> {
    const idx = adminBlogPosts.findIndex((p) => p.slug === slug);
    if (idx === -1) {
      throw new Error(`Article with slug '${slug}' not found.`);
    }

    const updated: AdminBlogPost = {
      ...adminBlogPosts[idx],
      ...updates,
      updatedAt: new Date().toISOString().split("T")[0],
    };

    adminBlogPosts[idx] = updated;
    return updated;
  },

  async deletePost(slug: string): Promise<{ success: boolean; message: string }> {
    const idx = adminBlogPosts.findIndex((p) => p.slug === slug);
    if (idx === -1) {
      throw new Error(`Article with slug '${slug}' not found.`);
    }

    adminBlogPosts.splice(idx, 1);
    return { success: true, message: "Article deleted successfully." };
  },

  async setPostStatus(
    slug: string,
    status: AdminBlogPost["status"],
    scheduledDate?: string
  ): Promise<AdminBlogPost> {
    return this.updatePost(slug, {
      status,
      scheduledPublishDate: scheduledDate,
      publishedAt: status === "published" ? new Date().toISOString().split("T")[0] : undefined,
    });
  },
};
