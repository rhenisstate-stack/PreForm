#!/usr/bin/env node
/**
 * PrepFord Brand Consistency Guard
 *
 * Verifies that legacy PREform/preform branding has been systematically replaced
 * with PrepFord across maintained source code, frontend components, API services,
 * configuration, and documentation.
 *
 * Enforces an explicit, documented allowlist for legitimate historical or
 * backward-compatibility references (e.g. legacy cookie fallbacks, assembly names).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

interface BrandViolation {
  file: string;
  line: number;
  snippet: string;
}

interface AllowedReference {
  pattern: RegExp | string;
  files: string[];
  justification: string;
}

// Documented allowlist for legitimate historical and compatibility-sensitive references
const DOCUMENTED_ALLOWLIST: AllowedReference[] = [
  {
    pattern: "preform_session",
    files: [
      path.normalize("apps/web/src/lib/session.ts"),
      path.normalize("apps/web/src/lib/auth-context.tsx"),
      path.normalize("apps/web/src/app/api/auth/google/route.ts"),
      path.normalize("docs/superadmin-setup.md"),
    ],
    justification: "Dual-cookie legacy session fallback ensuring active learner sessions remain valid during migration",
  },
  {
    pattern: "preform_cart",
    files: [path.normalize("apps/web/src/lib/cart-context.tsx")],
    justification: "Dual-storage localStorage fallback so learners do not lose existing cart items",
  },
  {
    pattern: "preform:cookie-consent",
    files: [path.normalize("apps/web/src/lib/cookie.ts")],
    justification: "Dual-storage cookie consent key fallback preventing unnecessary reprompts",
  },
  {
    pattern: "preform_notifications",
    files: [path.normalize("apps/web/src/lib/notifications-context.tsx")],
    justification: "Dual-storage notification history fallback preserving user notification state",
  },
  {
    pattern: "PREFORM10",
    files: [
      path.normalize("apps/web/src/lib/cart-context.tsx"),
      path.normalize("apps/web/tests/promo-code.test.tsx"),
      path.normalize("apps/api/Services/ICheckoutService.cs"),
      path.normalize("apps/api/Tests/PromoDiscountTests.cs"),
      path.normalize("docs/superadmin-setup.md"),
    ],
    justification: "Promotional discount backward-compatibility alias automatically normalizing legacy vouchers to PREPFORD10",
  },
  {
    pattern: "Preform.Api",
    files: [
      path.normalize("apps/api/Preform.Api.csproj"),
      path.normalize("apps/api/Tests/Preform.Api.Tests.csproj"),
      path.normalize("apps/api/package.json"),
      path.normalize("package.json"),
      path.normalize("README.md"),
      path.normalize("apps/api/Program.cs"),
    ],
    justification: "C# assembly and namespace identifier preserved to maintain EF Core migration table consistency",
  },
  {
    pattern: "PREform",
    files: [
      path.normalize("README.md"),
      path.normalize("package.json"),
    ],
    justification: "Local repository directory name / git clone reference",
  },
];

const SCAN_TARGETS = [
  path.join(ROOT_DIR, "apps", "web", "src"),
  path.join(ROOT_DIR, "apps", "api"),
  path.join(ROOT_DIR, "docs"),
  path.join(ROOT_DIR, "package.json"),
  path.join(ROOT_DIR, "README.md"),
  path.join(ROOT_DIR, ".env.example"),
  path.join(ROOT_DIR, "compose.yaml"),
];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "bin",
  "obj",
  ".git",
  "dist",
  "coverage",
  "tools", // historical migration tools
  "scripts", // guard scripts themselves
  "backups",
  "Migrations", // historical EF Core migration files
]);

const SCANNABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".cs",
  ".csproj",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".env",
  ".example",
]);

function isAllowed(filePath: string, lineContent: string): boolean {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const normalized = path.normalize(relativePath);

  for (const item of DOCUMENTED_ALLOWLIST) {
    const fileMatches = item.files.some((f) => normalized.endsWith(f) || normalized === f);
    if (!fileMatches) continue;

    if (typeof item.pattern === "string") {
      if (lineContent.includes(item.pattern)) return true;
    } else if (item.pattern.test(lineContent)) {
      return true;
    }
  }

  return false;
}

function scanFile(filePath: string): BrandViolation[] {
  const violations: BrandViolation[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const brandRegex = /\bpre-?form\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (brandRegex.test(line)) {
      if (!isAllowed(filePath, line)) {
        violations.push({
          file: path.relative(ROOT_DIR, filePath),
          line: i + 1,
          snippet: line.trim(),
        });
      }
    }
  }

  return violations;
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    const ext = path.extname(dir).toLowerCase();
    if (SCANNABLE_EXTENSIONS.has(ext) || path.basename(dir).startsWith(".env")) {
      return [dir];
    }
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...walkDir(path.join(dir, entry.name)));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SCANNABLE_EXTENSIONS.has(ext) || entry.name.startsWith(".env")) {
        files.push(path.join(dir, entry.name));
      }
    }
  }

  return files;
}

export function runBrandAudit(): { violations: BrandViolation[]; totalScanned: number } {
  const allFiles: string[] = [];
  for (const target of SCAN_TARGETS) {
    allFiles.push(...walkDir(target));
  }

  const violations: BrandViolation[] = [];
  for (const file of allFiles) {
    violations.push(...scanFile(file));
  }

  return { violations, totalScanned: allFiles.length };
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("==================================================================");
  console.log("PrepFord Brand Consistency Guard: Auditing Repository Naming");
  console.log("==================================================================");

  const { violations, totalScanned } = runBrandAudit();

  console.log(`Scanned ${totalScanned} maintained source files and documentation.`);

  if (violations.length > 0) {
    console.error(`\n[FAIL] Found ${violations.length} un-allowlisted legacy PREform brand occurrences:\n`);
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} -> "${v.snippet}"`);
    }
    console.error("\nPlease rename these references to PrepFord or document legitimate compatibility in the allowlist.");
    process.exit(1);
  } else {
    console.log("\n[PASS] 0 un-allowlisted legacy PREform brand occurrences detected.");
    console.log("Public product branding is 100% consistently PrepFord.");
    console.log("\nDocumented compatibility allowlist entries:");
    for (const item of DOCUMENTED_ALLOWLIST) {
      console.log(`  • ${item.pattern}: ${item.justification} (${item.files.length} files)`);
    }
    process.exit(0);
  }
}
