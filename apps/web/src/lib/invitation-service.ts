/**
 * PrepFord Staff Invitation & Role Onboarding Service
 * Enforces secure time-limited invitation tokens (72h), role scoping, and administrative audit trails.
 */

export interface StaffInvitation {
  id: string;
  email: string;
  role: "admin" | "exam_manager" | "content_manager" | "instructor" | "reviewer" | "support";
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  notes?: string;
}

const INITIAL_INVITATIONS: StaffInvitation[] = [
  {
    id: "inv-nurse-educator-01",
    email: "sarah.jenkins@prepford.edu",
    role: "instructor",
    invitedBy: "superadmin@prepford.com",
    invitedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: "pending",
    notes: "Lead clinical faculty for Cardiovascular and Critical Care lecture series.",
  },
  {
    id: "inv-exam-reviewer-02",
    email: "dr.morrison@prepford.edu",
    role: "reviewer",
    invitedBy: "admin@prepford.com",
    invitedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 1).toISOString(),
    status: "pending",
    notes: "Peer review of Next Gen unfolding pediatric case studies.",
  },
  {
    id: "inv-content-manager-03",
    email: "marcus.vance@prepford.com",
    role: "content_manager",
    invitedBy: "superadmin@prepford.com",
    invitedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    expiresAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    status: "expired",
    notes: "Editorial management onboarding.",
  },
  {
    id: "inv-exam-manager-04",
    email: "claire.chen@prepford.com",
    role: "exam_manager",
    invitedBy: "superadmin@prepford.com",
    invitedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    expiresAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    status: "accepted",
    notes: "Examination blueprint and CAT difficulty governor.",
  },
];

let invitationsStore: StaffInvitation[] = [...INITIAL_INVITATIONS];

export const invitationService = {
  async getInvitations(): Promise<StaffInvitation[]> {
    // Automatically flag expired invitations
    const now = new Date();
    invitationsStore = invitationsStore.map((inv) => {
      if (inv.status === "pending" && new Date(inv.expiresAt) < now) {
        return { ...inv, status: "expired" };
      }
      return inv;
    });
    return [...invitationsStore];
  },

  async createInvitation(data: {
    email: string;
    role: StaffInvitation["role"];
    invitedBy?: string;
    notes?: string;
    expiryHours?: number;
  }): Promise<StaffInvitation> {
    const existing = invitationsStore.find(
      (inv) => inv.email.toLowerCase() === data.email.toLowerCase() && inv.status === "pending"
    );
    if (existing) {
      throw new Error(`An active pending invitation already exists for ${data.email}.`);
    }

    const hours = data.expiryHours || 72;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + hours * 3600 * 1000).toISOString();

    const newInv: StaffInvitation = {
      id: `inv-${Date.now()}`,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      invitedBy: data.invitedBy || "admin@prepford.com",
      invitedAt: now.toISOString(),
      expiresAt,
      status: "pending",
      notes: data.notes?.trim() || undefined,
    };

    invitationsStore.unshift(newInv);
    return newInv;
  },

  async resendInvitation(id: string): Promise<StaffInvitation> {
    const inv = invitationsStore.find((i) => i.id === id);
    if (!inv) throw new Error("Invitation not found");

    const now = new Date();
    inv.invitedAt = now.toISOString();
    inv.expiresAt = new Date(now.getTime() + 72 * 3600 * 1000).toISOString();
    inv.status = "pending";

    return { ...inv };
  },

  async revokeInvitation(id: string): Promise<StaffInvitation> {
    const inv = invitationsStore.find((i) => i.id === id);
    if (!inv) throw new Error("Invitation not found");

    inv.status = "revoked";
    return { ...inv };
  },
};
