import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { PRODUCTS, type Product } from "./products";

interface SqliteStatementSync {
  run: (...params: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
}

interface SqliteDatabaseSync {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatementSync;
  close: () => void;
}

function loadSqliteDatabaseConstructor(): new (location: string) => SqliteDatabaseSync {
  const procWithBuiltin = process as unknown as {
    getBuiltinModule?: (id: string) => { DatabaseSync: new (location: string) => SqliteDatabaseSync } | undefined;
  };
  const moduleId = ["node", "sqlite"].join(":");
  if (typeof procWithBuiltin.getBuiltinModule === "function") {
    const mod = procWithBuiltin.getBuiltinModule(moduleId);
    if (mod?.DatabaseSync) {
      return mod.DatabaseSync;
    }
  }
  const req = createRequire(path.join(process.cwd(), "package.json"));
  const fallbackMod = req(moduleId) as {
    DatabaseSync: new (location: string) => SqliteDatabaseSync;
  };
  return fallbackMod.DatabaseSync;
}

let dbInstance: SqliteDatabaseSync | null = null;
let currentDbPath: string | null = null;

function resolveDatabasePath(): string {
  if (process.env.PREPFORD_SQLITE_PATH) {
    return process.env.PREPFORD_SQLITE_PATH;
  }
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "prepford.sqlite");
}

function getDatabase(): SqliteDatabaseSync {
  const targetPath = resolveDatabasePath();
  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  if (targetPath !== ":memory:") {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const DatabaseSync = loadSqliteDatabaseConstructor();
  const db = new DatabaseSync(targetPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      audience TEXT,
      pathway TEXT NOT NULL,
      plan_type TEXT NOT NULL,
      price INTEGER NOT NULL,
      original_price INTEGER,
      currency TEXT NOT NULL DEFAULT 'USD',
      billing_interval TEXT NOT NULL,
      duration_label TEXT,
      features_json TEXT NOT NULL,
      popular INTEGER NOT NULL DEFAULT 0,
      bg_colour TEXT,
      accent_colour TEXT,
      text_colour TEXT,
      badge_text TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      entitlements_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plans_pathway_active ON subscription_plans(pathway, is_active);
    CREATE INDEX IF NOT EXISTS idx_plans_display_order ON subscription_plans(display_order);
  `);

  // Auto-seed initial catalogue if empty
  const countRow = db.prepare("SELECT COUNT(*) as count FROM subscription_plans;").get() as { count: number };
  if (!countRow || countRow.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO subscription_plans (
        id, slug, name, description, audience, pathway, plan_type, price, original_price,
        currency, billing_interval, duration_label, features_json, popular, bg_colour,
        accent_colour, text_colour, badge_text, display_order, is_active, entitlements_json,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?
      );
    `);

    const now = new Date().toISOString();
    for (const p of PRODUCTS) {
      insertStmt.run(
        p.id,
        p.slug || p.id,
        p.name,
        p.description,
        p.audience || null,
        p.pathway,
        p.planType,
        p.price,
        p.originalPrice || null,
        p.currency,
        p.billingInterval,
        p.durationLabel || null,
        JSON.stringify(p.features),
        p.popular ? 1 : 0,
        p.bgColour || null,
        p.accentColour || null,
        p.textColour || null,
        p.badgeText || null,
        p.displayOrder || 0,
        p.isActive !== false ? 1 : 0,
        JSON.stringify(p.entitlements || (p.pathway === "Both" ? ["rn", "pn"] : [p.pathway.toLowerCase()])),
        now,
        now
      );
    }
  }

  dbInstance = db;
  currentDbPath = targetPath;
  return db;
}

import {
  isValidHexColor,
  checkContrastRatio,
  validateSubscriptionColors,
  evaluateWcagContrast,
} from "./color-contrast";
export {
  isValidHexColor,
  checkContrastRatio,
  validateSubscriptionColors,
  evaluateWcagContrast,
};

export interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  audience: string | null;
  pathway: string;
  plan_type: string;
  price: number;
  original_price: number | null;
  currency: string;
  billing_interval: string;
  duration_label: string | null;
  features_json: string;
  popular: number;
  bg_colour: string | null;
  accent_colour: string | null;
  text_colour: string | null;
  badge_text: string | null;
  display_order: number;
  is_active: number;
  entitlements_json: string;
  created_at: string;
  updated_at: string;
}

function mapRowToProduct(row: PlanRow): Product {
  let features: string[] = [];
  try {
    features = JSON.parse(row.features_json);
  } catch {
    features = [];
  }

  let entitlements: ("rn" | "pn")[] = [];
  try {
    entitlements = JSON.parse(row.entitlements_json);
  } catch {
    entitlements = row.pathway === "Both" ? ["rn", "pn"] : [row.pathway.toLowerCase() as "rn" | "pn"];
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    audience: row.audience || undefined,
    pathway: row.pathway as "RN" | "PN" | "Both",
    planType: row.plan_type as "starter" | "pro" | "premium" | "readiness",
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    currency: row.currency,
    billingInterval: row.billing_interval as "month" | "quarter" | "one-time",
    durationLabel: row.duration_label ?? undefined,
    features,
    popular: Boolean(row.popular),
    bgColour: row.bg_colour ?? undefined,
    accentColour: row.accent_colour ?? undefined,
    textColour: row.text_colour ?? undefined,
    badgeText: row.badge_text ?? undefined,
    displayOrder: row.display_order,
    isActive: Boolean(row.is_active),
    entitlements,
  };
}

export function getAllSubscriptionPlans(includeInactive = false): Product[] {
  try {
    const db = getDatabase();
    const query = includeInactive
      ? "SELECT * FROM subscription_plans ORDER BY display_order ASC, name ASC;"
      : "SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC, name ASC;";
    const rows = db.prepare(query).all() as PlanRow[];
    return rows.map(mapRowToProduct);
  } catch (e) {
    console.warn("Failed to load subscription plans from SQLite, falling back to static PRODUCTS:", e);
    return includeInactive ? PRODUCTS : PRODUCTS.filter((p) => p.isActive !== false);
  }
}

export function getSubscriptionPlanById(id: string): Product | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  try {
    const db = getDatabase();
    const row = db.prepare(
      "SELECT * FROM subscription_plans WHERE LOWER(id) = ? OR LOWER(slug) = ? LIMIT 1;"
    ).get(normalized, normalized) as PlanRow | undefined;
    if (row) {
      return mapRowToProduct(row);
    }
  } catch (e) {
    console.warn("SQLite plan lookup error, falling back to PRODUCTS:", e);
  }
  return PRODUCTS.find(
    (p) => p.id.toLowerCase() === normalized || (p.slug && p.slug.toLowerCase() === normalized)
  );
}

export interface PlanMutationInput {
  name: string;
  slug: string;
  description: string;
  audience?: string;
  pathway: "RN" | "PN" | "Both";
  planType: "starter" | "pro" | "premium" | "readiness";
  price: number;
  originalPrice?: number;
  currency?: string;
  billingInterval: "month" | "quarter" | "one-time";
  durationLabel?: string;
  features: string[];
  popular?: boolean;
  bgColour?: string;
  accentColour?: string;
  textColour?: string;
  badgeText?: string;
  displayOrder?: number;
  isActive?: boolean;
  entitlements?: ("rn" | "pn")[];
}

