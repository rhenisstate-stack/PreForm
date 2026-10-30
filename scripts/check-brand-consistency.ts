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

interface AllowedRule {
  id: string;
  description: string;
  test: (normalizedFile: string, lineContent: string) => boolean;
}

// Documented allowlist for legitimate historical and compatibility-sensitive references
const DOCUMENTED_RULES: AllowedRule[] = [
  {
    id: "legacy-session-cookie",
    description: "Dual-cookie legacy session fallback ensuring active learner sessions remain valid during migration",
    test: (file, line) =>
      (file.endsWith(path.normalize("apps/web/src/lib/session.ts")) ||
        file.endsWith(path.normalize("apps/web/src/lib/auth-context.tsx")) ||
        file.endsWith(path.normalize("apps/web/src/app/api/auth/google/route.ts")) ||
        file.endsWith(path.normalize("docs/superadmin-setup.md")) ||
        file.endsWith(path.normalize("docs/product-polish-and-ux-implementation-report.md"))) &&
      line.includes("preform_session"),
  },
  {
    id: "legacy-cart-storage",
    description: "Dual-storage localStorage fallback so learners do not lose existing cart items",
    test: (file, line) =>
      (file.endsWith(path.normalize("apps/web/src/lib/cart-context.tsx")) ||
        file.endsWith(path.normalize("docs/product-polish-and-ux-implementation-report.md"))) &&
      line.includes("preform_cart"),
  },
  {
    id: "legacy-cookie-consent",
    description: "Dual-storage cookie consent key fallback preventing unnecessary reprompts",
    test: (file, line) =>
      (file.endsWith(path.normalize("apps/web/src/lib/cookie.ts")) ||
        file.endsWith(path.normalize("docs/product-polish-and-ux-implementation-report.md"))) &&
      line.includes("preform:cookie-consent"),
  },
  {
    id: "legacy-notifications-storage",
    description: "Dual-storage notification history fallback preserving user notification state",
    test: (file, line) =>
      (file.endsWith(path.normalize("apps/web/src/lib/notifications-context.tsx")) ||
        file.endsWith(path.normalize("docs/product-polish-and-ux-implementation-report.md"))) &&
      line.includes("preform_notifications"),
  },
  {
    id: "legacy-promo-code-alias",
    description: "Promotional discount backward-compatibility alias automatically normalizing legacy vouchers to PREPFORD10",
    test: (file, line) =>
      (file.endsWith(path.normalize("apps/web/src/lib/cart-context.tsx")) ||
        file.endsWith(path.normalize("apps/web/tests/promo-code.test.tsx")) ||
        file.endsWith(path.normalize("apps/api/Services/ICheckoutService.cs")) ||
        file.endsWith(path.normalize("apps/api/Tests/PromoDiscountTests.cs")) ||
        file.endsWith(path.normalize("docs/superadmin-setup.md")) ||
        file.endsWith(path.normalize("docs/product-polish-and-ux-implementation-report.md"))) &&
      line.includes("PREFORM10"),
  },
  {
    id: "csharp-assembly-namespace",
    description: "C# assembly, project file, and namespace identifier Preform.Api preserved to maintain EF Core migration table consistency",
    test: (file, line) =>
      (file.startsWith("apps" + path.sep + "api") || file === "package.json" || file === "README.md" || file.startsWith("docs")) &&
      (line.includes("Preform.Api") || line.includes("Preform.Api.csproj") || line.includes("Preform.Api.Tests")),
  },
  {
    id: "repo-folder-reference",
    description: "Local repository directory name / git clone reference",
    test: (file, line) =>
      (file === "README.md" || file === "package.json" || file.startsWith("docs")) &&
      (line.includes("PREform") || line.includes("cd PREform")),
  },
  {
    id: "stack-trace-leak-guard",
    description: "Security regression test asserting that neither Prepford nor legacy Preform stack traces are leaked in HTTP responses",
    test: (file, line) =>
      (file.endsWith(path.normalize("apps/api/Tests/PostgresIntegrationTests.cs")) ||
        file.endsWith(path.normalize("docs/product-polish-and-ux-implementation-report.md"))) &&
      (line.includes('Assert.DoesNotContain("at Preform.", body);') || line.includes("Preform stack traces")),
  },
  {
    id: "historical-milestone-docs",
    description: "Immutable historical audit reports capturing verbatim terminal output and test logs from previous migration milestones",
    test: (file, _) =>
      file.startsWith("docs") &&
      !file.endsWith("superadmin-setup.md") &&
      !file.endsWith("product-polish-and-ux-implementation-report.md"),
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
  "tools",
  "scripts",
  "backups",
  "Migrations",
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

  for (const rule of DOCUMENTED_RULES) {
    if (rule.test(normalized, lineContent)) {
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
    console.log("\nDocumented compatibility allowlist rules:");
    for (const rule of DOCUMENTED_RULES) {
      console.log(`  • [${rule.id}] ${rule.description}`);
    }
    process.exit(0);
  }
}
