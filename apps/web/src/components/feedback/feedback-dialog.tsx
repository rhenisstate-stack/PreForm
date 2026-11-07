"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { feedbackService, LearnerFeedback } from "@/lib/feedback-service";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceId?: string;
  initialCategory?: LearnerFeedback["category"];
  title?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  referenceId,
  initialCategory = "general",
  title = "Submit Clinical Feedback or Report an Issue",
}: FeedbackDialogProps) {
  const { user } = useAuth();
  const [category, setCategory] = React.useState<LearnerFeedback["category"]>(initialCategory);
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<LearnerFeedback["priority"]>("medium");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please provide a subject line.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your feedback or issue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await feedbackService.submitFeedback({
        userId: user?.id,
        userName: user?.displayName || user?.name || "PrepFord Candidate",
        userEmail: user?.email || "candidate@prepford.com",
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        referenceId,
      });

      toast.success("Feedback submitted successfully. Our clinical faculty and technical team review submissions daily.");
      // Reset form
      setSubject("");
      setDescription("");
      setPriority("medium");
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Help us improve PrepFord NCLEX. Submit question challenges, curriculum suggestions, or technical bugs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {referenceId && (
            <div className="p-2.5 rounded-md bg-muted/40 border text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Referenced Item ID:</span>
              <span className="font-mono font-semibold text-foreground">{referenceId}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fb-category" className="text-xs font-semibold">
                Feedback Category
              </Label>
              <select
                id="fb-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as LearnerFeedback["category"])}
                className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
              >
                <option value="question_issue">Question / Rationale Issue</option>
                <option value="content_suggestion">Study Guide Suggestion</option>
                <option value="technical_bug">Technical Bug</option>
                <option value="general">General Feedback</option>
              </select>
            </div>

            <div>
              <Label htmlFor="fb-priority" className="text-xs font-semibold">
                Priority
              </Label>
              <select
                id="fb-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as LearnerFeedback["priority"])}
                className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
              >
                <option value="low">Low (Minor typo)</option>
                <option value="medium">Medium (Standard suggestion)</option>
                <option value="high">High (Clinical inaccuracy)</option>
                <option value="urgent">Urgent (Exam blocking issue)</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="fb-subject" className="text-xs font-semibold">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fb-subject"
              placeholder="e.g. Discrepancy in Heparin calculation rationale"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fb-description" className="text-xs font-semibold">
              Detailed Description <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="fb-description"
              rows={4}
              placeholder="Please provide details, textbook citations, or steps to reproduce the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full mt-1 p-2.5 text-xs rounded-md border border-input bg-background"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
