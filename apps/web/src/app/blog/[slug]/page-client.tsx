"use client";

import * as React from "react";
import Link from "next/link";
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

  return (
    <article className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Article Header & Breadcrumbs */}
      <section className="border-b border-border bg-card/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
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
              <li className="font-medium text-foreground truncate max-w-xs" aria-current="page">
                {post.title}
              </li>
            </ol>
          </nav>

          <div className="space-y-4">
            <Badge variant="outline" className="border-secondary/50 text-secondary font-medium">
              {post.category}
            </Badge>

            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/15 text-secondary font-bold font-serif">
                  P
                </span>
                <div>
                  <p className="font-semibold text-foreground">{post.author.name}</p>
                  <p className="text-[11px] text-muted-foreground">{post.author.role} ({post.author.credentials})</p>
                </div>
              </div>

              <span className="hidden sm:inline text-muted-foreground" aria-hidden="true">•</span>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
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
          </div>
        </div>
      </section>

      {/* Main Article Content */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Lead Paragraph */}
          <p className="text-lg sm:text-xl text-foreground font-serif leading-relaxed mb-8">
            {post.content.lead}
          </p>

          {/* Key Takeaways Callout Card */}
          <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-6 sm:p-8 mb-12">
            <div className="flex items-center gap-2 text-secondary font-serif font-bold text-lg mb-3">
              <Sparkles className="h-5 w-5" />
              <h2>Key Clinical Takeaways</h2>
            </div>
            <ul className="space-y-2.5 text-sm sm:text-base text-muted-foreground">
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
            {post.content.sections.map((section, idx) => (
              <div key={idx} className="space-y-4">
                <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground border-b border-border pb-2">
                  {section.heading}
                </h2>

                <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                  {section.body.map((paragraph, pIdx) => (
                    <p key={pIdx}>{paragraph}</p>
                  ))}
                </div>

                {/* Table if present */}
                {section.table && (
                  <div className="my-6 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/70 text-xs font-semibold uppercase text-foreground">
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
                                className={`px-4 py-3 ${
                                  cIdx === 0 ? "font-medium text-foreground whitespace-nowrap" : "text-muted-foreground"
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

                {/* Callout if present */}
                {section.callout && (
                  <div className="my-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-5 text-sm">
                    <h3 className="font-semibold text-amber-950 dark:text-amber-100 flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-amber-600 shrink-0" />
                      {section.callout.title}
                    </h3>
                    <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
                      {section.callout.text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Social Share Bar */}
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <span>Share this educational guide:</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-secondary transition-colors"
                aria-label="Share on X (formerly Twitter)"
              >
                <Twitter className="h-3.5 w-3.5" />
                <span>Post</span>
              </a>

              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-secondary transition-colors"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="h-3.5 w-3.5" />
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
      </section>

      {/* Related Articles Section */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-border bg-card/30 py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground mb-6">
              Related Articles
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map((related) => (
                <Card
                  key={related.slug}
                  className="flex flex-col justify-between hover:shadow-md hover:border-secondary/50 transition-all group"
                >
                  <CardHeader>
                    <Badge variant="outline" className="w-fit border-secondary/40 text-secondary text-xs mb-2">
                      {related.category}
                    </Badge>
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
                  <CardFooter className="pt-0 border-t border-border/40 flex items-center justify-between">
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
        </section>
      )}
    </article>
  );
}
