import { HomeClient } from "./home-client";

export const metadata = {
  title: "PREform NCLEX | Prepare with clarity",
  description:
    "A focused learning platform for NCLEX-RN and NCLEX-PN candidates, being built with clinical accuracy and transparent assessment at its core.",
};

export default function Home() {
  return <HomeClient />;
}
