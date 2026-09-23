import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadEnvironmentFiles } from "../shared/env";
import { JobDigestService } from "./job-digest.service";

/**
 * Runs the morning collection once, now, whatever the hour.
 *
 *   pnpm --filter @cvforge/api job-digest:run    (repository, through tsx)
 *   node apps/api/dist/apps/api/src/job-search/job-digest.main.js
 *                                                (container: it has no tsx)
 *
 * The scheduled run happens by itself at 6:00 Paris time; this is for seeing
 * it work end to end — with real credentials, against the real database.
 *
 * It claims the day like the scheduled run does, so a second run on the same
 * day answers "already claimed" and writes nothing. That is the lock working,
 * not a failure.
 */
async function main() {
  loadEnvironmentFiles();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const stats = await app.get(JobDigestService).run();

    if (!stats) {
      console.log("La collecte du jour a déjà été faite (ou tourne ailleurs).");
      return;
    }

    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await app.close();
  }
}

void main();
