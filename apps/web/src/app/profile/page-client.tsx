"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
  KeyRound,
  Camera,
  Upload,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { useAuth } from "@/lib/auth-context";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, logout, refreshSession } = useAuth();

  const [activeTab, setActiveTab] = React.useState<"personal" | "subscriptions" | "security" | "preferences">("personal");

  // Personal details state
  const [displayName, setDisplayName] = React.useState("");
  const [pathway, setPathway] = React.useState<"rn" | "pn" | "both">("rn");
  const [targetExamDate, setTargetExamDate] = React.useState("2026-11-30");
  const [activePlan, setActivePlan] = React.useState<string>("");
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileMessage, setProfileMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile image upload & preview state
  const [savedPictureUrl, setSavedPictureUrl] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [imageUploading, setImageUploading] = React.useState(false);
  const [imageRemoving, setImageRemoving] = React.useState(false);
  const [imageStatus, setImageStatus] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Security / Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preferences state
  const [studyReminders, setStudyReminders] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [prefSaving, setPrefSaving] = React.useState(false);

  // Enrollment notification banner
  const justEnrolled = searchParams.get("enrolled") === "true";

  // Initialize from user session
  React.useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(user.displayName || user.name || "");
      setPathway(user.pathway || "rn");
      if (user.picture) {
        setSavedPictureUrl(user.picture);
      }
    }
  }, [user]);

  // Load existing profile from API
  React.useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) {
            setDisplayName(data.profile.displayName || data.profile.name || "");
            setPathway(data.profile.pathway || "rn");
            if (data.profile.targetExamDate) setTargetExamDate(data.profile.targetExamDate);
            if (data.profile.activePlan) setActivePlan(data.profile.activePlan);
            if (data.profile.studyReminders !== undefined) setStudyReminders(data.profile.studyReminders);
            if (data.profile.emailNotifications !== undefined) setEmailNotifications(data.profile.emailNotifications);
            setSavedPictureUrl(data.profile.picture || null);
          }
        })
        .catch((err) => console.error("Error fetching candidate profile:", err));
    }
  }, [isAuthenticated]);

  // Clean up object URL when preview changes
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_MIMES.includes(file.type)) {
      setImageStatus({
        type: "error",
        text: "Unsupported file format. Please choose a PNG, JPEG, WebP, or GIF image.",
      });
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setImageStatus({
        type: "error",
        text: "Selected image exceeds the 2 MB size limit. Please choose a smaller image.",
      });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;
    setImageUploading(true);
    setImageStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/profile/image", {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const newUrl = data.picture || data.image?.url || `/api/profile/image?v=${Date.now()}`;
        setSavedPictureUrl(newUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setImageStatus({
          type: "success",
          text: "Profile photo uploaded and saved to your account.",
        });
        await refreshSession();
      } else {
        setImageStatus({
          type: "error",
          text: data.error || "Failed to upload profile photo.",
        });
      }
    } catch {
      setImageStatus({
        type: "error",
        text: "Network error occurred while uploading your profile photo.",
      });
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setImageRemoving(true);
    setImageStatus(null);

    try {
      const res = await fetch("/api/profile/image", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedPictureUrl(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setImageStatus({
          type: "success",
          text: "Profile photo removed.",
        });
        await refreshSession();
      } else {
        setImageStatus({
          type: "error",
          text: data.error || "Unable to remove profile photo.",
        });
      }
    } catch {
      setImageStatus({
        type: "error",
        text: "An unexpected error occurred while removing your profile photo.",
      });
    } finally {
      setImageRemoving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, pathway, targetExamDate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileMessage({ type: "success", text: "Profile details updated successfully." });
        await refreshSession();
      } else {
        setProfileMessage({ type: "error", text: data.error || "Failed to update profile." });
      }
    } catch {
      setProfileMessage({ type: "error", text: "An unexpected error occurred while saving." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMessage({ type: "success", text: "Password updated successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Failed to update password." });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "An unexpected error occurred while updating password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyReminders, emailNotifications }),
      });
      setProfileMessage({ type: "success", text: "Notification preferences saved." });
    } catch {
      setProfileMessage({ type: "error", text: "Failed to update preferences." });
    } finally {
      setPrefSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Checking authentication session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary mb-4">
            <Lock className="h-7 w-7 text-secondary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Sign In Required</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Please sign in to your PrepFord account to manage your profile, exam pathway, active subscriptions, and study tools.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Link href="/sign-in?from=/profile">
                Sign In to Candidate Profile
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/sign-up?from=/profile">
                Create a Free Account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userInitial = (displayName || user.name || "C").charAt(0).toUpperCase();
  const activeAvatarSrc = previewUrl || savedPictureUrl || null;

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Enrolled Alert Banner */}
        {justEnrolled && (
          <div className="rounded-xl bg-green-500/10 p-4 text-green-900 dark:text-green-100 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Study Access Activated Successfully!</p>
              <p className="text-xs text-green-800 dark:text-green-200 mt-0.5">
                Your NCLEX preparation entitlement is now active on your account. You have full access to practice questions, readiness assessments, Study Guide notes, and clinical rationales.
              </p>
            </div>
          </div>
        )}

        {/* Candidate Profile Header Banner (Archer Review inspired, seamless surface) */}
        <div className="relative overflow-hidden rounded-2xl bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-full bg-secondary text-secondary-foreground font-serif font-bold text-2xl sm:text-3xl shadow-inner ring-2 ring-secondary/30">
                  {activeAvatarSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeAvatarSrc}
                      alt={`${displayName || user.name} profile picture`}
                      data-testid="profile-avatar-image"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span data-testid="profile-avatar-initial">{userInitial}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:scale-105"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
                    {displayName || user.displayName || user.name}
                  </h1>
                  <Badge variant="secondary" className="text-xs font-semibold uppercase">
                    {pathway === "both" ? "NCLEX-RN & PN Dual Pathway" : `NCLEX-${pathway.toUpperCase()} Candidate`}
                  </Badge>
                  {user.role === "superadmin" && (
                    <Badge className="bg-purple-600 text-white font-mono text-[11px] gap-1 px-2.5 py-0.5 shadow-2xs">
                      <ShieldAlert className="h-3 w-3" /> Super Admin
                    </Badge>
                  )}
                  {user.role === "admin" && (
                    <Badge className="bg-indigo-600 text-white font-mono text-[11px] gap-1 px-2.5 py-0.5 shadow-2xs">
                      <ShieldCheck className="h-3 w-3" /> Administrator
                    </Badge>
                  )}
                  {user.role === "instructor" && (
                    <Badge className="bg-sky-600 text-white font-mono text-[11px] gap-1 px-2.5 py-0.5 shadow-2xs">
                      <GraduationCap className="h-3 w-3" /> Nursing Faculty
                    </Badge>
                  )}
                  {user.provider === "google" && (
                    <Badge variant="outline" className="text-[11px] font-medium border-secondary/40 text-secondary">
                      Google Account
                    </Badge>
                  )}
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20"
                    title="Persistent session active across browser restarts"
                  >
                    <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Durable Session Active</span>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Target Exam Date: <span className="font-semibold text-foreground">{targetExamDate}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm">
                <Link href="/courses">
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  Launch Study Portal
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-destructive hover:bg-destructive/10"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex overflow-x-auto gap-2 bg-muted/40 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`py-2 px-4 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "personal"
                  ? "bg-card text-secondary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Personal Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("subscriptions")}
              className={`py-2 px-4 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "subscriptions"
                  ? "bg-card text-secondary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Subscriptions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`py-2 px-4 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-card text-secondary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Account Security
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preferences")}
              className={`py-2 px-4 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "preferences"
                  ? "bg-card text-secondary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Preferences
            </button>
          </div>
        </div>

        {/* Tab 1: Personal Details & Profile Image Upload */}
        {activeTab === "personal" && (
          <div className="rounded-2xl bg-card p-6 sm:p-8 shadow-xs space-y-8">
            <div>
              <h2 className="text-xl font-serif font-semibold text-foreground">Personal & Licensure Details</h2>
              <p className="text-muted-foreground text-xs mt-1">
                Manage your candidate profile photo, display name, email address, and licensure exam track.
              </p>
            </div>

            {/* Seamless Profile Image Upload Section */}
            <div className="rounded-xl bg-muted/35 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-secondary-foreground font-serif font-bold text-xl shrink-0 ring-2 ring-secondary/25">
                    {activeAvatarSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeAvatarSrc}
                        alt="Selected or current profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Candidate Profile Photo</h3>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PNG, JPEG, WebP, or GIF (maximum 2 MB). Persisted securely in your account database.
                    </p>
                    {selectedFile && (
                      <p className="text-xs font-medium text-secondary" data-testid="profile-image-preview-notice">
                        Previewing selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB) — click &ldquo;Upload &amp; Save Photo&rdquo; to persist.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    ref={fileInputRef}
                    id="profile-image-input"
                    data-testid="profile-image-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="sr-only"
                    aria-label="Select profile photo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading || imageRemoving}
                  >
                    <Camera className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {savedPictureUrl || selectedFile ? "Choose Different Photo" : "Select Photo"}
                  </Button>

                  {selectedFile && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUploadImage}
                        disabled={imageUploading}
                        data-testid="upload-profile-image-btn"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        {imageUploading ? "Uploading..." : "Upload & Save Photo"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelPreview}
                        disabled={imageUploading}
                      >
                        <X className="mr-1 h-4 w-4" aria-hidden="true" />
                        Cancel
                      </Button>
                    </>
                  )}

                  {savedPictureUrl && !selectedFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={imageRemoving || imageUploading}
                      data-testid="remove-profile-image-btn"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {imageRemoving ? "Removing..." : "Remove Photo"}
                    </Button>
                  )}
                </div>
              </div>

              {imageStatus && (
                <div
                  role={imageStatus.type === "error" ? "alert" : "status"}
                  data-testid="profile-image-status"
                  className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    imageStatus.type === "success"
                      ? "bg-green-500/10 text-green-700 dark:text-green-300"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {imageStatus.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{imageStatus.text}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
              {profileMessage && (
                <div
                  className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 ${
                    profileMessage.type === "success"
                      ? "bg-green-500/10 text-green-700 dark:text-green-300"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {profileMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="display-name" className="text-xs font-semibold text-foreground">
                  Full Name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-email" className="text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded-md border border-border bg-muted/60 px-3.5 py-2 text-sm text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Email is associated with your primary authentication provider.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Target Licensure Examination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPathway("rn")}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition-all ${
                      pathway === "rn"
                        ? "border-secondary bg-secondary/10 text-foreground ring-1 ring-secondary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="font-serif font-bold text-base">NCLEX-RN</span>
                    <span className="text-[11px] mt-0.5">Registered Nurse</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPathway("pn")}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition-all ${
                      pathway === "pn"
                        ? "border-secondary bg-secondary/10 text-foreground ring-1 ring-secondary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="font-serif font-bold text-base">NCLEX-PN</span>
                    <span className="text-[11px] mt-0.5">Practical / Vocational Nurse</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPathway("both")}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition-all ${
                      pathway === "both"
                        ? "border-secondary bg-secondary/10 text-foreground ring-1 ring-secondary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="font-serif font-bold text-base">RN &amp; PN Dual</span>
                    <span className="text-[11px] mt-0.5">All-Access Licensure</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="target-date" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-secondary" />
                  Target Exam Date
                </label>
                <input
                  id="target-date"
                  type="date"
                  value={targetExamDate}
                  onChange={(e) => setTargetExamDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Used to calculate your daily question targets and CAT readiness milestones.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                >
                  {profileSaving ? "Saving..." : "Save Profile Details"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Active Subscriptions */}
        {activeTab === "subscriptions" && (
          <div className="rounded-2xl bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground">Active Study Subscription</h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Your current licensure preparation entitlement.
                </p>
              </div>
              <Badge className="bg-green-600 text-white font-semibold self-start sm:self-center">
                Active & Verified
              </Badge>
            </div>

            <div className="rounded-xl bg-secondary/5 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-foreground">
                    {activePlan || (pathway === "both" ? "NCLEX-RN & PN All-Access Preparation Plan" : `NCLEX-${pathway.toUpperCase()} Complete Preparation Plan`)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Access Window: Valid until <span className="font-semibold text-foreground">December 31, 2026</span>
                  </p>
                </div>
                <div className="text-sm font-semibold text-secondary">
                  Active Entitlement
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold text-foreground mb-2">Entitlement Includes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>Original NCLEX-{pathway === "both" ? "RN & PN" : pathway.toUpperCase()} question bank</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>Timed &amp; untimed readiness assessments</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>Unfolding clinical case studies</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>Pharmacology &amp; Physiological Adaptation review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>Comprehensive Study Guide library</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>Detailed option-by-option rationales</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                <Link href="/courses">
                  Launch Question Practice
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/subscriptions">
                  Upgrade or Change Plan
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Account Security */}
        {activeTab === "security" && (
          <div className="rounded-2xl bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-serif font-semibold text-foreground">Password & Account Security</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Ensure your candidate account is protected with a strong, distinct password.
              </p>
            </div>

            {user.provider === "google" ? (
              <div className="rounded-xl bg-muted/50 p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-secondary" />
                  <h3 className="font-semibold text-foreground text-sm">Google Authentication Connected</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You signed in using Google OAuth. Password changes, multi-factor authentication, and security recovery are securely managed through your Google Account.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-xl">
                {passwordMessage && (
                  <div
                    className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 ${
                      passwordMessage.type === "success"
                        ? "bg-green-500/10 text-green-700 dark:text-green-300"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {passwordMessage.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="curr-pass" className="text-xs font-semibold text-foreground">
                    Current Password
                  </label>
                  <input
                    id="curr-pass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-pass" className="text-xs font-semibold text-foreground">
                    New Password
                  </label>
                  <input
                    id="new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className="w-full rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                  {newPassword && (
                    <div className="mt-2">
                      <PasswordStrengthIndicator password={newPassword} />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="conf-pass" className="text-xs font-semibold text-foreground">
                    Confirm New Password
                  </label>
                  <input
                    id="conf-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={passwordSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                  >
                    {passwordSaving ? "Updating Password..." : "Update Password"}
                  </Button>
                </div>
              </form>
            )}

            {/* Session Persistence & Security Policy */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-secondary shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">Session Security & Persistence Architecture</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Durable Persistent Session
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Login sessions remain authenticated across browser restarts until you explicitly sign out or rotate credentials.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-secondary" />
                    Server-Authoritative RBAC
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Role permissions (<span className="font-mono text-secondary font-medium">{user.role}</span>) are authoritative and enforced strictly by PostgreSQL and ASP.NET Core policies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Preferences */}
        {activeTab === "preferences" && (
          <div className="rounded-2xl bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-serif font-semibold text-foreground">Study & Communication Preferences</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                Control reminders, daily question targets, and platform update notifications.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-foreground">Daily Study Reminders</span>
                  <p className="text-xs text-muted-foreground">Receive daily prompts to complete your target question quota.</p>
                </div>
                <input
                  type="checkbox"
                  checked={studyReminders}
                  onChange={(e) => setStudyReminders(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-foreground">Clinical & NGN Release Alerts</span>
                  <p className="text-xs text-muted-foreground">Notified when new unfolding case studies or pharmacology packs are published.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSavePreferences}
                  disabled={prefSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                >
                  {prefSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
