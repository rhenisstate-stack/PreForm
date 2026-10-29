import path from "node:path";
import fs from "node:fs";
import {
  extractFromSqlite,
  transformAndValidate,
  generateSqlScript,
  executeMigration,
} from "./migrator";
import { isProductionDatabaseTarget } from "./validator";

async function main() {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return undefined;
  };

  const hasFlag = (flag: string): boolean => args.includes(flag);

  const isDryRun = hasFlag("--dry-run");
  const isConfirmed = hasFlag("--confirm");
  const outputSqlPath = getArg("--output-sql");
  const jsonReportPath = getArg("--json-report");

  const defaultSource = path.resolve("apps/web/.data/prepford.sqlite");
  const sourceDbPath = path.resolve(getArg("--source") || defaultSource);
  const targetConnStr =
    getArg("--target") ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/prepford";

  console.log("===============================================================");
  console.log("   PrepFord Phase 4: Safe SQLite-to-PostgreSQL Data Migration  ");
  console.log("===============================================================");
  console.log(`Source Database : ${sourceDbPath}`);
  console.log(`Target Database : ${targetConnStr.replace(/:[^:@]+@/, ":****@")}`);
  console.log(`Execution Mode  : ${isDryRun ? "DRY RUN (Read-Only Validation)" : "LIVE MIGRATION"}`);
  console.log("---------------------------------------------------------------");

  if (!fs.existsSync(sourceDbPath)) {
    console.error(`Error: Source SQLite database not found at '${sourceDbPath}'`);
    process.exit(1);
  }

  // 1. Production Safety Guard
  if (isProductionDatabaseTarget(targetConnStr)) {
    console.error(
      "\n[FATAL] SAFETY REFUSAL: Target database appears to be PRODUCTION."
    );
    console.error(
      "Live migration against production is strictly prohibited in Phase 4.\n"
    );
    process.exit(1);
  }

  if (!isDryRun && !isConfirmed) {
    console.error(
      "\n[ERROR] Non-dry-run migration requires explicit confirmation via '--confirm'."
    );
    console.error(
      "To inspect the migration safely without writing to PostgreSQL, run with '--dry-run'.\n"
    );
    process.exit(1);
  }

  // 2. Extract Data
  console.log("\n[1/4] Extracting tables from SQLite source...");
  const rawData = extractFromSqlite(sourceDbPath);
  console.log(`  - user_profiles       : ${rawData.users.length} rows`);
  console.log(`  - user_profile_images : ${rawData.images.length} rows`);
  console.log(`  - subscription_plans  : ${rawData.plans.length} rows`);
  console.log(`  - user_sessions       : ${rawData.sessions.length} rows`);

  // 3. Transform & Validate
  console.log("\n[2/4] Validating entities, hashing magic bytes, and resolving RBAC...");
  const transformed = transformAndValidate(rawData);
  console.log(`  - Valid Users mapped           : ${transformed.users.length}`);
  console.log(`  - Valid Profile Images verified: ${transformed.images.length}`);
  console.log(`  - Valid Plans mapped           : ${transformed.plans.length}`);
  console.log(`  - Valid Sessions (Revoked)     : ${transformed.sessions.length}`);
  console.log(`  - Conflicts detected & skipped : ${transformed.conflicts.length}`);
  console.log(
    `  - Ambiguous Entitlements logged : ${transformed.ambiguousEntitlements.length}`
  );

  if (transformed.conflicts.length > 0) {
    console.log("\n[CONFLICT AUDIT LOG]");
    for (const c of transformed.conflicts) {
      console.log(`  [${c.entity.toUpperCase()}] ID: ${c.id} (${c.identifier}) -> ${c.reason}`);
    }
  }

  if (transformed.ambiguousEntitlements.length > 0) {
    console.log("\n[AMBIGUOUS ENTITLEMENT REVIEW QUEUE]");
    for (const ent of transformed.ambiguousEntitlements) {
      console.log(`  User: ${ent.userId} (${ent.email}) -> Claimed Plan: '${ent.claimedPlan}'`);
      console.log(`  Action: Retained in profile; NO phantom order fabricated; flagged for audit.`);
    }
  }

  // 4. Generate SQL Script
  const sql = generateSqlScript(transformed);
  if (outputSqlPath) {
    const fullSqlPath = path.resolve(outputSqlPath);
    fs.mkdirSync(path.dirname(fullSqlPath), { recursive: true });
    fs.writeFileSync(fullSqlPath, sql, "utf-8");
    console.log(`\n[3/4] Generated idempotent PostgreSQL SQL script: ${fullSqlPath}`);
  } else {
    console.log("\n[3/4] Generated idempotent PostgreSQL SQL statements.");
  }

  // 5. Execute Migration / Dry-Run
  console.log(`\n[4/4] Executing migration (${isDryRun ? "Dry-run validation" : "PostgreSQL transaction"})...`);

  let report;
  if (isDryRun) {
    report = await executeMigration(null, transformed, {
      dryRun: true,
      connectionString: targetConnStr,
    });
  } else {
    // Dynamically load pg client
    const { Client } = await import("pg");
    const client = new Client({ connectionString: targetConnStr });
    try {
      await client.connect();
      report = await executeMigration(client, transformed, {
        dryRun: false,
        connectionString: targetConnStr,
      });
      await client.end();
    } catch (dbErr: any) {
      console.error("\n[DATABASE ERROR] Transaction aborted and rolled back:", dbErr.message);
      process.exit(1);
    }
  }

  console.log("\n===============================================================");
  console.log("                   RECONCILIATION SUMMARY                      ");
  console.log("===============================================================");
  console.log(`Users    : Source=${report.stats.users.sourceCount} | Migrated=${report.stats.users.insertedCount} | Conflicts=${report.stats.users.conflictCount}`);
  console.log(`Images   : Source=${report.stats.images.sourceCount} | Migrated=${report.stats.images.insertedCount} | Conflicts=${report.stats.images.conflictCount}`);
  console.log(`Plans    : Source=${report.stats.plans.sourceCount} | Migrated=${report.stats.plans.insertedCount} | Conflicts=${report.stats.plans.conflictCount}`);
  console.log(`Sessions : Source=${report.stats.sessions.sourceCount} | Migrated=${report.stats.sessions.insertedCount} | Conflicts=${report.stats.sessions.conflictCount}`);
  console.log("---------------------------------------------------------------");
  console.log(`Checksums:`);
  console.log(`  Users    : ${report.stats.users.checksum.substring(0, 16)}...`);
  console.log(`  Images   : ${report.stats.images.checksum.substring(0, 16)}...`);
  console.log(`  Plans    : ${report.stats.plans.checksum.substring(0, 16)}...`);
  console.log(`  Sessions : ${report.stats.sessions.checksum.substring(0, 16)}...`);
  console.log("===============================================================");

  if (jsonReportPath) {
    const fullReportPath = path.resolve(jsonReportPath);
    fs.mkdirSync(path.dirname(fullReportPath), { recursive: true });
    fs.writeFileSync(fullReportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`Reconciliation report written to: ${fullReportPath}`);
  }

  console.log("\n[SUCCESS] Migration run completed successfully.\n");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
