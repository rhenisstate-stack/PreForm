import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotesManager } from "@/components/learner/study-studio/notes-manager";
import { CuratedGuidesBrowser } from "@/components/learner/study-studio/curated-guides-browser";
import { studyService } from "@/lib/study-client-service";
import { aiStudyService } from "@/lib/ai-study-service";
import { adminStudyService } from "@/lib/admin-study-service";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "learner-test-id",
      email: "learner@prepford.test",
      name: "Test Learner",
      pathway: "rn",
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock("@/lib/study-client-service", () => ({
  studyService: {
    getFolders: vi.fn().mockResolvedValue({ success: true, count: 1, folders: [{ id: "f-1", name: "Cardiology", noteCount: 2 }] }),
    getNotes: vi.fn().mockResolvedValue({
      success: true,
      result: {
        items: [
          {
            id: "note-1",
            title: "Cardiac Glycosides & Digoxin",
            contentJson: "{}",
            contentPlainText: "Hold if apical pulse < 60.",
            programme: "rn",
            tags: ["cardiology", "pharmacology"],
            isPinned: true,
            isFavourite: false,
            isArchived: false,
            wordCount: 15,
            characterCount: 80,
            lastEditedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    }),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    togglePinNote: vi.fn(),
    toggleFavouriteNote: vi.fn(),
    archiveNote: vi.fn(),
    getGuideCategories: vi.fn().mockResolvedValue({
      success: true,
      categories: [
        { id: "cat-1", slug: "cardio", title: "Cardiovascular", badge: "Core", guideCount: 3 },
      ],
    }),
    getGuides: vi.fn().mockResolvedValue({
      success: true,
      guides: [
        {
          id: "g-1",
          categoryId: "cat-1",
          categoryTitle: "Cardiovascular",
          slug: "acs-protocols",
          title: "Acute Coronary Syndromes",
          summary: "Clinical presentation, MONA protocol, and ECG indicators.",
          readTime: "5 min read",
          difficulty: "High-Yield",
          programme: "rn",
        },
      ],
    }),
    getGuideById: vi.fn(),
  },
}));

describe("AI Study Studio Phase 2 Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders NotesManager with sidebar and editor canvas", async () => {
    render(<NotesManager initialProgramme="rn" />);

    await waitFor(() => {
      expect(screen.getByTestId("notes-manager-view")).toBeInTheDocument();
      expect(screen.getByText("Study Notes")).toBeInTheDocument();
      expect(screen.getByText("Cardiac Glycosides & Digoxin")).toBeInTheDocument();
    });
  });

  it("renders CuratedGuidesBrowser with categories and guides", async () => {
    render(<CuratedGuidesBrowser />);

    await waitFor(() => {
      expect(screen.getByTestId("curated-guides-browser")).toBeInTheDocument();
      expect(screen.getByText("Official Curated Study Guides")).toBeInTheDocument();
      expect(screen.getByText("Acute Coronary Syndromes")).toBeInTheDocument();
    });
  });
});
