"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { type BlogPost } from "@/lib/blog-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  ArrowRight,
  ChevronLeft,
  Share2,
  Check,
  Copy,
  BookOpen,
  Sparkles,
  Twitter,
  Linkedin,
  ListTree,
  GraduationCap,
  FileCheck,
} from "lucide-react";

interface ArticleDetailClientProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export function ArticleDetailClient({ post, relatedPosts }: ArticleDetailClientProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareUrl = typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
  const shareText = encodeURIComponent(`${post.title} — PrepFord NCLEX Learning Hub`);

  // Table of Contents headings
  const tocItems = React.useMemo(() => {
    return post.content.sections.map((section, idx) => ({
      id: section.id || `section-${idx}`,
      heading: section.heading,
    }));
  }, [post.content.sections]);

  return (
    <article className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Article Header & Editorial Hero */}
      <header className="border-b border-border bg-gradient-to-b from-card/90 via-card/50 to-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex items-center gap-1.5 flex-wrap">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground truncate max-w-xs sm:max-w-md" aria-current="page">
                {post.title}
              </li>
            </ol>
          </nav>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-secondary/50 text-secondary font-semibold bg-secondary/10 px-3 py-1">
                {post.category}
              </Badge>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
              {post.title}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>

            {/* Author Attribution and Publication Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border/60">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/15 text-secondary font-bold font-serif text-sm ring-1 ring-secondary/30">
                  P
                </span>
                <div>
                  <p className="font-semibold text-foreground text-sm">{post.author.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {post.author.role} • {post.author.credentials}
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline text-muted-foreground" aria-hidden="true">•</span>

              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <span>
                    Published{" "}
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>

                {post.updatedAt && (
                  <span className="hidden sm:inline text-muted-foreground">
                    (Updated{" "}
                    {new Date(post.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    )
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <span>{post.readingTime}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Prominent Article Hero Image */}
          <div className="mt-8 relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border shadow-md bg-muted">
            <Image
              src={post.featuredImage}
              alt={post.imageAlt || post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover object-center"
            />
          </div>
        </div>
      </header>

      {/* Main Article Content & Table of Contents */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Table of Contents for Long Editorial Articles */}
          {tocItems.length > 2 && (
            <div className="mb-10 rounded-xl border border-border bg-card/60 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 font-serif font-bold text-foreground text-sm uppercase tracking-wider mb-3">
                <ListTree className="h-4 w-4 text-secondary" aria-hidden="true" />
                <span>Table of Contents</span>
              </div>
              <nav aria-label="Table of contents">
                <ol className="space-y-1.5 text-xs sm:text-sm">
                  {tocItems.map((item, idx) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-muted-foreground hover:text-secondary hover:underline transition-colors flex items-baseline gap-2"
                      >
                        <span className="text-[11px] font-mono text-secondary font-semibold shrink-0">
                          {idx + 1}.
                        </span>
                        <span>{item.heading}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          )}

          {/* Lead Paragraph */}
          <p className="text-lg sm:text-xl text-foreground font-serif leading-relaxed mb-8">
            {post.content.lead}
          </p>

          {/* Key Takeaways Callout Card */}
          <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-6 sm:p-8 mb-12 shadow-xs">
            <div className="flex items-center gap-2 text-secondary font-serif font-bold text-lg mb-3">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <h2>Key Clinical Takeaways</h2>
            </div>
            <ul className="space-y-2.5 text-sm sm:text-base text-foreground/90">
              {post.content.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-secondary font-bold mt-1 text-sm shrink-0" aria-hidden="true">
                    ✓
                  </span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Article Structured Body Sections */}
          <div className="space-y-12">
            {post.content.sections.map((section, idx) => {
              const sectionId = section.id || `section-${idx}`;
              return (
                <section key={idx} id={sectionId} className="space-y-4 scroll-mt-24">
                  <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground border-b border-border pb-2.5">
                    {section.heading}
                  </h2>

                  <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                    {section.body.map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Inline Image if present */}
                  {section.inlineImage && (
                    <figure className="my-6 rounded-xl overflow-hidden border border-border shadow-xs bg-muted">
                      <div className="relative aspect-[16/9] w-full">
                        <Image
                          src={section.inlineImage.src}
                          alt={section.inlineImage.alt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 896px"
                          className="object-cover object-center"
                        />
                      </div>
                      {section.inlineImage.caption && (
                        <figcaption className="p-3 text-center text-xs text-muted-foreground bg-card border-t border-border/50">
                          {section.inlineImage.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  {/* Structured Comparison Table if present */}
                  {section.table && (
                    <div className="my-6 overflow-x-auto rounded-xl border border-border shadow-xs">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/80 text-xs font-semibold uppercase tracking-wider text-foreground">
                          <tr>
                            {section.table.headers.map((th, hIdx) => (
                              <th key={hIdx} className="px-4 py-3 border-b border-border">
                                {th}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {section.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className={`px-4 py-3 text-xs sm:text-sm ${
                                    cIdx === 0
                                      ? "font-medium text-foreground whitespace-nowrap"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Clinical Alert / Exam Tip Callout if present */}
                  {section.callout && (
                    <div className="my-6 rounded-xl border border-secondary/30 bg-secondary/5 dark:border-secondary/40 dark:bg-secondary/10 p-5 text-sm shadow-xs">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-1.5">
                        <FileCheck className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                        <span>{section.callout.title}</span>
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {section.callout.text}
                      </p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Contextual PrepFord Exam Preparation CTA Box */}
          <div className="mt-14 rounded-2xl border border-secondary/30 bg-gradient-to-r from-secondary/10 via-card to-secondary/5 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Ready to Practice?
                </span>
                <h3 className="text-xl font-serif font-bold text-foreground">
                  Build Clinical Judgment with PrepFord Case Studies
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Experience full unfolding EHR scenarios, instant rationales for every option, and adaptive Computerized Adaptive Testing (CAT) simulations.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
                  <Link href="/courses">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse Courses
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/nclex-rn">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    RN Pathway
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Social Share Bar */}
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Share2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>Share this clinical guide:</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-secondary transition-colors"
                aria-label="Share on X (formerly Twitter)"
              >
                <Twitter className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Post</span>
              </a>

              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-secondary transition-colors"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Share</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-secondary transition-colors"
                aria-label="Copy article link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy link"}</span>
              </button>
            </div>
          </div>

          {/* Return to Blog link */}
          <div className="mt-8">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/blog">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to All Articles</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Related Articles Section */}
      {relatedPosts.length > 0 && (
        <aside className="border-t border-border bg-card/30 py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground mb-6">
              Related Articles
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map((related) => (
                <Card
                  key={related.slug}
                  className="flex flex-col justify-between hover:shadow-md hover:border-secondary/50 transition-all group overflow-hidden border-border/80"
                >
                  <div>
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                      <Image
                        src={related.featuredImage}
                        alt={related.imageAlt || related.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 420px"
                        className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <Badge variant="outline" className="bg-background/90 backdrop-blur-xs border-secondary/40 text-secondary text-xs">
                          {related.category}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader className="pt-4">
                      <CardTitle className="font-serif text-lg leading-snug group-hover:text-secondary transition-colors">
                        <Link href={`/blog/${related.slug}`}>
                          {related.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {related.excerpt}
                      </p>
                    </CardContent>
                  </div>

                  <CardFooter className="pt-0 border-t border-border/40 flex items-center justify-between mt-2">
                    <span className="text-[11px] text-muted-foreground">{related.readingTime}</span>
                    <Button asChild variant="ghost" size="sm" className="gap-1 text-secondary p-0 h-auto">
                      <Link href={`/blog/${related.slug}`}>
                        <span>Read</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </aside>
      )}
    </article>
  );
}
