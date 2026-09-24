import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadEnvironmentFiles } from "../shared/env";
import { CompaniesService } from "./companies.service";

/**
 * Reads the companies behind the hiring establishments, missing or a month
 * old, now.
 *
 *   pnpm --filter @cvforge/api companies:refresh [max-reads]
 *   node apps/api/dist/apps/api/src/companies/companies-refresh.main.js
 *
 * The API does it by itself every hour, a hundred at a time. This is for
 * the first fill after a deploy, once `hiring-companies:refresh` has run.
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
    const outcome = await app.get(CompaniesService).refreshDue(limit);

    if (outcome.status === "skipped") {
      console.error("Un rafraîchissement tourne déjà.");
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
