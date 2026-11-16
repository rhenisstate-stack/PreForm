import { NextResponse } from "next/server";
import { validatePrepfordEnvironment } from "@/lib/env-config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/**
 * Returns non-secret server-side SKEW_LINE / PrepFord integration diagnostics.
 * Never exposes SKEW_LINE_APP_KEY, SKEW_LINE_DOTNET_BASE_URL, or session credentials.
 */
export async function GET() {
  const result = validatePrepfordEnvironment();
  return NextResponse.json(
    {
      valid: result.valid,
      appName: result.config.appName || null,
      appTitle: result.config.appTitle || null,
      appDomain: result.config.appDomain || null,
      appKeyConfigured: Boolean(result.config.appKey),
      activeBackend: result.config.activeBackend || null,
      isHttpsBackend: result.config.isHttpsBackend,
      errors: result.errors,
      warnings: result.warnings,
    },
    { status: result.valid ? 200 : 503, headers: NO_STORE_HEADERS }
  );
}
