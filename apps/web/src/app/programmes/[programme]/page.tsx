import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BRAND } from "@/lib/brand";

const programmes = {
  rn: {
    code: "RN",
    title: "NCLEX-RN",
    audience: "Registered Nurse candidates",
    description:
      "A dedicated pathway for candidates preparing for the National Council Licensure Examination for Registered Nurses.",
  },
  pn: {
    code: "PN",
    title: "NCLEX-PN",
    audience: "Practical / Vocational Nurse candidates",
    description:
      "A dedicated pathway for candidates preparing for the National Council Licensure Examination for Practical Nurses.",
  },
} as const;

type ProgrammeCode = keyof typeof programmes;

function isProgrammeCode(value: string): value is ProgrammeCode {
  return Object.hasOwn(programmes, value);
}

export function generateStaticParams() {
  return Object.keys(programmes).map((programme) => ({ programme }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programme: string }>;
}): Promise<Metadata> {
  const { programme } = await params;

  if (!isProgrammeCode(programme)) {
    return { title: "Programme not found" };
  }

  return { title: `${programmes[programme].title} pathway | ${BRAND.name}` };
}

export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ programme: string }>;
}) {
  const { programme } = await params;

  if (!isProgrammeCode(programme)) {
    notFound();
  }

  const pathway = programmes[programme];

  return (
    <main className="programme-page">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label={`${BRAND.fullName} home`}>
          <Image
            src={BRAND.logo.assetPath}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-bold tracking-tight">{BRAND.name}</span>
          <span className="wordmark-suffix">NCLEX</span>
        </Link>
        <Link className="header-cta" href="/#products">
          All pathways <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <section className="programme-main" id="main-content">
        <div className="programme-content">
          <p className="eyebrow">
            <span className="status-dot" aria-hidden="true" />
            {pathway.code} pathway · {pathway.audience}
          </p>
          <h1>{pathway.title}</h1>
          <p>{pathway.description}</p>
          <div className="programme-notice">
            Explore our comprehensive {pathway.title} question bank, Next-Gen case studies, and adaptive mock exams.
          </div>
          <Link className="button button-primary" href="/#products">
            View available plans <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
      <footer className="site-footer">
        <Link className="wordmark footer-wordmark" href="/">
          <Image
            src={BRAND.logo.assetPath}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg object-contain"
          />
          <span className="font-bold tracking-tight">{BRAND.name}</span>
          <span className="wordmark-suffix">NCLEX</span>
        </Link>
        <p>Thoughtful preparation for the next step in nursing.</p>
        <Link href="/#products">All pathways ↑</Link>
        <span className="footer-legal">
          NCLEX is a registered trademark of the National Council of State
          Boards of Nursing, Inc. {BRAND.name} is independent and not affiliated
          with, endorsed by, or sponsored by NCSBN.
        </span>
      </footer>
    </main>
  );
}
