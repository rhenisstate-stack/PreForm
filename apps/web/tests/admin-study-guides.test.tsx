import * as React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminNotesClient } from "@/app/admin/study-guides/notes/page-client";
import { AdminFlashcardsClient } from "@/app/admin/study-guides/flashcards/page-client";
import { AdminReviewSessionsClient } from "@/app/admin/study-guides/review-sessions/page-client";
import { AdminTopicQuizzesClient } from "@/app/admin/study-guides/topic-quizzes/page-client";
import { adminStudyService } from "@/lib/admin-study-service";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

let mockUser: { role: string; displayName?: string; email?: string } | null = {
  role: "admin",
  displayName: "Admin Instructor",
  email: "admin@prepford.test",
};
let mockIsLoading = false;
let mockIsAuthenticated = true;
let mockPathname = "/admin/study-guides";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: React.ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} data-testid="mock-next-image" {...props} />;
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    login: vi.fn(),
    registerUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/admin-study-service", () => ({
  adminStudyService: {
    getNotes: vi.fn(),
    getNote: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    duplicateNote: vi.fn(),
    archiveNote: vi.fn(),
    publishNote: vi.fn(),
    setNoteStatus: vi.fn(),

    getDecks: vi.fn(),
    getDeck: vi.fn(),
    createDeck: vi.fn(),
    updateDeck: vi.fn(),
    deleteDeck: vi.fn(),
    duplicateDeck: vi.fn(),
    publishDeck: vi.fn(),
    archiveDeck: vi.fn(),
    getDeckCards: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    duplicateCard: vi.fn(),
    moveCard: vi.fn(),
    reorderCards: vi.fn(),

    getReviewConfiguration: vi.fn(),
    updateReviewConfiguration: vi.fn(),
    getReviewAnalytics: vi.fn(),
    getReviewSessions: vi.fn(),
    getReviewSession: vi.fn(),

    getQuizzes: vi.fn(),
    getQuiz: vi.fn(),
    createQuiz: vi.fn(),
    updateQuiz: vi.fn(),
    deleteQuiz: vi.fn(),
    duplicateQuiz: vi.fn(),
    publishQuiz: vi.fn(),
    archiveQuiz: vi.fn(),
    searchQuestions: vi.fn(),
    assignQuestions: vi.fn(),
    getQuizAnalytics: vi.fn(),
    generateDraftQuestions: vi.fn(),
  },
}));

