import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  STUDY_GUIDE_CATEGORIES,
  getCategoryBySlug,
  getSubjectBySlugs,
} from "@/lib/study-guide-data";
import { StudyGuideIndexClient } from "@/app/study-guide/page-client";
import { CategoryPageClient } from "@/app/study-guide/[category]/page-client";
import { SubjectPageClient } from "@/app/study-guide/[category]/[subject]/page-client";

describe("PrepFord Study Guide & Clinical Notes System", () => {
  describe("Data Integrity & Taxonomy", () => {
    it("contains 7 core clinical nursing categories", () => {
      expect(STUDY_GUIDE_CATEGORIES).toHaveLength(7);
      const slugs = STUDY_GUIDE_CATEGORIES.map((c) => c.slug);
      expect(slugs).toContain("medical-surgical");
      expect(slugs).toContain("pharmacology");
      expect(slugs).toContain("maternal-newborn");
      expect(slugs).toContain("pediatrics");
      expect(slugs).toContain("mental-health");
      expect(slugs).toContain("fundamentals");
      expect(slugs).toContain("leadership-delegation");
    });

    it("resolves categories case-insensitively using getCategoryBySlug", () => {
      const medSurg = getCategoryBySlug("Medical-Surgical");
      expect(medSurg).toBeDefined();
      expect(medSurg?.title).toBe("Medical-Surgical Nursing");

      const notFound = getCategoryBySlug("non-existent-category");
      expect(notFound).toBeUndefined();
    });

    it("resolves specific subjects with clinical takeaways and sections", () => {
      const result = getSubjectBySlugs("medical-surgical", "cardiovascular-disorders");
      expect(result).toBeDefined();
      expect(result?.subject.title).toContain("Cardiovascular Disorders");
      expect(result?.subject.clinicalKeyTakeaways.length).toBeGreaterThan(0);
      expect(result?.subject.sections.length).toBeGreaterThan(0);

      const invalid = getSubjectBySlugs("medical-surgical", "invalid-subject");
      expect(invalid).toBeUndefined();
    });
  });

  describe("StudyGuideIndexClient Component", () => {
    it("renders the main directory hero, metrics, and all categories", () => {
      render(<StudyGuideIndexClient />);

      expect(
        screen.getByRole("heading", { name: /Clinical Nursing Notes & High-Yield NCLEX Study Guide/i })
      ).toBeInTheDocument();

      expect(screen.getByText("Medical-Surgical Nursing")).toBeInTheDocument();
      expect(screen.getByText("Pharmacology & Parenteral Therapy")).toBeInTheDocument();
      expect(screen.getByText("Maternal-Newborn Care (OB)")).toBeInTheDocument();
      expect(screen.getByText("Leadership, Delegation & Priority")).toBeInTheDocument();
    });

    it("filters topics when candidate enters a search query", async () => {
      const user = userEvent.setup();
      render(<StudyGuideIndexClient />);

      const searchInput = screen.getByLabelText(/Search study guide topics/i);
      await user.type(searchInput, "Cardiovascular");

      expect(screen.getByText(/Cardiovascular Disorders & Heart Failure/i)).toBeInTheDocument();
    });
  });

  describe("CategoryPageClient Component", () => {
    it("renders the category overview, subject cards, and breadcrumbs", () => {
      const category = getCategoryBySlug("medical-surgical")!;
      render(<CategoryPageClient category={category} />);

      expect(screen.getByRole("heading", { name: "Medical-Surgical Nursing" })).toBeInTheDocument();
      expect(screen.getByText(/Cardiovascular Disorders & Heart Failure/i)).toBeInTheDocument();
      expect(screen.getByText(/Respiratory Compromise & Acute ARDS/i)).toBeInTheDocument();
      expect(screen.getByText(/All Categories/i)).toHaveAttribute("href", "/study-guide");
    });
  });

  describe("SubjectPageClient Component", () => {
    it("renders full clinical study notes, high-yield takeaways, and alert callouts", () => {
      const result = getSubjectBySlugs("medical-surgical", "cardiovascular-disorders")!;
      render(<SubjectPageClient category={result.category} subject={result.subject} />);

      expect(screen.getByRole("heading", { name: result.subject.title })).toBeInTheDocument();
      expect(
        screen.getByText(/High-Yield Clinical Takeaways & NCLEX Priorities/i)
      ).toBeInTheDocument();

      // Clinical alert verification
      expect(screen.getByText(/Priority Nursing Alert: Pulmonary Edema/i)).toBeInTheDocument();
      expect(screen.getByText(/NCLEX High-Yield Trap/i)).toBeInTheDocument();

      // Navigation back to category
      expect(screen.getByText(/Back to Med-Surg Topics/i)).toBeInTheDocument();
    });
  });
});
