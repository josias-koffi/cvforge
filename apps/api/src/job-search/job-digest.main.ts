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
 * not a failure. Pass `--force` to collect again anyway — needed when a search
 * was configured after the morning pass.
 *
 * The daily pass collects what was published since yesterday. To fill an empty
 * base, ask for the whole retention window once:
 *
 *   node apps/api/dist/apps/api/src/job-search/job-digest.main.js --force --since=31
 */
async function main() {
  loadEnvironmentFiles();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    // `pnpm run` forwards a `--` separator as a real argument; only the flag
    // matters here.
    const args = process.argv.slice(2);
    const force = args.includes("--force");
    const since = args.find((argument) => argument.startsWith("--since="));
    const sinceDays = since ? Number(since.slice("--since=".length)) : undefined;

    if (sinceDays !== undefined && !Number.isFinite(sinceDays)) {
      console.error("--since attend un nombre de jours, par exemple --since=31.");
      process.exitCode = 1;

      return;
    }

    const stats = await app.get(JobDigestService).run({ force, sinceDays });

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
