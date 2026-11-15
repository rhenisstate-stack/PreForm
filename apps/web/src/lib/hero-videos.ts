/**
 * Centralized configuration for PrepFord hero product demonstration videos.
 * Supports local optimized MP4/WebM assets, WebVTT captions, and optional
 * external embed URLs configured via NEXT_PUBLIC_* environment variables.
 */

export interface HeroVideoChapter {
  time: string;
  label: string;
}

export interface HeroVideoFallbackLink {
  label: string;
  href: string;
}

export interface HeroVideoConfig {
  id: string;
  pathway: "platform" | "rn" | "pn";
  title: string;
  subtitle: string;
  description: string;
  platformLabel: string;
  durationLabel: string;
  durationSeconds: number;
  posterSrc: string;
  posterAlt: string;
  mp4Src: string;
  webmSrc: string;
  captionsSrc: string;
  externalEmbedUrl?: string;
  accessibleLabel: string;
  chapters: HeroVideoChapter[];
  fallbackLinks: HeroVideoFallbackLink[];
}

export const HOME_PLATFORM_VIDEO: HeroVideoConfig = {
  id: "prepford-platform-tour",
  pathway: "platform",
  title: "PrepFord Learning Platform Tour",
  subtitle: "One learning platform. Two dedicated nursing pathways. A more structured way to prepare.",
  description:
    "Walk through the actual PrepFord experience—selecting NCLEX-RN or NCLEX-PN, signing in, practicing clinical questions with option-by-option rationales, reviewing 7-domain study notes, and tracking readiness.",
  platformLabel: "Actual Platform Walkthrough",
  durationLabel: "1:30",
  durationSeconds: 90,
  posterSrc: "/images/videos/prepford-platform-tour-poster.png",
  posterAlt:
    "PrepFord NCLEX-RN and NCLEX-PN learning platform preview showing question practice, rationales, and study notes",
  mp4Src: process.env.NEXT_PUBLIC_HOME_TOUR_MP4 || "/videos/prepford-platform-tour.mp4",
  webmSrc: process.env.NEXT_PUBLIC_HOME_TOUR_WEBM || "/videos/prepford-platform-tour.webm",
  captionsSrc: "/videos/prepford-platform-tour.vtt",
  externalEmbedUrl: process.env.NEXT_PUBLIC_HOME_TOUR_EMBED_URL || undefined,
  accessibleLabel: "Play PrepFord Learning Platform Tour video (1 minute 30 seconds)",
  chapters: [
    { time: "0:00", label: "Intro & Choosing NCLEX-RN or NCLEX-PN" },
    { time: "0:15", label: "Sign In & Learner Dashboard" },
    { time: "0:32", label: "Question Bank & Practice Exam" },
    { time: "0:54", label: "Option-by-Option Rationales" },
    { time: "1:06", label: "Clinical Study Notes & Readiness Insights" },
  ],
  fallbackLinks: [
    { label: "Explore NCLEX-RN", href: "/nclex-rn" },
    { label: "Explore NCLEX-PN", href: "/nclex-pn" },
    { label: "Open Study Guide", href: "/study-guide" },
  ],
};

export const RN_PLATFORM_VIDEO: HeroVideoConfig = {
  id: "prepford-rn-tour",
  pathway: "rn",
  title: "NCLEX-RN Platform Tour",
  subtitle: "Registered Nurse clinical judgment, acute care scenarios, and Client Needs analytics.",
  description:
    "See how an RN candidate navigates the NCLEX-RN pathway, signs into the RN Learner Dashboard, answers an acute care scenario with vital signs and rationales, and reviews RN performance insights.",
  platformLabel: "Actual NCLEX-RN Platform Walkthrough",
  durationLabel: "1:25",
  durationSeconds: 85,
  posterSrc: "/images/videos/prepford-rn-tour-poster.png",
  posterAlt:
    "PrepFord NCLEX-RN platform preview featuring acute care clinical scenarios, rationales, and RN dashboard",
  mp4Src: process.env.NEXT_PUBLIC_RN_TOUR_MP4 || "/videos/prepford-rn-tour.mp4",
  webmSrc: process.env.NEXT_PUBLIC_RN_TOUR_WEBM || "/videos/prepford-rn-tour.webm",
  captionsSrc: "/videos/prepford-rn-tour.vtt",
  externalEmbedUrl: process.env.NEXT_PUBLIC_RN_TOUR_EMBED_URL || undefined,
  accessibleLabel: "Play NCLEX-RN Platform Tour video (1 minute 25 seconds)",
  chapters: [
    { time: "0:00", label: "NCLEX-RN Pathway & Sign In" },
    { time: "0:17", label: "RN Learner Dashboard Overview" },
    { time: "0:36", label: "RN Clinical Scenario & Vital Signs" },
    { time: "0:48", label: "Keyed Action & Distractor Rationales" },
    { time: "1:00", label: "RN Study Notes & Readiness Insights" },
  ],
  fallbackLinks: [
    { label: "Go to RN Learner Dashboard", href: "/dashboard/rn" },
    { label: "Try RN Sample Question", href: "#rn-question-experience" },
    { label: "Explore RN Study Plans", href: "#rn-study-plans" },
  ],
};

export const PN_PLATFORM_VIDEO: HeroVideoConfig = {
  id: "prepford-pn-tour",
  pathway: "pn",
  title: "NCLEX-PN Platform Tour",
  subtitle: "Practical nursing data collection, coordinated care, medication safety, and progress tracking.",
  description:
    "Follow an LPN/LVN candidate through the NCLEX-PN pathway—signing into the PN Learner Dashboard, evaluating a practical nursing scenario, reviewing distractor rationales, and checking PN domain progress.",
  platformLabel: "Actual NCLEX-PN Platform Walkthrough",
  durationLabel: "1:25",
  durationSeconds: 85,
  posterSrc: "/images/videos/prepford-pn-tour-poster.png",
  posterAlt:
    "PrepFord NCLEX-PN platform preview featuring practical nursing clinical scenarios, rationales, and PN dashboard",
  mp4Src: process.env.NEXT_PUBLIC_PN_TOUR_MP4 || "/videos/prepford-pn-tour.mp4",
  webmSrc: process.env.NEXT_PUBLIC_PN_TOUR_WEBM || "/videos/prepford-pn-tour.webm",
  captionsSrc: "/videos/prepford-pn-tour.vtt",
  externalEmbedUrl: process.env.NEXT_PUBLIC_PN_TOUR_EMBED_URL || undefined,
  accessibleLabel: "Play NCLEX-PN Platform Tour video (1 minute 25 seconds)",
  chapters: [
    { time: "0:00", label: "NCLEX-PN Pathway & Sign In" },
    { time: "0:17", label: "PN Learner Dashboard Overview" },
    { time: "0:36", label: "Practical Nursing Scenario & Observations" },
    { time: "0:48", label: "Correct Action & Distractor Rationales" },
    { time: "1:00", label: "Nursing Notes & PN Progress" },
  ],
  fallbackLinks: [
    { label: "Go to PN Learner Dashboard", href: "/dashboard/pn" },
    { label: "Try PN Sample Question", href: "#pn-question-experience" },
    { label: "Explore PN Study Plans", href: "#pn-study-plans" },
  ],
};
