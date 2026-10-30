import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    short_name: BRAND.name,
    description:
      "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#0F766E",
    icons: [
      {
        src: "/prepford-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/prepford-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/prepford-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/prepford-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: BRAND.favicon.assetPath,
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
