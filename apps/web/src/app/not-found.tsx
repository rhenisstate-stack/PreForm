import * as React from "react";
import Link from "next/link";
import { BookOpen, Compass, GraduationCap, Home, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Page Not Found | PrepFord NCLEX Preparation",
  description: "The requested clinical study resource could not be found.",
};

export default function NotFound() {
  return (
    <div className="min-h-[75vh] w-full flex items-center justify-center px-4 py-16 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        {/* On-Brand Vector Illustration */}
        <div className="mx-auto max-w-[220px] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/illustrations/prepford-empty-recent-activity.png"
            alt="Page not found"
            loading="lazy"
            decoding="async"
            className="w-full h-auto object-contain"
          />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full">
            404 • Resource Not Located
          </span>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            Clinical Record Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The study guide, question module, or URL you requested does not exist or may have been relocated in our latest curriculum update.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
            <Link href="/dashboard">
              <Compass className="mr-2 h-4 w-4" />
              <span>Go to Workspace</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto rounded-xl">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            Jump directly to popular preparation sections:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link
              href="/nclex-rn"
              className="px-2.5 py-1 rounded-lg bg-muted text-foreground hover:bg-muted/80 inline-flex items-center gap-1 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 text-teal-600" />
              <span>NCLEX-RN</span>
            </Link>
            <Link
              href="/nclex-pn"
              className="px-2.5 py-1 rounded-lg bg-muted text-foreground hover:bg-muted/80 inline-flex items-center gap-1 transition-colors"
            >
              <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
              <span>NCLEX-PN</span>
            </Link>
            <Link
              href="/study-guide"
              className="px-2.5 py-1 rounded-lg bg-muted text-foreground hover:bg-muted/80 inline-flex items-center gap-1 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-teal-600" />
              <span>Study Guides</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