describe("Admin Study Guide Management Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      role: "admin",
      displayName: "Admin Instructor",
      email: "admin@prepford.test",
    };
    mockIsLoading = false;
    mockIsAuthenticated = true;
  });

  describe("Collapsible Sidebar & Navigation Hierarchy", () => {
    it("renders Study Guide Management parent item with chevron and auto-expands child items when a child route is active", async () => {
      mockPathname = "/admin/study-guides/notes";

      render(
        <AdminShell>
          <div>Workspace Content</div>
        </AdminShell>
      );

      // The collapsible parent toggle button should exist
      const collapsibleButton = await screen.findByTestId("sidebar-collapsible-admin-study-guides");
      expect(collapsibleButton).toBeDefined();
      expect(collapsibleButton.textContent).toContain("Study Guide Management");

      // Child sub-items container should be visible
      const subitemsContainer = await screen.findByTestId("sidebar-subitems-admin-study-guides");
      expect(subitemsContainer).toBeDefined();

      // Check for all child routes
      expect(screen.getByTestId("sidebar-link-admin-study-guides-curated")).toBeDefined();
      expect(screen.getByTestId("sidebar-link-admin-study-guides-notes")).toBeDefined();
      expect(screen.getByTestId("sidebar-link-admin-study-guides-flashcards")).toBeDefined();
      expect(screen.getByTestId("sidebar-link-admin-study-guides-review-sessions")).toBeDefined();
      expect(screen.getByTestId("sidebar-link-admin-study-guides-topic-quizzes")).toBeDefined();
    });

    it("collapses and re-expands child navigation items when clicking the parent chevron toggle", async () => {
      mockPathname = "/admin/study-guides";

      render(
        <AdminShell>
          <div>Workspace Content</div>
        </AdminShell>
      );

      const collapsibleButton = await screen.findByTestId("sidebar-collapsible-admin-study-guides");

      // Click to toggle collapse
      fireEvent.click(collapsibleButton);

      // Verify collapsed/hidden state
      const subitemsContainer = screen.queryByTestId("sidebar-subitems-admin-study-guides");
      expect(subitemsContainer === null || subitemsContainer.classList.contains("hidden")).toBe(true);

      // Click again to re-expand
      fireEvent.click(collapsibleButton);
      const reexpandedContainer = screen.getByTestId("sidebar-subitems-admin-study-guides");
      expect(reexpandedContainer).toBeDefined();
      expect(reexpandedContainer.classList.contains("hidden")).toBe(false);
    });
  });

  describe("Notes Management Workspace", () => {
    it("renders notes table and opens the rich-text editor dialog with formatting tools", async () => {
      vi.mocked(adminStudyService.getNotes).mockResolvedValue({
        success: true,
        data: [
          {
            id: "note-1",
            userId: "admin-1",
            authorEmail: "admin@prepford.test",
            authorName: "Admin User",
            folderId: null,
            title: "Acid-Base Imbalances (ABG Interpretation)",
            contentJson: "{}",
            contentPlainText: "Normal pH 7.35-7.45. PaCO2 35-45. HCO3 22-26.",
            programme: "rn",
            subjectDomainId: null,
            topicSlug: "abg",
            topicTitle: "Acid-Base Imbalances",
            clientNeedId: "physiological",
            tags: ["ABG", "High Yield"],
            isPinned: false,
            isFavourite: false,
            isArchived: false,
            status: "Published",
            isOfficial: true,
            studyGuideId: null,
            wordCount: 12,
            characterCount: 65,
            lastEditedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      });

      render(<AdminNotesClient />);

      await waitFor(() => {
        expect(screen.getByText("Acid-Base Imbalances (ABG Interpretation)")).toBeDefined();
      });

      expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
      expect(screen.getByText("RN")).toBeDefined();

      // Click New Note button
      const newNoteBtn = screen.getByRole("button", { name: /New Note/i });
      fireEvent.click(newNoteBtn);

      // Dialog title should appear
      await waitFor(() => {
        expect(screen.getByText("Create Official Study Note")).toBeDefined();
      });

      // Verify formatting toolbar buttons exist (Bold, Italic, Heading, etc.)
      expect(screen.getByTitle("Bold (Ctrl+B)")).toBeDefined();
      expect(screen.getByTitle("Italic (Ctrl+I)")).toBeDefined();
      expect(screen.getByTitle("Heading 1")).toBeDefined();
    });
  });

  describe("Flashcards Management Workspace", () => {
    it("renders decks list and allows opening the card manager modal", async () => {
      vi.mocked(adminStudyService.getDecks).mockResolvedValue({
        success: true,
        count: 1,
        decks: [
          {
            id: "deck-1",
            userId: "admin-1",
            authorEmail: "admin@prepford.test",
            title: "Pharmacology: Cardiac Glycosides",
            description: "High-yield card deck covering digoxin, toxicity, and electrolyte implications.",
            programme: "rn",
            subjectDomainId: null,
            topicSlug: "cardiac-glycosides",
            topicTitle: "Pharmacology",
            clientNeedId: null,
            tags: ["Cardiac", "Digoxin"],
            isOfficial: true,
            isPublished: true,
            isArchived: false,
            status: "active",
            colorCode: null,
            iconName: null,
            cardCount: 24,
            dueCardCount: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      vi.mocked(adminStudyService.getDeckCards).mockResolvedValue({
        success: true,
        count: 1,
        cards: [
          {
            id: "card-1",
            deckId: "deck-1",
            deckTitle: "Pharmacology: Cardiac Glycosides",
            front: "What is the therapeutic digoxin range?",
            back: "0.8 - 2.0 ng/mL. Hold if apical pulse is < 60.",
            explanation: "Low potassium enhances digoxin toxicity risk.",
            imageUrl: null,
            diagramUrl: null,
            cardStyle: "qa",
            difficulty: "medium",
            programme: "rn",
            status: "active",
            topicTitle: "Pharmacology",
            clientNeedId: null,
            tags: ["Digoxin"],
            displayOrder: 1,
            repetitionCount: 3,
            easeFactor: 2.5,
            intervalDays: 6,
            dueAt: new Date().toISOString(),
            lastReviewedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
      });

      render(<AdminFlashcardsClient />);

      await waitFor(() => {
        expect(screen.getByText("Pharmacology: Cardiac Glycosides")).toBeDefined();
      });

      // Click Manage Cards button
      const manageCardsBtn = screen.getByRole("button", { name: /Manage Cards/i });
      fireEvent.click(manageCardsBtn);

      await waitFor(() => {
        expect(screen.getByText("What is the therapeutic digoxin range?")).toBeDefined();
      });

      expect(screen.getByText("Add Card")).toBeDefined();
    });
  });

  describe("Review Sessions Management Workspace", () => {
    it("renders retention analytics and algorithm parameters", async () => {
      vi.mocked(adminStudyService.getReviewAnalytics).mockResolvedValue({
        success: true,
        analytics: {
          totalSessions: 142,
          completedSessions: 130,
          abandonedSessions: 12,
          completionRate: 91.5,
          totalCardsReviewed: 2840,
          overallAccuracyPercentage: 86.4,
          averageDurationSeconds: 420,
          subjectBreakdown: [
            { subject: "Pharmacology", sessionCount: 50, accuracyPercentage: 84.0 },
          ],
          programmeBreakdown: [
            { programme: "rn", sessionCount: 100, cardsReviewed: 2000, accuracyPercentage: 87.0 },
            { programme: "pn", sessionCount: 42, cardsReviewed: 840, accuracyPercentage: 85.0 },
          ],
          frequentlyDifficultCards: [
            {
              cardId: "card-9",
              deckTitle: "Pediatric Milestones",
              front: "At what age should an infant transfer objects hand-to-hand?",
              failureCount: 18,
              difficulty: "hard",
              programme: "rn",
            },
          ],
          schedulingStats: {
            cardsDueToday: 38,
            cardsOverdue: 6,
            cardsScheduledNext7Days: 210,
            averageEaseFactor: 2.45,
          },
        },
      });

      vi.mocked(adminStudyService.getReviewConfiguration).mockResolvedValue({
        success: true,
        config: {
          id: "global_config",
          maxCardsPerSession: 50,
          defaultCardLimit: 20,
          supportedModes: ["all_due", "deck"],
          enableRn: true,
          enablePn: true,
          requireSubscription: false,
          allowCustomDrills: true,
          minIntervalDays: 1,
          defaultEaseFactor: 2.5,
          updatedAt: new Date().toISOString(),
          updatedBy: "Admin",
        },
      });

      vi.mocked(adminStudyService.getReviewSessions).mockResolvedValue({
        success: true,
        data: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 0,
      });

      render(<AdminReviewSessionsClient />);

      await waitFor(() => {
        expect(screen.getByText("142")).toBeDefined();
        expect(screen.getByText("86.4%")).toBeDefined();
      });

      expect(screen.getByText("Frequently Difficult Clinical Cards")).toBeDefined();
      expect(screen.getByText("At what age should an infant transfer objects hand-to-hand?")).toBeDefined();
    });
  });

  describe("Topic Quizzes Management Workspace", () => {
    it("renders topic quizzes and provides question bank sourcing and AI generation", async () => {
      vi.mocked(adminStudyService.getQuizzes).mockResolvedValue({
        success: true,
        count: 1,
        quizzes: [
          {
            id: "quiz-1",
            title: "Endocrine Emergencies: DKA vs HHS",
            description: "Assess clinical recognition of ketone bodies, fluid deficit, and insulin protocols.",
            programme: "rn",
            subjectDomainId: null,
            topicSlug: "endocrine",
            topicTitle: "Endocrine",
            clientNeedId: "physiological",
            status: "Published",
            isPublished: true,
            isOfficial: true,
            isArchived: false,
            targetScore: 80,
            timeLimitMinutes: 25,
            feedbackMode: "immediate",
            maxAttempts: 3,
            questionIds: ["q-1", "q-2"],
            questionCount: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      render(<AdminTopicQuizzesClient />);

      await waitFor(() => {
        expect(screen.getByText("Endocrine Emergencies: DKA vs HHS")).toBeDefined();
      });

      expect(screen.getByText("Pass: 80%")).toBeDefined();
      expect(screen.getByText("2 questions")).toBeDefined();

      // Verify AI Question Generator button exists
      const aiBtn = screen.getByRole("button", { name: /AI Question Generator/i });
      expect(aiBtn).toBeDefined();

      // Open AI question generator
      fireEvent.click(aiBtn);
      await waitFor(() => {
        expect(screen.getByText("AI-Assisted Question Generator")).toBeDefined();
      });
    });
  });
});
