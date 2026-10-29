import { test, expect } from "@playwright/test";
import { generateTestStudent, registerStudentUI } from "./helpers/test-fixtures";

test.describe("Profile & Account Security", () => {
  test("student can update allowed profile fields and changes persist", async ({ page }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);

    const updatedDisplayName = `${student.fullName} (Updated)`;

    // Update profile via API using the authenticated student session
    const updateRes = await page.request.put("/api/profile", {
      data: {
        displayName: updatedDisplayName,
        targetExamDate: "2026-12-31",
        studyReminders: false,
      },
    });

    expect(updateRes.ok()).toBeTruthy();

    // Verify changes persist after reload
    await page.reload();
    const getRes = await page.request.get("/api/profile");
    expect(getRes.ok()).toBeTruthy();
    const data = await getRes.json();
    expect(data.profile.displayName).toBe(updatedDisplayName);
    expect(data.profile.targetExamDate).toBe("2026-12-31");
    expect(data.profile.studyReminders).toBe(false);
  });

  test("profile update rejects tampering with role, pathway, and active plan", async ({
    page,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    const tamperRes = await page.request.put("/api/profile", {
      data: {
        role: "admin",
        activePlan: "NCLEX-RN & PN All-Access",
        pathway: "both",
      },
    });

    expect(tamperRes.status()).toBe(403);
  });

  test("image upload enforces valid magic bytes and rejects executable SVG/HTML payloads", async ({
    page,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    // 1. Upload valid 1x1 PNG image
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);

    const uploadRes = await page.request.put("/api/profile/image", {
      data: validPngBuffer,
      headers: { "Content-Type": "image/png" },
    });
    expect([200, 204]).toContain(uploadRes.status());

    // 2. Reject malicious SVG/HTML script
    const maliciousPayload = Buffer.from("<svg onload='alert(1)'></svg>");
    const badUploadRes = await page.request.put("/api/profile/image", {
      data: maliciousPayload,
      headers: { "Content-Type": "image/svg+xml" },
    });
    expect([400, 415]).toContain(badUploadRes.status());

    // 3. Delete profile image
    const deleteRes = await page.request.delete("/api/profile/image");
    expect([200, 204]).toContain(deleteRes.status());
  });
});
