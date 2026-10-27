import { HomeClient } from "./home-client";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `${BRAND.fullName} | Next-Gen NCLEX Prep with Clarity & Confidence`,
  description:
    "PrepFord NCLEX offers realistic Next-Gen NCLEX practice questions, comprehensive clinical rationales, CAT readiness exams, and targeted prep for RN and PN candidates.",
};

export default function Home() {
  return <HomeClient />;
}
