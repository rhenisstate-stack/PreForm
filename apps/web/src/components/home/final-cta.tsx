"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section id="try-now" className="pt-24 pb-32 px-4 lg:pt-32 lg:pb-32 lg:px-8 border-t border-border">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-xl overflow-hidden border border-border bg-secondary">
          <div className="relative px-6 py-16 lg:px-12 lg:py-24 text-center">
            <h2 className="text-3xl font-serif font-semibold tracking-tight text-white sm:text-4xl">
              Ready to begin?
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-secondary/50 text-lg lg:text-xl">
              Choose your pathway, explore a subscription, and start practising
              with confidence.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto bg-card text-foreground hover:bg-accent hover:text-accent-foreground">
                Buy Now
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/sign-up">Try Now</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Independent preparation platform. Not affiliated with or endorsed
              by NCSBN.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
