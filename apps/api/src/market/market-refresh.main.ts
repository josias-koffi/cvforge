import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadEnvironmentFiles } from "../shared/env";
import { MarketStatsService } from "./market-stats.service";

/**
 * Reads the labour market figures that are missing or a month old, now.
 *
 *   pnpm --filter @cvforge/api market:refresh [max-reads]
 *   node apps/api/dist/apps/api/src/market/market-refresh.main.js   (container)
 *
 * The API does it by itself every hour, forty reads at a time. This is for the
 * first fill after a deploy, and for checking a read end to end. Needs
 * `marche-travail` in FRANCE_TRAVAIL_APIS.
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
    const outcome = await app.get(MarketStatsService).refreshDue(limit);

    if (outcome.status === "skipped") {
      console.error(
        outcome.reason === "running"
          ? "Un rafraîchissement tourne déjà."
          : "API inactive : ajoutez marche-travail à FRANCE_TRAVAIL_APIS.",
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
