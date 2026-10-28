"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section id="try-now" className="pt-20 pb-28 px-4 sm:px-6 lg:pt-28 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0F766E] via-[#115E59] to-[#142B4A] dark:from-[#0F293A] dark:via-[#0D3B38] dark:to-[#0B1220] shadow-xl">
          <div className="relative px-6 py-16 lg:px-12 lg:py-24 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">
              Start Your NCLEX Preparation
            </p>
            <h2 className="mt-3 text-3xl font-serif font-semibold tracking-tight text-white sm:text-4xl">
              Ready to begin preparing with clarity?
            </h2>
            <p className="mt-5 max-w-2xl mx-auto text-white/90 text-base sm:text-lg lg:text-xl leading-relaxed">
              Choose your nursing examination pathway, explore structured clinical study notes, or create an account to begin practicing.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto bg-white text-[#142B4A] hover:bg-slate-100 hover:text-[#142B4A] font-semibold shadow-md rounded-xl px-7"
              >
                <Link href="/nclex-rn">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Explore NCLEX-RN
                </Link>
              </Button>

              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto bg-teal-400 text-slate-950 hover:bg-teal-300 hover:text-slate-950 font-semibold shadow-md rounded-xl px-7"
              >
                <Link href="/nclex-pn">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Explore NCLEX-PN
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto bg-white/10 border-white/80 text-white hover:bg-white/20 hover:text-white font-semibold rounded-xl px-7"
              >
                <Link href="/study-guide">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Open Study Guide
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-white/90">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
              >
                Create Account
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/subscriptions"
                className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
              >
                View Subscription Plans
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="mt-6 text-xs text-white/80">
              Independent preparation platform. Not affiliated with or endorsed by NCSBN.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
