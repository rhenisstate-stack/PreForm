"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  getAllCategories,
  getPaginatedPosts,
  getBlogPostBySlug,
  type BlogPost,
} from "@/lib/blog-data";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calendar,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  X,
  GraduationCap,
} from "lucide-react";

const PAGE_SIZE = 4;

export function BlogPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query params
  const rawPage = searchParams.get("page");
  const rawCategory = searchParams.get("category") || "All";
  const rawSearch = searchParams.get("search") || "";

  const currentPage = rawPage ? parseInt(rawPage, 10) || 1 : 1;
  const currentCategory = rawCategory;
  const [searchInput, setSearchInput] = React.useState(rawSearch);
  const [prevRawSearch, setPrevRawSearch] = React.useState(rawSearch);

  // Sync search input if URL changes externally
  if (rawSearch !== prevRawSearch) {
    setPrevRawSearch(rawSearch);
    setSearchInput(rawSearch);
  }

  const categories = React.useMemo(() => getAllCategories(), []);

  const { posts, totalPosts, totalPages, currentPage: safePage } = React.useMemo(() => {
    return getPaginatedPosts(currentPage, PAGE_SIZE, currentCategory, rawSearch);
  }, [currentPage, currentCategory, rawSearch]);

  // Featured article spotlight (show when on page 1 without specific search/category filters)
  const isDefaultView = currentCategory === "All" && !rawSearch && safePage === 1;
  const featuredArticle: BlogPost | undefined = React.useMemo(() => {
    if (!isDefaultView) return undefined;
    return getBlogPostBySlug("understanding-the-next-generation-nclex");
  }, [isDefaultView]);

  const updateFilters = (params: { page?: number; category?: string; search?: string }) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (params.category !== undefined) {
      if (params.category === "All") {
        nextParams.delete("category");
      } else {
        nextParams.set("category", params.category);
      }
      nextParams.delete("page"); // reset page on category change
    }

    if (params.search !== undefined) {
      if (!params.search.trim()) {
        nextParams.delete("search");
      } else {
        nextParams.set("search", params.search.trim());
      }
      nextParams.delete("page"); // reset page on search change
    }

    if (params.page !== undefined) {
      if (params.page <= 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", params.page.toString());
      }
    }

    const qs = nextParams.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateFilters({ search: "" });
  };

  return (
    <div className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Editorial Hero Section with Real Image */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card/90 via-card/50 to-background py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        {/* Subtle Decorative Ambient Palette Accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-secondary/10 blur-3xl"
        />

        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground" aria-current="page">
                Blog
              </li>
            </ol>
          </nav>

          {/* Desktop Split Hero / Mobile Clean Vertical Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>PrepFord Clinical Learning Hub</span>
              </div>

              <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
                PrepFord Nursing Insights
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Master Next Generation NCLEX clinical judgment, unfolding case study strategy, high-alert pharmacology, and evidence-based study methods written directly by experienced nurse educators.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <span>NCLEX-RN &amp; NCLEX-PN Pathways</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <span>NCSBN Clinical Judgment Model</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image Container */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl overflow-hidden border border-border/70 shadow-lg bg-card/60">
                <div className="aspect-[16/10] relative w-full">
                  <Image
                    src="/images/blog/prepford-blog-hero.jpg"
                    alt="Focused nursing student in scrubs studying NCLEX materials with laptop, notes, and stethoscope"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 540px"
                    className="object-cover object-center transition-transform duration-500 hover:scale-[1.02]"
                  />
                </div>
                <div className="p-3 bg-card/90 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Editorial Clinical Review</span>
                  <span className="font-medium text-foreground">PrepFord Faculty</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="sticky top-[4.5rem] z-20 border-b border-border bg-card/95 backdrop-blur-md py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Filter Pills */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none"
            role="tablist"
            aria-label="Article categories"
          >
            {categories.map((cat) => {
              const isActive =
                (cat === "All" && currentCategory === "All") ||
                currentCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => updateFilters({ category: cat })}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-secondary text-secondary-foreground shadow-xs font-semibold ring-1 ring-secondary/40"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <label htmlFor="blog-search" className="sr-only">
              Search articles
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="blog-search"
                type="text"
                placeholder="Search clinical topics..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-full border border-input bg-background pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Featured Article Spotlight (Default View) */}
          {featuredArticle && (
            <div className="mb-14">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-secondary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Featured Clinical Guide
                </h2>
              </div>

              <Card className="overflow-hidden border-border/80 hover:border-secondary/50 transition-all shadow-sm hover:shadow-md group">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  {/* Featured Thumbnail */}
                  <div className="relative lg:col-span-5 aspect-[16/10] lg:aspect-auto min-h-[240px] lg:min-h-[320px] bg-muted">
                    <Image
                      src={featuredArticle.featuredImage}
                      alt={featuredArticle.imageAlt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 480px"
                      className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-secondary text-secondary-foreground font-semibold shadow-xs">
                        {featuredArticle.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Featured Content */}
                  <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(featuredArticle.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {featuredArticle.readingTime}
                        </span>
                      </div>

                      <CardTitle className="font-serif text-2xl sm:text-3xl font-bold leading-tight group-hover:text-secondary transition-colors">
                        <Link href={`/blog/${featuredArticle.slug}`}>
                          {featuredArticle.title}
                        </Link>
                      </CardTitle>

                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {featuredArticle.excerpt}
                      </p>
                    </div>

                    <div className="pt-6 mt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-xs text-muted-foreground">
                        <span>By </span>
                        <strong className="font-semibold text-foreground">
                          {featuredArticle.author.name}
                        </strong>
                        <span className="block text-[11px] text-muted-foreground">
                          {featuredArticle.author.role} ({featuredArticle.author.credentials})
                        </span>
                      </div>

                      <Button asChild className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs self-start sm:self-auto">
                        <Link href={`/blog/${featuredArticle.slug}`}>
                          <span>Read Complete Guide</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Active filters summary */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-8">
            <p>
              Showing <span className="font-semibold text-foreground">{posts.length}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPosts}</span> articles
              {currentCategory !== "All" && (
                <span> in <strong className="text-secondary">{currentCategory}</strong></span>
              )}
              {rawSearch && (
                <span> matching &ldquo;<strong className="text-foreground">{rawSearch}</strong>&rdquo;</span>
              )}
            </p>
            {safePage > 1 && (
              <span>Page {safePage} of {totalPages}</span>
            )}
          </div>

          {/* Empty State */}
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center max-w-lg mx-auto">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-foreground">No articles found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn&rsquo;t find any articles matching your search criteria. Try selecting another category or clearing your search.
              </p>
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    updateFilters({ category: "All", search: "" });
                  }}
                  size="sm"
                >
                  Clear all filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Articles Grid with Image Thumbnails */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {posts.map((post) => (
                  <Card
                    key={post.slug}
                    className="flex flex-col justify-between hover:shadow-md hover:border-secondary/50 transition-all group overflow-hidden border-border/80"
                  >
                    <div>
                      {/* Image Thumbnail Header */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                        <Image
                          src={post.featuredImage}
                          alt={post.imageAlt || post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                          className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge variant="outline" className="bg-background/90 backdrop-blur-xs border-secondary/40 text-secondary font-medium">
                            {post.category}
                          </Badge>
                        </div>
                      </div>

                      <CardHeader className="pt-5">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(post.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {post.readingTime}
                          </span>
                        </div>

                        <CardTitle className="font-serif text-xl sm:text-2xl leading-snug group-hover:text-secondary transition-colors">
                          <Link href={`/blog/${post.slug}`}>
                            {post.title}
                          </Link>
                        </CardTitle>
                      </CardHeader>

                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>
                      </CardContent>
                    </div>

                    <CardFooter className="pt-0 border-t border-border/60 mt-4 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        <span>By </span>
                        <strong className="font-medium text-foreground">{post.author.name}</strong>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="gap-1.5 text-secondary hover:text-secondary group/btn">
                        <Link href={`/blog/${post.slug}`}>
                          <span>Read article</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {/* Functional Pagination Controls */}
              {totalPages > 1 && (
                <nav
                  aria-label="Blog pagination"
                  className="flex items-center justify-center gap-2 border-t border-border pt-8"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => updateFilters({ page: safePage - 1 })}
                    className="gap-1"
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isCurrent = pageNum === safePage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => updateFilters({ page: pageNum })}
                          aria-current={isCurrent ? "page" : undefined}
                          aria-label={`Page ${pageNum}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                            isCurrent
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => updateFilters({ page: safePage + 1 })}
                    className="gap-1"
                    aria-label="Go to next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
