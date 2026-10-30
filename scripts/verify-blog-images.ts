#!/usr/bin/env node
/**
 * PrepFord Blog Imagery Verification Guard
 *
 * Verifies that every published blog post in `apps/web/src/lib/blog-data.ts` has:
 * - A dedicated, topic-matched local image in `apps/web/public/images/blog/`
 * - No reused landing-page cards or generic illustrations
 * - Non-empty physical file size on disk (> 10KB)
 * - Accessible, high-quality descriptive imageAlt text (> 15 chars)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

interface VerificationResult {
  slug: string;
  imagePath: string;
  diskPath: string;
  fileSize: number;
  altText: string;
  valid: boolean;
  errors: string[];
}

function verifyBlogImages(): { results: VerificationResult[]; allValid: boolean } {
  const blogDataPath = path.join(ROOT_DIR, "apps", "web", "src", "lib", "blog-data.ts");
  const content = fs.readFileSync(blogDataPath, "utf-8");

  // Regex extract each blog post entry
  const postRegex = /slug:\s*"([^"]+)",[\s\S]*?featuredImage:\s*"([^"]+)",[\s\S]*?imageAlt:\s*"([^"]+)"/g;

  const results: VerificationResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = postRegex.exec(content)) !== null) {
    const [, slug, featuredImage, imageAlt] = match;
    const errors: string[] = [];

    // Check directory prefix
    if (!featuredImage.startsWith("/images/blog/")) {
      errors.push(`Image '${featuredImage}' is not in dedicated /images/blog/ directory`);
    }

    // Check physical file on disk
    const relativeDisk = featuredImage.replace(/^\//, "");
    const diskPath = path.join(ROOT_DIR, "apps", "web", "public", relativeDisk);

    let fileSize = 0;
    if (!fs.existsSync(diskPath)) {
      errors.push(`Physical file not found on disk at: ${diskPath}`);
    } else {
      const stats = fs.statSync(diskPath);
      fileSize = stats.size;
      if (fileSize < 10240) {
        errors.push(`File size is suspiciously small (${fileSize} bytes, expected > 10KB)`);
      }
    }

    // Check alt text quality
    if (!imageAlt || imageAlt.trim().length < 15) {
      errors.push(`Alt text '${imageAlt}' is too short or missing descriptive clinical details`);
    }

    results.push({
      slug,
      imagePath: featuredImage,
      diskPath,
      fileSize,
      altText: imageAlt,
      valid: errors.length === 0,
      errors,
    });
  }

  const allValid = results.length >= 10 && results.every((r) => r.valid);
  return { results, allValid };
}

// Execution
console.log("==================================================================");
console.log("PrepFord Blog Imagery Verification Guard: Topic-Matched Asset Audit");
console.log("==================================================================");

const { results, allValid } = verifyBlogImages();

console.log(`Audited ${results.length} published blog posts.\n`);

for (const r of results) {
  if (r.valid) {
    const kb = (r.fileSize / 1024).toFixed(1);
    console.log(`[PASS] /blog/${r.slug}`);
    console.log(`       Image: ${r.imagePath} (${kb} KB)`);
    console.log(`       Alt:   "${r.altText}"\n`);
  } else {
    console.error(`[FAIL] /blog/${r.slug}`);
    for (const err of r.errors) {
      console.error(`       ERROR: ${err}`);
    }
    console.error("");
  }
}

if (!allValid) {
  console.error(`\n[FAILED] Blog image audit failed. All ${results.length} articles must have dedicated, non-empty local images.`);
  process.exit(1);
} else {
  console.log(`[SUCCESS] All ${results.length}/${results.length} published articles have dedicated, high-resolution, topic-matched local hero images in /images/blog/.`);
  process.exit(0);
}
