import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadEnvironmentFiles } from "../shared/env";
import { JobPurgeService } from "./job-purge.service";

/**
 * Anonymizes the closed offers and deletes those past 30 days, once, now
 * (US-169). Run again as often as needed: what is done is not done twice.
 *
 *   pnpm --filter @cvforge/api jobs:purge -- --dry-run   (counts, writes nothing)
 *   pnpm --filter @cvforge/api jobs:purge                (does it)
 *   node apps/api/dist/apps/api/src/job-search/job-purge.main.js [--dry-run]
 *                                                        (container: no tsx)
 *
 * The deletion cannot be undone: read the dry run first. The first real purge
 * launched here is also what turns the daily pass on.
 */
async function main() {
  loadEnvironmentFiles();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const purge = app.get(JobPurgeService);

    if (process.argv.slice(2).includes("--dry-run")) {
      console.log(JSON.stringify(await purge.preview(), null, 2));
      return;
    }

    const stats = await purge.run();

    if (!stats) {
      console.log(
        "Une collecte tourne en ce moment : relancer dans quelques minutes.",
      );
      return;
    }

    console.log(JSON.stringify(stats, null, 2));
    if (stats.errors.length > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
