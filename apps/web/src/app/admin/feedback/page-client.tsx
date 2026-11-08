"use client";

import * as React from "react";
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Edit2,
  ExternalLink,
  User,
  Tag,
  ShieldCheck,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { feedbackService, LearnerFeedback } from "@/lib/feedback-service";
import { notify as toast } from "@/lib/notifications";
import { useAuth } from "@/lib/auth-context";

export function AdminFeedbackClient() {
  const { user } = useAuth();
  const [feedbackList, setFeedbackList] = React.useState<LearnerFeedback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  // Moderation Dialog
  const [selectedItem, setSelectedItem] = React.useState<LearnerFeedback | null>(null);
  const [modStatus, setModStatus] = React.useState<LearnerFeedback["status"]>("new");
  const [modNotes, setModNotes] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchFeedback = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await feedbackService.getFeedback({
        search,
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
      });
      setFeedbackList(data);
    } catch {
      toast.error("Failed to load learner feedback");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, priorityFilter]);

  React.useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // KPI Calculations
  const totalItems = feedbackList.length;
  const newCount = feedbackList.filter((f) => f.status === "new").length;
  const inReviewCount = feedbackList.filter((f) => f.status === "in_review").length;
  const resolvedCount = feedbackList.filter((f) => f.status === "resolved").length;

  const handleOpenModerate = (item: LearnerFeedback) => {
    setSelectedItem(item);
    setModStatus(item.status);
    setModNotes(item.adminNotes || "");
  };

  const handleSaveModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsUpdating(true);
    try {
      await feedbackService.updateFeedback(selectedItem.id, {
        status: modStatus,
        adminNotes: modNotes.trim() || undefined,
        resolvedBy: user?.email || "admin@prepford.com",
      });

      toast.success(`Feedback #${selectedItem.id.substring(0, 8)} status updated to ${modStatus.toUpperCase()}.`);
      setSelectedItem(null);
      fetchFeedback();
    } catch {
      toast.error("Failed to update feedback status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-600" />
            Feedback & Clinical Issue Moderation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and resolve candidate question challenges, study guide suggestions, and technical bug reports.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Submissions
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalItems}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                New / Unassigned
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">{newCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                In Review
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{inReviewCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Resolved
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/60">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search by subject, description, or submitter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background hidden sm:block"
          >
            <option value="all">All Categories</option>
            <option value="question_issue">Question Issue</option>
            <option value="content_suggestion">Study Guide Suggestion</option>
            <option value="technical_bug">Technical Bug</option>
            <option value="general">General</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background hidden md:block"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Feedback Table */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading feedback submissions...
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-lg border-border/70 p-8">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No feedback submissions found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or status filter.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Subject & Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {feedbackList.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-semibold text-foreground text-sm line-clamp-1">
                        {item.subject}
                      </p>
                      <p className="text-muted-foreground text-[11px] line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                      {item.referenceId && (
                        <p className="text-[10px] text-teal-600 font-mono mt-0.5">
                          Ref: {item.referenceId}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {item.category.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-semibold ${
                          item.priority === "urgent"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            : item.priority === "high"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <p className="font-medium text-foreground">{item.userName}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-xs">{item.userEmail}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          item.status === "resolved"
                            ? "default"
                            : item.status === "in_review"
                            ? "secondary"
                            : "outline"
                        }
                        className={`text-[10px] uppercase ${
                          item.status === "resolved"
                            ? "bg-emerald-600 text-white"
                            : item.status === "in_review"
                            ? "bg-amber-600 text-white"
                            : item.status === "new"
                            ? "border-red-500 text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-teal-600 hover:text-teal-700"
                        onClick={() => handleOpenModerate(item)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Moderate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Moderation Drawer / Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Moderate Learner Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review candidate findings, update resolution status, and add faculty internal notes.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <form onSubmit={handleSaveModeration} className="space-y-4 py-2">
              {/* Submission Details Card */}
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">{selectedItem.subject}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {selectedItem.category.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">{selectedItem.description}</p>
                <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                  <span>
                    By <strong className="text-foreground">{selectedItem.userName}</strong> ({selectedItem.userEmail})
                  </span>
                  <span>{new Date(selectedItem.createdAt).toLocaleString()}</span>
                </div>
                {selectedItem.referenceId && (
                  <p className="text-[11px] text-teal-600 font-mono">
                    Referenced Entity: {selectedItem.referenceId}
                  </p>
                )}
              </div>

              {/* Moderation Controls */}
              <div>
                <Label htmlFor="mod-status" className="text-xs font-semibold">
                  Resolution Status
                </Label>
                <select
                  id="mod-status"
                  value={modStatus}
                  onChange={(e) => setModStatus(e.target.value as LearnerFeedback["status"])}
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="new">New / Unassigned</option>
                  <option value="in_review">In Review (Investigating)</option>
                  <option value="resolved">Resolved (Fix Deployed)</option>
                  <option value="closed">Closed (No Action Required)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="mod-notes" className="text-xs font-semibold">
                  Internal Resolution Notes & Audit Action
                </Label>
                <textarea
                  id="mod-notes"
                  rows={3}
                  value={modNotes}
                  onChange={(e) => setModNotes(e.target.value)}
                  placeholder="Describe corrective actions taken (e.g. rationale revised, distractor updated in Q-CARDIO-01)..."
                  className="w-full mt-1 p-2 text-xs rounded-md border border-input bg-background"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isUpdating ? "Saving..." : "Save Resolution"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
