"use client";

import * as React from "react";
import {
  KeyRound,
  Shield,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  CheckCircle2,
  Lock,
  Layers,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import type { AdminRoleItem } from "@/lib/api-services";

export function AdminRolesClient() {
  const [roles, setRoles] = React.useState<AdminRoleItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Permissions directory
  const [allPermissions, setAllPermissions] = React.useState<any[]>([]);
  const [groupedPermissions, setGroupedPermissions] = React.useState<Record<string, any[]>>({});

  // Modals
  const [selectedRole, setSelectedRole] = React.useState<any | null>(null);
  const [permModalOpen, setPermModalOpen] = React.useState(false);
  const [permLoading, setPermLoading] = React.useState(false);

  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({ name: "", description: "" });
  const [createLoading, setCreateLoading] = React.useState(false);

  const fetchRolesAndPermissions = React.useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/permissions"),
      ]);

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      if (rolesRes.ok && rolesData.roles) setRoles(rolesData.roles);
      if (permsRes.ok && permsData.permissions) {
        setAllPermissions(permsData.permissions);
        setGroupedPermissions(permsData.grouped || {});
      }
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to load roles"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  const handleOpenPermModal = async (role: AdminRoleItem) => {
    setPermModalOpen(true);
    setPermLoading(true);
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load role details");
      setSelectedRole(data.role);
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to load role"));
      setPermModalOpen(false);
    } finally {
      setPermLoading(false);
    }
  };

  const handleTogglePermission = async (permId: string, assigned: boolean) => {
    if (!selectedRole) return;
    try {
      if (assigned) {
        // Remove
        const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions/${permId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove permission");
        setSelectedRole({
          ...selectedRole,
          permissions: selectedRole.permissions.filter((p: any) => p.id !== permId),
        });
      } else {
        // Assign
        const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionId: permId }),
        });
        if (!res.ok) throw new Error("Failed to assign permission");
        const permObj = allPermissions.find((p) => p.id === permId);
        if (permObj) {
          setSelectedRole({
            ...selectedRole,
            permissions: [...selectedRole.permissions, permObj],
          });
        }
      }
      notify.success("Role permissions updated");
      fetchRolesAndPermissions();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Permission update failed"));
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create role");

      notify.success(`Role '${createForm.name}' created`);
      setCreateModalOpen(false);
      setCreateForm({ name: "", description: "" });
      fetchRolesAndPermissions();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to create role"));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRole = async (role: AdminRoleItem) => {
    if (!confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete role");

      notify.success(`Role '${role.name}' deleted`);
      fetchRolesAndPermissions();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to delete role"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Roles & Permissions Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage system roles, author custom roles, and configure granular functional permissions across modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRolesAndPermissions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && roles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading roles and permissions...
          </div>
        ) : (
          roles.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground capitalize flex items-center gap-1.5">
                    {r.name.replace("_", " ")}
                  </h3>
                  {r.isSystem ? (
                    <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      System
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Custom</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {r.description || "No description provided."}
                </p>
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span title="Permissions Count">{r.permissionCount} permissions</span>
                  <span>•</span>
                  <span title="Assigned Users Count">{r.userCount} users</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleOpenPermModal(r)}
                  >
                    Permissions
                  </Button>
                  {!r.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteRole(r)}
                      title="Delete Custom Role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Permissions Management Dialog */}
      <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Permissions for {selectedRole?.name?.replace("_", " ")}
            </DialogTitle>
            <DialogDescription>
              Assign or revoke granular system permissions. Updating permissions increments SecurityVersion and revokes active sessions for assigned users.
            </DialogDescription>
          </DialogHeader>

          {permLoading || !selectedRole ? (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-6 py-2">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => {
                      const assigned = selectedRole.permissions?.some((rp: any) => rp.id === p.id || rp.key === p.key);
                      const isSuper = selectedRole.name === "superadmin";

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (!isSuper) handleTogglePermission(p.id, assigned);
                          }}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            assigned
                              ? "bg-primary/5 border-primary/30 text-foreground"
                              : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                          } ${isSuper ? "cursor-not-allowed opacity-80" : ""}`}
                        >
                          <div>
                            <div className="font-medium text-foreground">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{p.key}</div>
                          </div>
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center ${
                              assigned ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                            }`}
                          >
                            {assigned && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <form onSubmit={handleCreateRole}>
            <DialogHeader>
              <DialogTitle>Create Custom Role</DialogTitle>
              <DialogDescription>
                Author a new role. You can assign granular permissions to it immediately after creation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Role Key / Name</label>
                <Input
                  required
                  placeholder="e.g. senior_reviewer, audit_clerk"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                />
                <p className="text-[11px] text-muted-foreground">Lowercase letters, numbers, and underscores only.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Input
                  placeholder="Responsibilities and purpose of this role..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLoading || !createForm.name.trim()}>
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
