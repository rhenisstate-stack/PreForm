/**
 * PrepFord Learner Feedback & Issue Moderation Service
 * Handles candidate question challenges, content suggestions, technical bug reporting,
 * and administrative workflow resolution.
 */

export interface LearnerFeedback {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  category: "question_issue" | "content_suggestion" | "technical_bug" | "general";
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "new" | "in_review" | "resolved" | "closed";
  referenceId?: string;
  adminNotes?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_FEEDBACK: LearnerFeedback[] = [
  {
    id: "fb-q-cardio-01",
    userId: "user-learner-01",
    userEmail: "alexandra.smith@gmail.com",
    userName: "Alexandra Smith",
    category: "question_issue",
    subject: "Ambiguity in Lead II ECG Rationale for Question Q-CARDIO-01",
    description: "The rationale states that the PR interval was 0.24 seconds, but the question stem showed normal sinus rhythm. Should this be classified as First-Degree AV Block?",
    priority: "high",
    status: "new",
    referenceId: "q-cardio-01",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "fb-guide-resp-02",
    userId: "user-learner-02",
    userEmail: "marcus.johnson@yahoo.com",
    userName: "Marcus Johnson",
    category: "content_suggestion",
    subject: "Suggest adding ROME mnemonic to ABG Study Guide",
    description: "Adding the Respiratory Opposite Metabolic Equal (ROME) breakdown alongside the tic-tac-toe grid would help visual learners understand uncompensated vs partially compensated ABGs faster.",
    priority: "medium",
    status: "in_review",
    referenceId: "guide-resp-abg",
    adminNotes: "Faculty reviewer assigned to integrate mnemonic into Figure 2.1.",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "fb-tech-cat-03",
    userId: "user-learner-03",
    userEmail: "clara.oswald@gmail.com",
    userName: "Clara Oswald",
    category: "technical_bug",
    subject: "Exam Timer Lag on Browser Tab Switch during CAT Simulation",
    description: "When switching to another window and coming back, the timer momentarily flickered before syncing back to the authoritative server clock.",
    priority: "low",
    status: "resolved",
    adminNotes: "Server authoritative heartbeat confirmed syncing within +/- 1500ms tolerance. Resolution confirmed in Phase 4 examination engine update.",
    resolvedBy: "admin@prepford.com",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

let feedbackStore: LearnerFeedback[] = [...INITIAL_FEEDBACK];

export const feedbackService = {
  async getFeedback(params?: {
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<LearnerFeedback[]> {
    let result = [...feedbackStore];

    if (params?.status && params.status !== "all") {
      result = result.filter((f) => f.status === params.status);
    }

    if (params?.category && params.category !== "all") {
      result = result.filter((f) => f.category === params.category);
    }

    if (params?.priority && params.priority !== "all") {
      result = result.filter((f) => f.priority === params.priority);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.subject.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.userName.toLowerCase().includes(q) ||
          f.userEmail.toLowerCase().includes(q) ||
          (f.referenceId && f.referenceId.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getFeedbackById(id: string): Promise<LearnerFeedback | null> {
    return feedbackStore.find((f) => f.id === id) || null;
  },

  async submitFeedback(data: {
    userId?: string;
    userName: string;
    userEmail: string;
    category: LearnerFeedback["category"];
    subject: string;
    description: string;
    priority?: LearnerFeedback["priority"];
    referenceId?: string;
  }): Promise<LearnerFeedback> {
    const item: LearnerFeedback = {
      id: `fb-${Date.now()}`,
      userId: data.userId,
      userName: data.userName.trim(),
      userEmail: data.userEmail.trim(),
      category: data.category,
      subject: data.subject.trim(),
      description: data.description.trim(),
      priority: data.priority || "medium",
      status: "new",
      referenceId: data.referenceId?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    feedbackStore.unshift(item);
    return item;
  },

  async updateFeedback(
    id: string,
    updates: {
      status?: LearnerFeedback["status"];
      adminNotes?: string;
      resolvedBy?: string;
    }
  ): Promise<LearnerFeedback> {
    const item = feedbackStore.find((f) => f.id === id);
    if (!item) throw new Error("Feedback item not found");

    if (updates.status !== undefined) item.status = updates.status;
    if (updates.adminNotes !== undefined) item.adminNotes = updates.adminNotes;
    if (updates.resolvedBy !== undefined) item.resolvedBy = updates.resolvedBy;
    item.updatedAt = new Date().toISOString();

    return { ...item };
  },
};
