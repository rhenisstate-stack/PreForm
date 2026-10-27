import { z } from "zod";

export const CONTACT_CATEGORIES = [
  { value: "general", label: "General enquiry" },
  { value: "account", label: "Account and access" },
  { value: "billing", label: "Subscription and payment" },
  { value: "technical", label: "Technical support" },
  { value: "nclex_rn", label: "NCLEX-RN learning pathway" },
  { value: "nclex_pn", label: "NCLEX-PN learning pathway" },
  { value: "educator", label: "Educator or institutional enquiry" },
] as const;

export const contactCategoriesValues = [
  "general",
  "account",
  "billing",
  "technical",
  "nclex_rn",
  "nclex_pn",
  "educator",
] as const;

export type ContactCategory = (typeof contactCategoriesValues)[number];

export const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address")
    .max(255, "Email address cannot exceed 255 characters"),
  category: z.enum(contactCategoriesValues, {
    errorMap: () => ({ message: "Please select an enquiry category" }),
  }),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(150, "Subject cannot exceed 150 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(3000, "Message cannot exceed 3000 characters"),
  // Honeypot field for bot spam protection; must remain empty
  hp_website: z.string().max(0, "Bot submission detected").optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
