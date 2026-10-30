"use client";

import * as React from "react";

interface ECGHeartbeatProps {
  className?: string;
  width?: number;
  height?: number;
  showCardioGlow?: boolean;
}

/**
 * Mathematically generates an authentic, medically accurate normal sinus rhythm (NSR) waveform.
 * Contains: Isoelectric baseline, rounded P wave, PR segment, crisp QRS complex
 * (negative Q deflection, sharp R wave, negative S deflection), isoelectric ST segment,
 * rounded T wave, and return to baseline.
 */
export function buildNormalSinusRhythmPath(cycles = 3, cycleWidth = 320, baselineY = 48): string {
  const segments: string[] = [`M 0 ${baselineY}`];

  for (let i = 0; i < cycles; i++) {
    const x0 = i * cycleWidth;
    // Isoelectric baseline lead-in
    const pStart = x0 + 40;
    // P wave: rounded dome representing atrial depolarization
    const pPeak = pStart + 12;
    const pEnd = pStart + 24;
    // PR segment: AV nodal conduction delay
    const qStart = pEnd + 14;
    // QRS complex: rapid ventricular depolarization
    const qDip = qStart + 4;
    const rPeak = qStart + 9;
    const sDip = qStart + 15;
    const jPoint = qStart + 20;
    // ST segment: ventricular plateau
    const tStart = jPoint + 18;
    // T wave: ventricular repolarization dome
    const tPeak = tStart + 20;
    const tEnd = tStart + 38;
    // TP segment: diastole return to baseline
    const cycleEnd = x0 + cycleWidth;

    segments.push(
      `L ${pStart} ${baselineY}`,
      `C ${pStart + 4} ${baselineY}, ${pPeak - 5} ${baselineY - 10}, ${pPeak} ${baselineY - 10}`,
      `C ${pPeak + 5} ${baselineY - 10}, ${pEnd - 4} ${baselineY}, ${pEnd} ${baselineY}`,
      `L ${qStart} ${baselineY}`,
      `L ${qDip} ${baselineY + 7}`,
      `L ${rPeak} ${baselineY - 38}`,
      `L ${sDip} ${baselineY + 16}`,
      `L ${jPoint} ${baselineY}`,
      `L ${tStart} ${baselineY}`,
      `C ${tStart + 6} ${baselineY}, ${tPeak - 7} ${baselineY - 14}, ${tPeak} ${baselineY - 14}`,
      `C ${tPeak + 7} ${baselineY - 14}, ${tEnd - 5} ${baselineY}, ${tEnd} ${baselineY}`,
      `L ${cycleEnd} ${baselineY}`
    );
  }

  return segments.join(" ");
}

export function ECGHeartbeat({
  className = "",
  width = 960,
  height = 96,
  showCardioGlow = true,
}: ECGHeartbeatProps) {
  const pathData = React.useMemo(() => buildNormalSinusRhythmPath(3, 320, 48), []);

  return (
    <div
      className={`relative w-full overflow-hidden select-none ${className}`}
      data-testid="auth-ecg-heartbeat"
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="auth-ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.1" />
            <stop offset="25%" stopColor="#0D9488" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#14B8A6" stopOpacity="1" />
            <stop offset="75%" stopColor="#2DD4BF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0D9488" stopOpacity="0.1" />
          </linearGradient>

          {showCardioGlow && (
            <filter id="auth-ecg-glow" x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>

        {/* Resting Sinus Baseline (Subtle Teal) */}
        <path
          d={pathData}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-teal-500/20 dark:text-teal-400/20"
        />

        {/* Dynamic travelling cardiac pulse */}
        <path
          d={pathData}
          stroke="url(#auth-ecg-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={showCardioGlow ? "url(#auth-ecg-glow)" : undefined}
          className="text-teal-400 drop-shadow-[0_0_8px_rgba(13,148,136,0.6)] motion-safe:animate-ecg-ltr"
        />
      </svg>
    </div>
  );
}
