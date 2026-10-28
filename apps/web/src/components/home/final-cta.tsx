"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section id="try-now" className="pt-24 pb-32 px-4 lg:pt-32 lg:pb-32 lg:px-8 border-t border-border">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-xl overflow-hidden border border-border bg-gradient-to-br from-[#0F766E] via-[#115E59] to-[#142B4A] dark:from-[#0F293A] dark:via-[#0D3B38] dark:to-[#0B1220] shadow-lg">
          <div className="relative px-6 py-16 lg:px-12 lg:py-24 text-center">
            <h2 className="text-3xl font-serif font-semibold tracking-tight text-white sm:text-4xl">
              Ready to begin?
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-white/90 text-lg lg:text-xl">
              Choose your pathway, explore a subscription, and start practising
              with confidence.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto bg-white text-[#142B4A] hover:bg-slate-100 hover:text-[#142B4A] font-semibold shadow-md">
                <Link href="/cart?add=rn-pro">Buy Now</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-white/10 border-white/80 text-white hover:bg-white/20 hover:text-white font-semibold">
                <Link href="/sign-up">Try Now</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-white/80">
              Independent preparation platform. Not affiliated with or endorsed
              by NCSBN.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
