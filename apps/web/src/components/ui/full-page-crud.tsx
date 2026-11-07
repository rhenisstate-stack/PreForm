"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Inbox,
  ShieldAlert,
  Archive,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface FullPageBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function FullPageBreadcrumbs({ items, className }: FullPageBreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ) : item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={cn(isLast && "text-foreground font-semibold")}>{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export interface FullPageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function FullPageHeader({
  title,
  description,
  eyebrow,
  badge,
  breadcrumbs,
  backLabel = "Back to list",
  backHref,
  onBack,
  actions,
  className,
}: FullPageHeaderProps) {
  return (
    <div
      className={cn(
        "w-full max-w-none min-w-0 border-b border-border/80 pb-5 space-y-3",
        className
      )}
    >
      {(breadcrumbs?.length || backHref || onBack) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {backHref ? (
              <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 px-2.5 text-xs font-semibold">
                <Link href={backHref}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {backLabel}
                </Link>
              </Button>
            ) : onBack ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </Button>
            ) : null}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <FullPageBreadcrumbs items={breadcrumbs} />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          {eyebrow && (
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <div className="text-sm text-muted-foreground max-w-none">{description}</div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

export interface FullPageCrudLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function FullPageCrudLayout({
  children,
  header,
  footer,
  className,
  "data-testid": dataTestId,
}: FullPageCrudLayoutProps) {
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "w-full max-w-none min-w-0 flex-1 flex flex-col gap-6",
        className
      )}
    >
      {header}
      <div className="w-full max-w-none min-w-0 flex-1 space-y-6">{children}</div>
      {footer}
    </div>
  );
}

export interface FullPageActionBarProps {
  children?: React.ReactNode;
  leftActions?: React.ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
  cancelHref?: string;
  primaryAction?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function FullPageActionBar({
  children,
  leftActions,
  onCancel,
  cancelLabel = "Cancel",
  cancelHref,
  primaryAction,
  sticky = true,
  className,
}: FullPageActionBarProps) {
  return (
    <div
      className={cn(
        "w-full max-w-none min-w-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 backdrop-blur py-4 px-5 rounded-xl shadow-xs",
        sticky && "sticky bottom-0 z-20",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {leftActions}
      </div>
      <div className="flex flex-wrap items-center gap-2.5 ml-auto">
        {cancelHref ? (
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>{cancelLabel}</Link>
          </Button>
        ) : onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        ) : null}
        {children}
        {primaryAction}
      </div>
    </div>
  );
}

export interface FullPageFormLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  onSubmit?: (e: React.FormEvent) => void | Promise<void>;
  submitLabel?: string;
  submitDisabled?: boolean;
  isSubmitting?: boolean;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
  "data-testid"?: string;
}

export function FullPageFormLayout({
  title,
  description,
  subtitle,
  eyebrow,
  badge,
  breadcrumbs,
  backLabel,
  backHref,
  onBack,
  onCancel,
  cancelLabel = "Cancel",
  onSubmit,
  submitLabel = "Save",
  submitDisabled = false,
  isSubmitting = false,
  headerActions,
  footer,
  children,
  className,
  testId,
  "data-testid": dataTestId,
}: FullPageFormLayoutProps) {
  const resolvedDescription = description ?? subtitle;
  const resolvedBack = onBack ?? onCancel;
  const resolvedFooter =
    footer ??
    (onSubmit || onCancel ? (
      <FullPageActionBar
        onCancel={onCancel}
        cancelLabel={cancelLabel}
        primaryAction={
          onSubmit ? (
            <Button
              type="submit"
              disabled={isSubmitting || submitDisabled}
              className="gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          ) : undefined
        }
      />
    ) : undefined);

  const content = (
    <FullPageCrudLayout
      data-testid={dataTestId ?? testId ?? "full-page-form-layout"}
      className={className}
      header={
        <FullPageHeader
          title={title}
          description={resolvedDescription}
          eyebrow={eyebrow}
          badge={badge}
          breadcrumbs={breadcrumbs}
          backLabel={backLabel}
          backHref={backHref}
          onBack={resolvedBack}
          actions={headerActions}
        />
      }
      footer={resolvedFooter}
    >
      <div className="w-full max-w-none min-w-0 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        {children}
      </div>
    </FullPageCrudLayout>
  );

  if (onSubmit) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
        className="w-full max-w-none min-w-0 flex-1 flex flex-col"
      >
        {content}
      </form>
    );
  }

  return content;
}

export interface FullPageDetailsLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
  "data-testid"?: string;
}

export function FullPageDetailsLayout({
  title,
  description,
  subtitle,
  eyebrow,
  badge,
  breadcrumbs,
  backLabel,
  backHref,
  onBack,
  actions,
  footer,
  children,
  className,
  testId,
  "data-testid": dataTestId,
}: FullPageDetailsLayoutProps) {
  return (
    <FullPageCrudLayout
      data-testid={dataTestId ?? testId ?? "full-page-details-layout"}
      className={className}
      header={
        <FullPageHeader
          title={title}
          description={description ?? subtitle}
          eyebrow={eyebrow}
          badge={badge}
          breadcrumbs={breadcrumbs}
          backLabel={backLabel}
          backHref={backHref}
          onBack={onBack}
          actions={actions}
        />
      }
      footer={footer}
    >
      <div className="w-full max-w-none min-w-0 space-y-6">{children}</div>
    </FullPageCrudLayout>
  );
}

export interface FullPageDeleteLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  recordTitle?: React.ReactNode;
  recordSummary?: React.ReactNode;
  recordSubtitle?: React.ReactNode;
  recordMetadata?: Array<{ label: string; value: React.ReactNode }>;
  consequences?: string[];
  dependencyNotice?: React.ReactNode;
  isBlocked?: boolean;
  blockedReason?: React.ReactNode;
  blockReason?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backLabel?: string;
  onBack?: () => void;
  onCancel: () => void;
  onConfirmDelete?: () => void;
  confirmDeleteLabel?: string;
  confirmLabel?: string;
  onArchiveInstead?: () => void;
  archiveInsteadLabel?: string;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  children?: React.ReactNode;
  testId?: string;
  "data-testid"?: string;
}

