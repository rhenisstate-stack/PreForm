import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { NextConfig } from "next";

const webDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(webDir, "../..");

const explicitBackendOverrides = {
  SKEW_LINE_ACTIVE_BACKEND: process.env.SKEW_LINE_ACTIVE_BACKEND,
  SKEW_LINE_DOTNET_BASE_URL: process.env.SKEW_LINE_DOTNET_BASE_URL,
  API_GATEWAY_URL: process.env.API_GATEWAY_URL,
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
};

// Load root environment variables, then allow local web configurations to take precedence
dotenv.config({ path: path.resolve(rootDir, ".env") });
dotenv.config({ path: path.resolve(rootDir, ".env.local"), override: true });
dotenv.config({ path: path.resolve(webDir, ".env"), override: true });
dotenv.config({ path: path.resolve(webDir, ".env.local"), override: true });

// Preserve explicit process-level backend overrides (e.g. CI or isolated E2E runs)
for (const [key, value] of Object.entries(explicitBackendOverrides)) {
  if (value !== undefined) {
    process.env[key] = value;
  }
}

// Ensure the Next.js frontend development server defaults to port 3000,
// and does not inherit backend API port 4000 from root .env.
if (!process.env.PORT || process.env.PORT === "4000") {
  process.env.PORT = "3000";
}
if (!process.env.BACKEND_PORT) {
  process.env.BACKEND_PORT = "4000";
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 100,
    staticGenerationRetryCount: 5,
    turbopackPluginRuntimeStrategy: "forceWorkerThreads" as unknown as undefined,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
