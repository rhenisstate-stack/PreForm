"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HeartPulse,
  GraduationCap,
  CheckCircle2,
  Stethoscope,
  Activity,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ECGHeartbeat } from "./ecg-heartbeat";

interface AuthBrandPanelProps {
  mode: "sign-in" | "sign-up";
}

export function AuthBrandPanel({ mode }: AuthBrandPanelProps) {
  const isSignIn = mode === "sign-in";

  // Interactive mouse pointer offset for subtle 3D card tilt
  const [pointerOffset, setPointerOffset] = React.useState({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setPointerOffset({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  };

  const handlePointerLeave = () => {
    setPointerOffset({ x: 0, y: 0 });
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between bg-[#142B4A] text-white p-8 lg:p-12 xl:p-16 overflow-hidden select-none"
      data-testid="auth-brand-panel"
    >
      {/* Background ambient lighting & mesh glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-teal-500/15 blur-[120px] transition-transform duration-700 ease-out" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#0D9488]/20 blur-[130px] transition-transform duration-700 ease-out" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#09172B]/60 blur-[100px]" />
      </div>

      {/* Top Header & Brand Wordmark */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-2xl font-serif font-bold text-white hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-xl"
            aria-label="PrepFord home"
          >
            <div className="h-12 w-12 rounded-xl bg-white/10 p-1.5 border border-white/20 backdrop-blur-sm shadow-md flex items-center justify-center shrink-0">
              <Image
                src={BRAND.logo.assetPath}
                alt={BRAND.logo.alt}
                width={48}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <span
              data-testid="brand-wordmark-stacked"
              className="flex flex-col font-serif tracking-tight font-bold leading-none text-left -space-y-0.5 justify-center"
            >
              <span className="text-xl leading-none text-teal-400">Prep</span>
              <span className="text-xl leading-none text-white">Ford</span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/15 border border-teal-500/30 px-3.5 py-1 text-xs font-semibold text-teal-300">
            <HeartPulse className="h-3.5 w-3.5 text-teal-400 animate-heartbeat" />
            <span>{isSignIn ? "Clinical Preparation Studio" : "Next Gen Licensure Ready"}</span>
          </div>
        </div>

        {/* Brand Storytelling Headline & Subtitle */}
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-serif font-semibold leading-tight tracking-tight text-white text-balance">
            {isSignIn
              ? "Your journey to nursing excellence continues here."
              : "Your nursing future begins with the right preparation."}
          </h1>

          <p className="text-base text-slate-200/90 leading-relaxed font-normal">
            {isSignIn
              ? "Access your candidate dashboard, resume clinical judgment case studies, and measure domain readiness across the NCLEX-RN and NCLEX-PN client needs categories."
              : "Build unshakeable testing confidence with verified Next Generation rationales, adaptive clinical simulations, and comprehensive RN and PN study tracks."}
          </p>
        </div>
      </div>

      {/* Center Interactive Visual: Sinus Rhythm ECG + Floating Clinical Cards */}
      <div className="relative z-10 my-8 py-2">
        {/* Animated Medically Accurate Sinus Rhythm Waveform */}
        <div className="mb-6 rounded-2xl bg-slate-950/40 border border-teal-500/30 p-4 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-teal-500/20 text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
              <span>Normal Sinus Rhythm (NSR) • 72 BPM</span>
            </span>
            <span className="text-teal-400/90 font-medium">Isoelectric P-QRS-T</span>
          </div>
          <ECGHeartbeat height={72} width={720} showCardioGlow={true} />
        </div>

        {/* Dynamic Interactive Clinical Cards responding gently to pointer coordinates */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-transform duration-300 ease-out"
          style={{
            transform: `perspective(1000px) rotateY(${pointerOffset.x * 4}deg) rotateX(${-pointerOffset.y * 4}deg)`,
          }}
        >
          {/* Clinical Card 1: Clinical Judgment Model */}
          <div className="rounded-xl bg-white/10 border border-white/15 p-4 backdrop-blur-md hover:bg-white/15 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/25 text-teal-300">
                <Stethoscope className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-sm font-semibold text-white">NGN Case Studies</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Client Needs
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  Bowtie, matrix, and 6-item unfolding clinical cases mapped to the NCSBN Clinical Judgment Model.
                </p>
              </div>
            </div>
          </div>

          {/* Clinical Card 2: Objective Telemetry */}
          <div className="rounded-xl bg-white/10 border border-white/15 p-4 backdrop-blur-md hover:bg-white/15 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/25 text-teal-300">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-sm font-semibold text-white">Readiness Assessment</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Telemetry
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  Transparent difficulty signals and knowledge-gap identification with zero fabricated pass claims.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Reassurance Footer */}
      <div className="relative z-10 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
          <span>Independent Nursing Education Platform • RN & PN Pathways</span>
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <Link href="/terms-and-conditions" className="hover:text-teal-300 transition-colors">
            Terms
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/privacy-policy" className="hover:text-teal-300 transition-colors">
            Privacy
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/contact" className="hover:text-teal-300 transition-colors">
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
