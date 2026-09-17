import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolveLegacyCreditsStateFile } from "../credits/credits.config";
import { resolveLegacyTemplatesStateFile } from "../templates/templates.config";
import { createDatabaseClient, runMigrations } from "./database.client";
import { resolveDatabaseConfig } from "./database.config";
import { importLegacyCredits } from "./import-legacy-credits";
import { importLegacyTemplates } from "./import-legacy-templates";

/**
 * Container entrypoint step run before the API starts (see
 * docker/api.Dockerfile): SQL migrations, then one-shot imports of the legacy
 * JSON state. Any failure exits non-zero so the new API version never serves
 * traffic against a half-migrated database.
 */
async function main() {
  const envFile = resolve(process.cwd(), ".env");

  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const config = resolveDatabaseConfig(process.env);

  await runMigrations(config);
  console.log(`[migrate] migrations applied from ${config.migrationsDir}`);

  const client = createDatabaseClient(config);

  try {
    const credits = await importLegacyCredits(
      client.db,
      resolveLegacyCreditsStateFile(process.env),
    );
    console.log(`[migrate] legacy credits: ${JSON.stringify(credits)}`);

    const templates = await importLegacyTemplates(
      client.db,
      resolveLegacyTemplatesStateFile(process.env),
    );
    console.log(`[migrate] legacy templates: ${JSON.stringify(templates)}`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("[migrate] failed", error);
  process.exit(1);
});
