import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../app.module";
import { DATABASE, type Database } from "../../database/database.types";
import { loadEnvironmentFiles } from "../../shared/env";
import { JOBS_STORE, type JobsStore } from "../jobs.types";
import { repairMerges } from "./merge-repair.pg-store";

/**
 * Splits the jobs whose adverts were merged by mistake before 2026-10-08
 * (`merge-repair.ts`). Run once after deploying the fix; running it again
 * finds nothing left to split.
 *
 *   pnpm --filter @cvforge/api jobs:repair-merges -- --dry-run   (counts, writes nothing)
 *   pnpm --filter @cvforge/api jobs:repair-merges                (does it)
 *   node apps/api/dist/apps/api/src/job-search/dedup/merge-repair.main.js [--dry-run]
 *                                                                (container: no tsx)
 */
async function main() {
  loadEnvironmentFiles();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const stats = await repairMerges(
      app.get<Database>(DATABASE),
      app.get<JobsStore>(JOBS_STORE),
      { dryRun: process.argv.slice(2).includes("--dry-run") },
    );

    console.log(JSON.stringify(stats, null, 2));
    if (stats.errors.length > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
