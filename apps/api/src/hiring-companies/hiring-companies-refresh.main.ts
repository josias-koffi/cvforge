import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadEnvironmentFiles } from "../shared/env";
import { HiringCompaniesService } from "./hiring-companies.service";

/**
 * Reads the La Bonne Boîte companies that are missing or a week old, now.
 *
 *   pnpm --filter @cvforge/api hiring-companies:refresh [max-reads]
 *   node apps/api/dist/apps/api/src/hiring-companies/hiring-companies-refresh.main.js
 *
 * The API does it by itself every hour, sixty reads at a time. This is for
 * the first fill after a deploy. Needs `la-bonne-boite` in FRANCE_TRAVAIL_APIS.
 */
async function main() {
  loadEnvironmentFiles();

  // `pnpm run` forwards a `--` separator as a real argument.
  const [raw] = process.argv.slice(2).filter((argument) => argument !== "--");
  const limit = Number(raw) > 0 ? Number(raw) : undefined;
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const outcome = await app.get(HiringCompaniesService).refreshDue(limit);

    if (outcome.status === "skipped") {
      console.error(
        outcome.reason === "running"
          ? "Un rafraîchissement tourne déjà."
          : "API inactive : ajoutez la-bonne-boite à FRANCE_TRAVAIL_APIS.",
      );
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(outcome, null, 2));
    if (outcome.failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
