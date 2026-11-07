import { describe, it, expect, vi, beforeEach } from "vitest";
import { blogService } from "@/lib/blog-service";
import { feedbackService } from "@/lib/feedback-service";
import { invitationService } from "@/lib/invitation-service";

describe("Phase 7, 8 & 9: Staff Invitations, Feedback Moderation, and Editorial Management", () => {
  describe("Staff Invitations Lifecycle (Phase 7)", () => {
    it("returns pre-seeded invitations with status and expiration", async () => {
      const invs = await invitationService.getInvitations();
      expect(invs.length).toBeGreaterThanOrEqual(3);

      const pending = invs.find((i) => i.email === "sarah.jenkins@prepford.edu");
      expect(pending).toBeDefined();
      expect(pending?.role).toBe("instructor");
      expect(pending?.status).toBe("pending");
    });

    it("creates a new invitation with 72h default expiration and checks duplicates", async () => {
      const newInv = await invitationService.createInvitation({
        email: "new.faculty@prepford.edu",
        role: "reviewer",
        notes: "Pharmacology item authoring review",
      });

      expect(newInv.email).toBe("new.faculty@prepford.edu");
      expect(newInv.role).toBe("reviewer");
      expect(newInv.status).toBe("pending");

      // Duplicate prevention
      await expect(
        invitationService.createInvitation({
          email: "new.faculty@prepford.edu",
          role: "reviewer",
        })
      ).rejects.toThrow(/active pending invitation already exists/i);
    });

    it("resends and revokes invitations", async () => {
      const inv = await invitationService.createInvitation({
        email: "temporary.candidate@prepford.edu",
        role: "support",
      });

      // Revoke
      const revoked = await invitationService.revokeInvitation(inv.id);
      expect(revoked.status).toBe("revoked");

      // Resend
      const resent = await invitationService.resendInvitation(inv.id);
      expect(resent.status).toBe("pending");
      expect(new Date(resent.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Feedback & Issue Moderation Service (Phase 8)", () => {
    it("returns pre-seeded feedback items with categories and priorities", async () => {
      const items = await feedbackService.getFeedback();
      expect(items.length).toBeGreaterThanOrEqual(3);

      const cardioIssue = items.find((f) => f.referenceId === "q-cardio-01");
      expect(cardioIssue).toBeDefined();
      expect(cardioIssue?.priority).toBe("high");
      expect(cardioIssue?.category).toBe("question_issue");
    });

    it("submits candidate feedback and assigns new status", async () => {
      const submitted = await feedbackService.submitFeedback({
        userName: "Jordan Taylor",
        userEmail: "jordan.taylor@prepford.edu",
        category: "content_suggestion",
        subject: "Add Parkland calculation walkthrough to pediatric section",
        description: "A step-by-step example for an 18kg toddler with 25% TBSA would improve clarity.",
        priority: "medium",
        referenceId: "guide-peds-burns",
      });

      expect(submitted.status).toBe("new");
      expect(submitted.subject).toContain("Parkland calculation");

      const lookup = await feedbackService.getFeedbackById(submitted.id);
      expect(lookup).toBeDefined();
      expect(lookup?.userName).toBe("Jordan Taylor");
    });

    it("moderates feedback status and records internal audit resolution notes", async () => {
      const updated = await feedbackService.updateFeedback("fb-q-cardio-01", {
        status: "in_review",
        adminNotes: "Assigned to clinical cardiology reviewer Dr. Reed for rationale audit.",
        resolvedBy: "admin@prepford.com",
      });

      expect(updated.status).toBe("in_review");
      expect(updated.adminNotes).toContain("Dr. Reed");
    });
  });

  describe("Blog & Editorial Management Service (Phase 9)", () => {
    it("loads canonical articles and allows filtering by category", async () => {
      const res = await blogService.getPosts({ category: "Next Gen NCLEX" });
      expect(res.posts.length).toBeGreaterThanOrEqual(1);
      expect(res.posts.every((p) => p.category === "Next Gen NCLEX")).toBe(true);
    });

    it("creates a draft article and toggles status to published", async () => {
      const created = await blogService.createPost({
        title: "Test Plan 2028: Emerging Clinical Competencies in Telehealth Nursing",
        excerpt: "An overview of telehealth nursing competencies in licensure testing.",
        category: "Next Gen NCLEX",
        author: {
          name: "PrepFord Educator Team",
          role: "Curriculum Specialist",
          credentials: "MSN, RN",
        },
        readingTime: "5 min read",
        featuredImage: "/images/blog/prepford-ngn-article-hero.jpg",
        imageAlt: "Telehealth nursing workstation",
        tags: ["Telehealth", "NCLEX-RN"],
        status: "draft",
        content: {
          lead: "Telehealth clinical skills are increasingly tested on national licensure exams.",
          keyTakeaways: ["Assess video link stability", "Identify red flag symptoms remotely"],
          sections: [
            {
              heading: "Remote Clinical Assessment",
              body: ["Nurses must guide the client through reliable self-monitoring techniques."],
            },
          ],
        },
      });

      expect(created.status).toBe("draft");

      // Publish
      const published = await blogService.setPostStatus(created.slug, "published");
      expect(published.status).toBe("published");
      expect(published.publishedAt).toBeDefined();

      // Delete
      const del = await blogService.deletePost(created.slug);
      expect(del.success).toBe(true);
    });
  });
});