export function createSubscriptionPlan(input: PlanMutationInput): Product {
  const db = getDatabase();
  const id = input.slug.trim().toLowerCase();
  const slug = input.slug.trim().toLowerCase();
  const now = new Date().toISOString();

  const entitlements = input.entitlements || (input.pathway === "Both" ? ["rn", "pn"] : [input.pathway.toLowerCase() as "rn" | "pn"]);

  db.prepare(`
    INSERT INTO subscription_plans (
      id, slug, name, description, audience, pathway, plan_type, price, original_price,
      currency, billing_interval, duration_label, features_json, popular, bg_colour,
      accent_colour, text_colour, badge_text, display_order, is_active, entitlements_json,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?
    );
  `).run(
    id,
    slug,
    input.name.trim(),
    input.description.trim(),
    input.audience?.trim() || null,
    input.pathway,
    input.planType,
    Math.round(input.price),
    input.originalPrice ? Math.round(input.originalPrice) : null,
    input.currency?.toUpperCase() || "USD",
    input.billingInterval,
    input.durationLabel?.trim() || null,
    JSON.stringify(input.features),
    input.popular ? 1 : 0,
    input.bgColour?.trim() || null,
    input.accentColour?.trim() || null,
    input.textColour?.trim() || null,
    input.badgeText?.trim() || null,
    input.displayOrder || 0,
    input.isActive !== false ? 1 : 0,
    JSON.stringify(entitlements),
    now,
    now
  );

  return getSubscriptionPlanById(id)!;
}

export function updateSubscriptionPlan(id: string, input: Partial<PlanMutationInput>): Product | undefined {
  const db = getDatabase();
  const existing = getSubscriptionPlanById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const updatedFeatures = input.features !== undefined ? input.features : existing.features;
  const updatedEntitlements = input.entitlements !== undefined
    ? input.entitlements
    : input.pathway
      ? (input.pathway === "Both" ? ["rn", "pn"] : [input.pathway.toLowerCase() as "rn" | "pn"])
      : existing.entitlements;

  db.prepare(`
    UPDATE subscription_plans SET
      name = ?,
      description = ?,
      audience = ?,
      pathway = ?,
      plan_type = ?,
      price = ?,
      original_price = ?,
      currency = ?,
      billing_interval = ?,
      duration_label = ?,
      features_json = ?,
      popular = ?,
      bg_colour = ?,
      accent_colour = ?,
      text_colour = ?,
      badge_text = ?,
      display_order = ?,
      is_active = ?,
      entitlements_json = ?,
      updated_at = ?
    WHERE LOWER(id) = LOWER(?) OR LOWER(slug) = LOWER(?);
  `).run(
    input.name !== undefined ? input.name.trim() : existing.name,
    input.description !== undefined ? input.description.trim() : existing.description,
    input.audience !== undefined ? input.audience.trim() : existing.audience || null,
    input.pathway !== undefined ? input.pathway : existing.pathway,
    input.planType !== undefined ? input.planType : existing.planType,
    input.price !== undefined ? Math.round(input.price) : existing.price,
    input.originalPrice !== undefined ? (input.originalPrice ? Math.round(input.originalPrice) : null) : (existing.originalPrice ?? null),
    input.currency !== undefined ? input.currency.toUpperCase() : existing.currency,
    input.billingInterval !== undefined ? input.billingInterval : existing.billingInterval,
    input.durationLabel !== undefined ? input.durationLabel.trim() : (existing.durationLabel ?? null),
    JSON.stringify(updatedFeatures),
    input.popular !== undefined ? (input.popular ? 1 : 0) : (existing.popular ? 1 : 0),
    input.bgColour !== undefined ? input.bgColour.trim() : (existing.bgColour ?? null),
    input.accentColour !== undefined ? input.accentColour.trim() : (existing.accentColour ?? null),
    input.textColour !== undefined ? input.textColour.trim() : (existing.textColour ?? null),
    input.badgeText !== undefined ? input.badgeText.trim() : (existing.badgeText ?? null),
    input.displayOrder !== undefined ? input.displayOrder : (existing.displayOrder || 0),
    input.isActive !== undefined ? (input.isActive ? 1 : 0) : (existing.isActive !== false ? 1 : 0),
    JSON.stringify(updatedEntitlements),
    now,
    id,
    id
  );

  return getSubscriptionPlanById(id);
}

export function archiveSubscriptionPlan(id: string): boolean {
  const db = getDatabase();
  const existing = getSubscriptionPlanById(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE subscription_plans SET
      is_active = 0,
      updated_at = ?
    WHERE LOWER(id) = LOWER(?) OR LOWER(slug) = LOWER(?);
  `).run(now, id, id);

  return true;
}
