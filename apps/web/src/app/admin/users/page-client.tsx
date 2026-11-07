"use client";

import * as React from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  KeyRound,
  Ban,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogOut,
  Loader2,
  Mail,
  Send,
  Clock,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FullPageFormLayout,
  FullPageDetailsLayout,
} from "@/components/ui/full-page-crud";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import type { AdminUserListItem } from "@/lib/api-services";
import { invitationService, StaffInvitation } from "@/lib/invitation-service";

export function AdminUsersClient({
  initialMode = "list",
  initialUserId,
}: {
  initialMode?: "list" | "create" | "detail";
  initialUserId?: string;
} = {}) {
  const { user: currentUser } = useAuth();

  const [activeMainTab, setActiveMainTab] = React.useState<"users" | "invitations">("users");
  const [users, setUsers] = React.useState<AdminUserListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(15);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  // Staff Invitations State
  const [invitations, setInvitations] = React.useState<StaffInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = React.useState(false);
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [inviteForm, setInviteForm] = React.useState<{
    email: string;
    role: StaffInvitation["role"];
    notes: string;
    expiryHours: number;
  }>({
    email: "",
    role: "instructor",
    notes: "",
    expiryHours: 72,
  });
  const [inviteSubmitting, setInviteSubmitting] = React.useState(false);

  // Full-Page CRUD state
  const [selectedUser, setSelectedUser] = React.useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(initialMode === "detail");
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState("Active");
  const [statusReason, setStatusReason] = React.useState("");
  const [statusActionLoading, setStatusActionLoading] = React.useState(false);

  const [roleModalOpen, setRoleModalOpen] = React.useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = React.useState("");
  const [roleActionLoading, setRoleActionLoading] = React.useState(false);

  const [createModalOpen, setCreateModalOpen] = React.useState(initialMode === "create");
  const [createForm, setCreateForm] = React.useState({
    email: "",
    displayName: "",
    password: "",
    pathway: "rn",
    role: "candidate",
  });
  const [createLoading, setCreateLoading] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }

      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      notify.error(sanitizeErrorMessage(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, pageSize]);

  const fetchInvitations = React.useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const res = await fetch("/api/admin/invitations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch staff invitations");
      setInvitations(data.invitations || []);
    } catch {
      // Fallback to client-side store
      const invs = await invitationService.getInvitations();
      setInvitations(invs);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, [fetchUsers, fetchInvitations]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) {
      notify.error("Please provide a valid staff email address.");
      return;
    }

    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send staff invitation");

      notify.success(`Invitation dispatched to ${inviteForm.email} (expires in ${inviteForm.expiryHours}h).`);
      setInviteModalOpen(false);
      setInviteForm({ email: "", role: "instructor", notes: "", expiryHours: 72 });
      fetchInvitations();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to send invitation"));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleResendInvitation = async (id: string, email: string) => {
    try {
      const res = await fetch(`/api/admin/invitations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend invitation");

      notify.success(`Renewed invitation token for ${email} (72h extension).`);
      fetchInvitations();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to resend invitation"));
    }
  };

  const handleRevokeInvitation = async (id: string, email: string) => {
    try {
      const res = await fetch(`/api/admin/invitations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke invitation");

      notify.success(`Revoked invitation for ${email}.`);
      fetchInvitations();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to revoke invitation"));
    }
  };

  const handleInspect = async (id: string) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load user details");
      setSelectedUser(data.user);
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to load user details"));
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenStatusModal = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setNewStatus(user.accountStatus === "Active" ? "Suspended" : "Active");
    setStatusReason("");
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;
    setStatusActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason: statusReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      notify.success(`User status updated to ${newStatus}`);
      setStatusModalOpen(false);
      fetchUsers();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to update status"));
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleOpenRoleModal = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setSelectedRoleToAdd("");
    setRoleModalOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleToAdd) return;
    setRoleActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedRoleToAdd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign role");

      notify.success("Role assigned successfully");
      setRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to assign role"));
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleRemoveRole = async (userId: string, roleName: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles/${roleName}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove role");

      notify.success(`Role '${roleName}' removed`);
      fetchUsers();
      if (selectedUser?.id === userId) {
        handleInspect(userId);
      }
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to remove role"));
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/security/users/${userId}/revoke-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Administrative Session Termination" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke sessions");

      notify.success(`Revoked ${data.revokedCount ?? 0} active session(s)`);
      fetchUsers();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to revoke sessions"));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          roles: [createForm.role],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      notify.success("User created successfully");
      setCreateModalOpen(false);
      setCreateForm({ email: "", displayName: "", password: "", pathway: "rn", role: "candidate" });
      fetchUsers();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to create user"));
    } finally {
      setCreateLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  React.useEffect(() => {
    if (initialUserId && initialMode === "detail") {
      handleInspect(initialUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, initialMode]);

  if (detailModalOpen) {
    return (
      <FullPageDetailsLayout
        title="User Account Details"
        subtitle="Comprehensive profile, assigned roles, active sessions, and recent governance events."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users & Roles", onClick: () => setDetailModalOpen(false) },
          { label: selectedUser?.displayName || "User Details" },
        ]}
        onBack={() => setDetailModalOpen(false)}
      >
        {detailLoading || !selectedUser ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-xl bg-muted/40 border">
              <div>
                <span className="text-xs text-muted-foreground">Display Name</span>
                <p className="font-semibold text-base">{selectedUser.displayName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Email</span>
                <p className="font-semibold text-base">{selectedUser.email}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Account Status</span>
                <p className="font-medium capitalize text-base">{selectedUser.accountStatus}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Security Version</span>
                <p className="font-medium text-base">v{selectedUser.securityVersion}</p>
              </div>
            </div>

            {/* Roles */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Assigned Roles</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser.roles?.map((r: any) => (
                  <div key={r.id || r.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-muted/30 text-xs">
                    <span className="font-medium capitalize">{r.name || r}</span>
                    <button
                      onClick={() => handleRemoveRole(selectedUser.id, r.name || r)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      title="Remove role"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Sessions */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Active Sessions ({selectedUser.activeSessions?.length || 0})
              </h4>
              {selectedUser.activeSessions?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No active sessions.</p>
              ) : (
                <div className="space-y-2">
                  {selectedUser.activeSessions?.map((s: any) => (
                    <div key={s.id} className="p-3 rounded-lg border bg-muted/20 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-medium">{s.deviceLabel || "Standard Web Client"}</div>
                        <div className="text-muted-foreground">IP: {s.lastIpAddress || "Unknown"} • Active: {new Date(s.lastActiveAt).toLocaleString()}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Audit Logs */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Recent Security Events</h4>
              <div className="space-y-1.5">
                {selectedUser.recentAuditLogs?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No recent events.</p>
                ) : (
                  selectedUser.recentAuditLogs?.map((al: any) => (
                    <div key={al.id} className="p-2.5 rounded border bg-muted/10 text-xs flex justify-between">
                      <div>
                        <span className="font-semibold text-primary mr-2">{al.action}</span>
                        <span className="text-muted-foreground">{al.description}</span>
                      </div>
                      <span className="text-muted-foreground">{new Date(al.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </FullPageDetailsLayout>
    );
  }

  if (statusModalOpen) {
    return (
      <FullPageFormLayout
        title="Update Account Status"
        subtitle="Modifying account status immediately increments SecurityVersion and revokes active sessions if suspended."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users & Roles", onClick: () => setStatusModalOpen(false) },
          { label: "Update Account Status" },
        ]}
        onBack={() => setStatusModalOpen(false)}
        onCancel={() => setStatusModalOpen(false)}
        onSubmit={handleUpdateStatus}
        submitLabel="Confirm Status Change"
        isSubmitting={statusActionLoading}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Status Change</label>
            <Input
              placeholder="Reason (e.g. administrative review, payment failure)..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </div>
        </div>
      </FullPageFormLayout>
    );
  }

  if (roleModalOpen) {
    return (
      <FullPageFormLayout
        title={`Assign Role to ${selectedUser?.displayName || "User"}`}
        subtitle="Assigning a role updates permissions immediately and revokes active sessions to ensure fresh token issuance."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users & Roles", onClick: () => setRoleModalOpen(false) },
          { label: "Assign Role" },
        ]}
        onBack={() => setRoleModalOpen(false)}
        onCancel={() => setRoleModalOpen(false)}
        onSubmit={handleAssignRole}
        submitLabel="Assign Role"
        submitDisabled={!selectedRoleToAdd}
        isSubmitting={roleActionLoading}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Role</label>
          <select
            value={selectedRoleToAdd}
            onChange={(e) => setSelectedRoleToAdd(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="">Choose a role...</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Operations Admin</option>
            <option value="content_manager">Content Manager</option>
            <option value="exam_manager">Exam Manager</option>
            <option value="reviewer">Reviewer</option>
            <option value="instructor">Instructor</option>
            <option value="support">Support</option>
            <option value="candidate">Candidate</option>
          </select>
        </div>
      </FullPageFormLayout>
    );
  }

  if (createModalOpen) {
    return (
      <FullPageFormLayout
        title="Create New User Account"
        subtitle="Create an administrative, faculty, or learner account with initial role assignment."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users & Roles", onClick: () => setCreateModalOpen(false) },
          { label: "Create User Account" },
        ]}
        onBack={() => setCreateModalOpen(false)}
        onCancel={() => setCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        submitLabel="Create Account"
        isSubmitting={createLoading}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Display Name</label>
            <Input
              required
              placeholder="Full Name"
              value={createForm.displayName}
              onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Email Address</label>
            <Input
              type="email"
              required
              placeholder="name@prepford.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Temporary Password</label>
            <Input
              type="password"
              required
              placeholder="At least 8 characters"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Initial Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                <option value="candidate">Candidate</option>
                <option value="instructor">Instructor</option>
                <option value="reviewer">Reviewer</option>
                <option value="exam_manager">Exam Manager</option>
                <option value="content_manager">Content Manager</option>
                <option value="support">Support</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Pathway</label>
              <select
                value={createForm.pathway}
                onChange={(e) => setCreateForm({ ...createForm, pathway: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                <option value="rn">NCLEX-RN</option>
                <option value="pn">NCLEX-PN</option>
                <option value="both">Both (RN & PN)</option>
              </select>
            </div>
          </div>
        </div>
      </FullPageFormLayout>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User & Account Governance
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage candidates, faculty, examiners, and platform administrators with backend-enforced RBAC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === "users" ? (
            <>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={invitationsLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${invitationsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setInviteModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Staff Member
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Top Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab("users")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeMainTab === "users"
              ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200 font-semibold"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-4 h-4" />
          User Accounts & Learners ({total})
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab("invitations")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeMainTab === "invitations"
              ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200 font-semibold"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Mail className="w-4 h-4" />
          Staff Invitations Lifecycle ({invitations.length})
        </button>
      </div>

      {activeMainTab === "users" ? (
        <>
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="content_manager">Content Manager</option>
          <option value="exam_manager">Exam Manager</option>
          <option value="reviewer">Reviewer</option>
          <option value="instructor">Instructor</option>
          <option value="support">Support</option>
          <option value="candidate">Candidate</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left">User</th>
                <th className="py-3 px-4 text-left">Roles</th>
                <th className="py-3 px-4 text-left">Pathway</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No user accounts match the current filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrentSuper = u.roles.includes("superadmin");
                  const isSuspended = u.accountStatus === "Suspended";
                  const isDeactivated = u.accountStatus === "Deactivated";

                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{u.displayName}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={r === "superadmin" ? "destructive" : r === "admin" ? "secondary" : "outline"}
                              className="text-xs capitalize font-normal"
                            >
                              {r.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 uppercase text-xs font-semibold text-muted-foreground">
                        {u.pathway || "RN"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            u.accountStatus === "Active"
                              ? "default"
                              : isSuspended
                              ? "destructive"
                              : "secondary"
                          }
                          className={`text-xs ${
                            u.accountStatus === "Active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : ""
                          }`}
                        >
                          {u.accountStatus}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInspect(u.id)}
                            title="Inspect Profile & Audit Trail"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRoleModal(u)}
                            title="Manage Roles"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenStatusModal(u)}
                            title="Change Account Status"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeSessions(u.id)}
                            title="Revoke Active Sessions"
                          >
                            <LogOut className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{users.length}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> accounts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </>
  ) : (
    /* Staff Invitations Lifecycle View */
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Invited Email & Department</th>
                <th className="py-3 px-4">Intended Role</th>
                <th className="py-3 px-4">Invited By</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {invitationsLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading staff invitations...
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    No staff invitations found. Click &quot;Invite Staff Member&quot; to issue a new credential invitation.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-foreground text-sm">{inv.email}</p>
                      {inv.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {inv.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {inv.role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {inv.invitedBy}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(inv.expiresAt).toLocaleDateString()}{" "}
                      <span className="text-[10px]">
                        ({new Date(inv.expiresAt) > new Date() ? "Active" : "Expired"})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          inv.status === "accepted"
                            ? "default"
                            : inv.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                        className={`text-[10px] uppercase ${
                          inv.status === "accepted"
                            ? "bg-emerald-600 text-white"
                            : inv.status === "pending"
                            ? "bg-teal-600 text-white"
                            : inv.status === "revoked"
                            ? "border-red-500 text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {inv.status !== "accepted" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-teal-600 hover:text-teal-700"
                          onClick={() => handleResendInvitation(inv.id, inv.email)}
                          title="Resend invitation token (72h extension)"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Resend
                        </Button>
                      )}
                      {inv.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          onClick={() => handleRevokeInvitation(inv.id, inv.email)}
                          title="Revoke invitation"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" /> Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* Invite Staff Dialog */}
  <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-teal-600" />
          Invite Staff Member
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Issue a secure, time-limited onboarding invitation token to faculty, reviewers, or managers.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleInviteStaff} className="space-y-4 py-2">
        <div>
          <label className="text-xs font-semibold">Staff Work Email <span className="text-red-500">*</span></label>
          <Input
            type="email"
            placeholder="colleague@prepford.edu"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            required
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">Assigned Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({
                  ...inviteForm,
                  role: e.target.value as StaffInvitation["role"],
                })
              }
              className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
            >
              <option value="instructor">Instructor</option>
              <option value="reviewer">Reviewer</option>
              <option value="exam_manager">Exam Manager</option>
              <option value="content_manager">Content Manager</option>
              <option value="support">Support</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold">Token Expiration</label>
            <select
              value={inviteForm.expiryHours}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, expiryHours: parseInt(e.target.value, 10) || 72 })
              }
              className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
            >
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
              <option value={72}>72 Hours (Default)</option>
              <option value={168}>7 Days</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold">Onboarding Notes / Department (Optional)</label>
          <textarea
            rows={2}
            value={inviteForm.notes}
            onChange={(e) => setInviteForm({ ...inviteForm, notes: e.target.value })}
            placeholder="e.g. Critical care curriculum review onboarding"
            className="w-full mt-1 p-2 text-xs rounded-md border border-input bg-background"
          />
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setInviteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={inviteSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {inviteSubmitting ? "Dispatching..." : "Send Staff Invitation"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</div>
  );
}
