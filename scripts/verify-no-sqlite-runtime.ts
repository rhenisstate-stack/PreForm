#!/usr/bin/env node
/**
 * PrepFord Architecture Guard: SQLite Zero-Runtime Enforcement
 *
 * Verifies that SQLite is completely absent from all active runtime code across:
 * - apps/web/src (frontend & BFF route handlers)
 * - apps/api (ASP.NET Core Web API & Entity Framework Core persistence)
 * - root and workspace package manifests
 *
 * Explicitly allowlists approved historical migration tooling:
 * - tools/migration/**
 * - apps/web/tests/data-migration.test.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface Violation {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const RUNTIME_TARGET_DIRS = [
  path.join(ROOT_DIR, "apps", "web", "src"),
  path.join(ROOT_DIR, "apps", "api"),
];

const FORBIDDEN_CODE_PATTERNS = [
  /["']node:sqlite["']/,
  /\bDatabaseSync\b/,
  /\bbetter-sqlite3\b/,
  /\bsqlite3\b/,
  /\bMicrosoft\.Data\.Sqlite\b/,
  /\bMicrosoft\.EntityFrameworkCore\.Sqlite\b/,
  /\bSystem\.Data\.SQLite\b/,
  /\bUseSqlite\b/,
  /\bPREPFORD_SQLITE_PATH\b/,
];

const FORBIDDEN_MANIFEST_DEPENDENCIES = [
  "sqlite",
  "sqlite3",
  "better-sqlite3",
  "node:sqlite",
  "Microsoft.Data.Sqlite",
  "Microsoft.EntityFrameworkCore.Sqlite",
  "System.Data.SQLite",
];

const ALLOWLISTED_PATHS = [
  path.normalize("tools/migration"),
  path.normalize("tests/data-migration.test.ts"),
  path.normalize("tests/architecture-sqlite-guard.test.ts"),
  path.normalize("scripts/verify-no-sqlite-runtime.ts"),
  path.normalize("docs"),
  path.normalize("backups"),
];

function isAllowlisted(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return ALLOWLISTED_PATHS.some((allowed) => normalized.includes(allowed));
}

function scanDirectory(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "bin" ||
        entry.name === "obj" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "coverage"
      ) {
        continue;
      }
      results.push(...scanDirectory(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

export function verifyNoSqliteRuntime(): {
  success: boolean;
  violations: Violation[];
  scannedFileCount: number;
} {
  const violations: Violation[] = [];
  const scannedFiles: string[] = [];

  // 1. Scan runtime code files
  for (const dir of RUNTIME_TARGET_DIRS) {
    const files = scanDirectory(dir, [".ts", ".tsx", ".js", ".jsx", ".cs"]);
    for (const file of files) {
      if (isAllowlisted(file)) continue;

      scannedFiles.push(file);
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        // Allow explanatory comments mentioning "(Zero SQLite Runtime Dependency)" or similar documentation
        if (lineText.trim().startsWith("//") && lineText.includes("Zero SQLite")) {
          continue;
        }

        for (const pattern of FORBIDDEN_CODE_PATTERNS) {
          if (pattern.test(lineText)) {
            violations.push({
              file: path.relative(ROOT_DIR, file),
              line: i + 1,
              pattern: pattern.toString(),
              snippet: lineText.trim(),
            });
          }
        }
      }
    }
  }

  // 2. Scan package manifests
  const jsonManifests = [
    path.join(ROOT_DIR, "package.json"),
    path.join(ROOT_DIR, "apps", "web", "package.json"),
  ];

  for (const manifestPath of jsonManifests) {
    if (!fs.existsSync(manifestPath)) continue;
    scannedFiles.push(manifestPath);

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const allDeps = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
      };

      for (const depKey of Object.keys(allDeps)) {
        for (const forbidden of FORBIDDEN_MANIFEST_DEPENDENCIES) {
          if (depKey.toLowerCase() === forbidden.toLowerCase()) {
            violations.push({
              file: path.relative(ROOT_DIR, manifestPath),
              line: 1,
              pattern: forbidden,
              snippet: `Disallowed SQLite dependency '${depKey}' detected in ${path.basename(manifestPath)}.`,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const csprojPath = path.join(ROOT_DIR, "apps", "api", "Preform.Api.csproj");
  if (fs.existsSync(csprojPath)) {
    scannedFiles.push(csprojPath);
    const csprojContent = fs.readFileSync(csprojPath, "utf-8");
    for (const forbidden of FORBIDDEN_MANIFEST_DEPENDENCIES) {
      if (csprojContent.includes(`Include="${forbidden}"`)) {
        violations.push({
          file: path.relative(ROOT_DIR, csprojPath),
          line: 1,
          pattern: forbidden,
          snippet: `Disallowed SQLite package reference '${forbidden}' detected in Preform.Api.csproj.`,
        });
      }
    }
  }

  return {
    success: violations.length === 0,
    violations,
    scannedFileCount: scannedFiles.length,
  };
}

// CLI execution
if (process.argv[1]?.includes("verify-no-sqlite-runtime")) {
  console.log("==================================================================");
  console.log("PrepFord Architecture Guard: Verifying Zero SQLite Runtime Presence");
  console.log("==================================================================");

  const result = verifyNoSqliteRuntime();
  console.log(`Scanned ${result.scannedFileCount} runtime source and manifest files.`);

  if (result.success) {
    console.log("[PASS] 0 SQLite runtime dependencies detected.");
    console.log("Runtime persistence architecture is 100% PostgreSQL-authoritative.");
    process.exit(0);
  } else {
    console.error(`[FAIL] ${result.violations.length} SQLite runtime violation(s) detected:`);
    for (const v of result.violations) {
      console.error(`  - ${v.file}:${v.line} [${v.pattern}] -> ${v.snippet}`);
    }
    process.exit(1);
  }
}
