"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactSchema,
  CONTACT_CATEGORIES,
  type ContactInput,
} from "@/lib/validation/contact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HelpCircle,
  Shield,
  BookOpen,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";

interface SubmissionSuccess {
  ticketId: string;
  message: string;
  category: string;
  receivedAt: string;
}

export function ContactPageClient() {
  const [submissionSuccess, setSubmissionSuccess] = React.useState<SubmissionSuccess | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema as unknown as Parameters<typeof zodResolver>[0]),
    defaultValues: {
      fullName: "",
      email: "",
      category: "general",
      subject: "",
      message: "",
      hp_website: "",
    },
    mode: "onTouched",
  });

  const messageText = watch("message") || "";

  const onSubmit = async (data: ContactInput) => {
    setServerError(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to deliver your message. Please try again.");
      }

      setSubmissionSuccess({
        ticketId: result.ticketId,
        message: result.message,
        category: result.details?.category || data.category,
        receivedAt: result.details?.receivedAt || new Date().toISOString(),
      });
      notify.success("Your message has been sent successfully. A support ticket has been created.");
      reset();
    } catch (err: unknown) {
      const cleanError = sanitizeErrorMessage(
        err instanceof Error ? err.message : null,
        "Unable to submit message at this time. Please try again."
      );
      setServerError(cleanError);
      notify.error(cleanError);
    }
  };

  return (
    <div className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Breadcrumb & Hero Header */}
      <section className="border-b border-border bg-card/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground" aria-current="page">
                Contact Us
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Support &amp; Inquiries
            </span>
            <h1 className="mt-2 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              We&rsquo;re Here to Help
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Have questions about our NCLEX-RN or NCLEX-PN pathways, technical support, or institutional access?
              Reach out to our team and we will respond promptly.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area: Help Cards + Form */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Quick Help Channels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="flex flex-col justify-between hover:border-secondary/50 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary mb-3">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-serif">Candidate &amp; Exam FAQs</CardTitle>
                <CardDescription>
                  Find instant answers to questions regarding NCLEX question banks, scoring rationales, and exam prep tips.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline"
                >
                  Browse Knowledge Base <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between hover:border-secondary/50 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary mb-3">
                  <Shield className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-serif">Account &amp; Portal Access</CardTitle>
                <CardDescription>
                  Need help logging in, updating your study pathway, or accessing previously saved assessments?
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline"
                >
                  Go to Student Login <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between hover:border-secondary/50 transition-colors">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary mb-3">
                  <BookOpen className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-serif">Nursing Faculty &amp; Schools</CardTitle>
                <CardDescription>
                  Looking to incorporate PrepFord NCLEX diagnostic modules and analytics into your nursing curriculum?
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link
                  href="/educators"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline"
                >
                  View Educator Features <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Form & Support Details Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Form or Success Card */}
            <div className="lg:col-span-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-serif">Send Us a Direct Message</CardTitle>
                  <CardDescription>
                    Fill out the form below. Please provide clear details so we can connect you with the appropriate educator or technical specialist.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submissionSuccess ? (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/30 p-6 sm:p-8 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-300">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-serif font-semibold text-teal-950 dark:text-teal-100">
                        Message Successfully Sent
                      </h3>
                      <p className="text-sm text-teal-800 dark:text-teal-200 max-w-lg mx-auto">
                        {submissionSuccess.message}
                      </p>

                      <div className="inline-block rounded-md bg-white dark:bg-card px-4 py-3 border border-teal-200 dark:border-teal-800 text-xs font-mono text-foreground text-left space-y-1">
                        <div>
                          <span className="text-muted-foreground font-sans font-medium">Ticket Reference: </span>
                          <strong className="text-secondary">{submissionSuccess.ticketId}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-sans font-medium">Enquiry Category: </span>
                          <span className="capitalize">{submissionSuccess.category.replace("_", "-")}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setSubmissionSuccess(null)}
                          className="text-sm"
                        >
                          Submit another message
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                      {/* Server Error Alert */}
                      {serverError && (
                        <div
                          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
                          role="alert"
                          aria-live="assertive"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <p>{serverError}</p>
                          </div>
                        </div>
                      )}

                      {/* Honeypot field (hidden from genuine users) */}
                      <div className="hidden" aria-hidden="true">
                        <label htmlFor="hp_website">Leave this field blank</label>
                        <input
                          id="hp_website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          {...register("hp_website")}
                        />
                      </div>

                      {/* Category Selection */}
                      <div className="space-y-2">
                        <label htmlFor="category" className="text-sm font-medium text-foreground">
                          What can we help you with? <span className="text-destructive">*</span>
                        </label>
                        <select
                          id="category"
                          aria-invalid={errors.category ? "true" : "false"}
                          aria-describedby={errors.category ? "category-error" : undefined}
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...register("category")}
                        >
                          {CONTACT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        {errors.category && (
                          <p id="category-error" className="text-xs text-destructive">
                            {errors.category.message}
                          </p>
                        )}
                      </div>

                      {/* Name & Email Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                            Full name <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="fullName"
                            type="text"
                            placeholder="e.g. Alex Morgan"
                            aria-invalid={errors.fullName ? "true" : "false"}
                            aria-describedby={errors.fullName ? "fullName-error" : undefined}
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            {...register("fullName")}
                          />
                          {errors.fullName && (
                            <p id="fullName-error" className="text-xs text-destructive">
                              {errors.fullName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-medium text-foreground">
                            Email address <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="email"
                            type="email"
                            placeholder="alex.morgan@example.com"
                            aria-invalid={errors.email ? "true" : "false"}
                            aria-describedby={errors.email ? "email-error" : undefined}
                            className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            {...register("email")}
                          />
                          {errors.email && (
                            <p id="email-error" className="text-xs text-destructive">
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="space-y-2">
                        <label htmlFor="subject" className="text-sm font-medium text-foreground">
                          Subject <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="subject"
                          type="text"
                          placeholder="Brief summary of your question"
                          aria-invalid={errors.subject ? "true" : "false"}
                          aria-describedby={errors.subject ? "subject-error" : undefined}
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          {...register("subject")}
                        />
                        {errors.subject && (
                          <p id="subject-error" className="text-xs text-destructive">
                            {errors.subject.message}
                          </p>
                        )}
                      </div>

                      {/* Message Textarea with counter */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="message" className="text-sm font-medium text-foreground">
                            Message <span className="text-destructive">*</span>
                          </label>
                          <span className="text-[11px] text-muted-foreground">
                            {messageText.length} / 3000 characters
                          </span>
                        </div>
                        <textarea
                          id="message"
                          rows={6}
                          placeholder="Please provide any details, exam date, pathway, or specific issues you are encountering…"
                          aria-invalid={errors.message ? "true" : "false"}
                          aria-describedby={errors.message ? "message-error" : undefined}
                          className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                          {...register("message")}
                        />
                        {errors.message && (
                          <p id="message-error" className="text-xs text-destructive">
                            {errors.message.message}
                          </p>
                        )}
                      </div>

                      {/* Submission button */}
                      <div>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full sm:w-auto min-w-[180px]"
                        >
                          {isSubmitting ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                              Sending message…
                            </span>
                          ) : (
                            "Send Message"
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Information & Commitments */}
            <div className="lg:col-span-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-secondary">
                    <Clock className="h-5 w-5" />
                    <CardTitle className="text-base font-serif">Support Hours &amp; Response</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Our candidate support team reviews inquiries Monday through Friday, 8:00 AM – 6:00 PM EST.
                  </p>
                  <p>
                    Standard response time is within <strong className="text-foreground">24 to 48 hours</strong>.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-secondary">
                    <Mail className="h-5 w-5" />
                    <CardTitle className="text-base font-serif">Official Channels</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">General Support:</span>
                    <p className="font-mono text-xs text-secondary mt-0.5">support@prepford.com</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Institutional Partnerships:</span>
                    <p className="font-mono text-xs text-secondary mt-0.5">educators@prepford.com</p>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-lg border border-border bg-muted/40 p-5 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-1">NCLEX® Candidate Disclaimer</p>
                <p>
                  PrepFord NCLEX is an independent test preparation platform. NCLEX-RN® and NCLEX-PN® are registered
                  trademarks of the National Council of State Boards of Nursing, Inc. (NCSBN). PrepFord NCLEX is not
                  affiliated with or endorsed by NCSBN.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
