"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  getAllCategories,
  getPaginatedPosts,
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
  X,
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
      {/* Editorial Header */}
      <section className="border-b border-border bg-card/60 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
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

          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-secondary mb-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                NCLEX Learning Hub
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              PREform NCLEX Blog
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Clinical study strategies, Next Gen NCLEX breakdowns, high-alert pharmacology reviews, and evidence-based test preparation guides written by nurse educators.
            </p>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="border-b border-border py-4 px-4 sm:px-6 lg:px-8 bg-card/20">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none" role="tablist" aria-label="Article categories">
            {categories.map((cat) => {
              const isActive = (cat === "All" && currentCategory === "All") || currentCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => updateFilters({ category: cat })}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground shadow-sm"
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
                placeholder="Search articles..."
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

      {/* Main Articles Grid & Pagination */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
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
              {/* Articles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {posts.map((post) => (
                  <Card
                    key={post.slug}
                    className="flex flex-col justify-between hover:shadow-md hover:border-secondary/50 transition-all group overflow-hidden"
                  >
                    <div>
                      {/* Top banner / Decorative category accent */}
                      <div className="h-2 w-full bg-gradient-to-r from-secondary/40 via-secondary to-teal-500" />
                      <CardHeader className="pt-6">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <Badge variant="outline" className="border-secondary/40 text-secondary font-medium">
                            {post.category}
                          </Badge>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {post.readingTime}
                            </span>
                          </div>
                        </div>

                        <CardTitle className="font-serif text-xl sm:text-2xl leading-tight group-hover:text-secondary transition-colors">
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
                              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
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
