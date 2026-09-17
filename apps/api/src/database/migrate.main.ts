import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolveDatabaseConfig } from "./database.config";
import { runMigrations } from "./database.client";

/**
 * Container entrypoint step run before the API starts (see
 * docker/api.Dockerfile). A failed migration exits non-zero so the new API
 * version never serves traffic against a half-migrated schema.
 */
async function main() {
  const envFile = resolve(process.cwd(), ".env");

  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const config = resolveDatabaseConfig(process.env);

  await runMigrations(config);
  console.log(`[migrate] migrations applied from ${config.migrationsDir}`);
}

main().catch((error: unknown) => {
  console.error("[migrate] failed", error);
  process.exit(1);
});
