import type { Metadata } from "next";
import { HomeClient } from "./home-client";

export const metadata: Metadata = {
  title: {
    absolute: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
  },
  description:
    "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    description:
      "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
    url: "/",
    type: "website",
  },
};

export default function Home() {
  return <HomeClient />;
}