export function FullPageDeleteLayout({
  title,
  description,
  subtitle,
  recordTitle,
  recordSummary,
  recordSubtitle,
  recordMetadata,
  consequences,
  dependencyNotice,
  isBlocked = false,
  blockedReason,
  blockReason,
  breadcrumbs,
  backLabel = "Return without deleting",
  onBack,
  onCancel,
  onConfirmDelete,
  confirmDeleteLabel,
  confirmLabel,
  onArchiveInstead,
  archiveInsteadLabel = "Archive / Deactivate Instead",
  isSubmitting = false,
  isDeleting = false,
  children,
  testId,
  "data-testid": dataTestId,
}: FullPageDeleteLayoutProps) {
  const resolvedDescription =
    description ??
    subtitle ??
    "Review the record details, dependency impact, and historical-record protections before proceeding.";
  const resolvedBlockedReason = blockedReason ?? blockReason;
  const resolvedConfirmLabel = confirmDeleteLabel ?? confirmLabel ?? "Confirm Delete";
  const resolvedSubmitting = isSubmitting || isDeleting;

  return (
    <FullPageCrudLayout
      data-testid={dataTestId ?? testId ?? "full-page-delete-layout"}
      header={
        <FullPageHeader
          eyebrow="Destructive Operation Review"
          title={title}
          description={resolvedDescription}
          breadcrumbs={breadcrumbs}
          backLabel={backLabel}
          onBack={onBack ?? onCancel}
          badge={
            <Badge
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive font-semibold"
            >
              {isBlocked ? "Protected Record" : "Deletion Confirmation"}
            </Badge>
          }
        />
      }
      footer={
        <FullPageActionBar
          onCancel={onCancel}
          cancelLabel="Cancel"
          primaryAction={
            <div className="flex flex-wrap items-center gap-2.5">
              {onArchiveInstead && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={resolvedSubmitting}
                  onClick={onArchiveInstead}
                  className="gap-1.5"
                >
                  {resolvedSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {archiveInsteadLabel}
                </Button>
              )}
              {!isBlocked && onConfirmDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={resolvedSubmitting}
                  onClick={onConfirmDelete}
                  className="gap-1.5"
                >
                  {resolvedSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {resolvedConfirmLabel}
                </Button>
              )}
            </div>
          }
        />
      }
    >
      <div className="w-full max-w-none min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Target Record
            </p>
            {recordTitle && <h2 className="text-xl font-bold text-foreground">{recordTitle}</h2>}
            {recordSubtitle && (
              <p className="text-sm text-muted-foreground">{recordSubtitle}</p>
            )}
            {recordSummary && <div className="pt-1">{recordSummary}</div>}
          </div>

          {recordMetadata && recordMetadata.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
              {recordMetadata.map((meta, idx) => (
                <div key={`${meta.label}-${idx}`} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{meta.label}</div>
                  <div className="text-sm font-semibold text-foreground">{meta.value}</div>
                </div>
              ))}
            </div>
          )}

          {children}
        </div>

        <div className="lg:col-span-5 space-y-4">
          {isBlocked ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200 font-bold text-base">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>Hard Deletion Blocked by Data-Integrity Policy</span>
              </div>
              <div className="text-sm text-amber-900/90 dark:text-amber-100/90 leading-relaxed">
                {resolvedBlockedReason ||
                  "This record is referenced by historical learner attempts, active curriculum records, or published examination revisions and cannot be permanently deleted."}
              </div>
              {onArchiveInstead && (
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  Use the Archive / Deactivate action below to safely retire this record while preserving historical integrity.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-destructive font-bold text-base">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>Consequences of Deletion</span>
              </div>
              {consequences && consequences.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/90">
                  {consequences.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground/90">
                  This action permanently removes or retires the selected record. Please verify all details before confirming.
                </p>
              )}
            </div>
          )}

          {dependencyNotice && (
            <div className="rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
              {dependencyNotice}
            </div>
          )}
        </div>
      </div>
    </FullPageCrudLayout>
  );
}

export function FullPageLoadingState({
  label = "Loading workspace data...",
}: {
  label?: string;
}) {
  return (
    <div className="w-full max-w-none min-w-0 flex-1 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function FullPageErrorState({
  title = "Unable to load workspace",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="w-full max-w-none min-w-0 flex-1 flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center gap-4">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function FullPageEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-none min-w-0 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center gap-3">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
