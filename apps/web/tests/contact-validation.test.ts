import { describe, it, expect } from "vitest";
import { contactSchema, contactCategoriesValues } from "@/lib/validation/contact";

describe("Contact Form Validation Schema", () => {
  const validContact = {
    fullName: "Jordan Taylor",
    email: "jordan.taylor@example.com",
    category: "nclex_rn" as const,
    subject: "Question about readiness assessment scoring",
    message: "Could you clarify how topic-level mastery is calculated on the RN readiness exams?",
    hp_website: "",
  };

  it("accepts valid contact submission data", () => {
    const result = contactSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it("rejects missing or invalid email address", () => {
    const invalidEmail = contactSchema.safeParse({ ...validContact, email: "not-an-email" });
    expect(invalidEmail.success).toBe(false);
    if (!invalidEmail.success) {
      expect(invalidEmail.error.flatten().fieldErrors.email).toBeDefined();
    }

    const emptyEmail = contactSchema.safeParse({ ...validContact, email: "" });
    expect(emptyEmail.success).toBe(false);
  });

  it("enforces full name length limits (min 2, max 100)", () => {
    const tooShort = contactSchema.safeParse({ ...validContact, fullName: "J" });
    expect(tooShort.success).toBe(false);

    const tooLong = contactSchema.safeParse({ ...validContact, fullName: "A".repeat(101) });
    expect(tooLong.success).toBe(false);
  });

  it("enforces subject length limits (min 3, max 150)", () => {
    const tooShort = contactSchema.safeParse({ ...validContact, subject: "Hi" });
    expect(tooShort.success).toBe(false);

    const tooLong = contactSchema.safeParse({ ...validContact, subject: "A".repeat(151) });
    expect(tooLong.success).toBe(false);
  });

  it("enforces message length limits (min 10, max 3000)", () => {
    const tooShort = contactSchema.safeParse({ ...validContact, message: "Too short" });
    expect(tooShort.success).toBe(false);

    const tooLong = contactSchema.safeParse({ ...validContact, message: "A".repeat(3001) });
    expect(tooLong.success).toBe(false);
  });

  it("validates all supported category enums", () => {
    for (const cat of contactCategoriesValues) {
      const result = contactSchema.safeParse({ ...validContact, category: cat });
      expect(result.success).toBe(true);
    }

    // Invalid category
    const invalidCat = contactSchema.safeParse({ ...validContact, category: "unsupported_cat" });
    expect(invalidCat.success).toBe(false);
  });

  it("detects bot activity and rejects submission when honeypot field is populated", () => {
    const botSubmission = contactSchema.safeParse({
      ...validContact,
      hp_website: "http://spam-link.example.com",
    });
    expect(botSubmission.success).toBe(false);
    if (!botSubmission.success) {
      expect(botSubmission.error.flatten().fieldErrors.hp_website).toBeDefined();
    }
  });
});
