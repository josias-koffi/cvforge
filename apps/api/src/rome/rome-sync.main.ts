import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadEnvironmentFiles } from "../shared/env";
import { RomeSyncService } from "./rome-sync.service";

/**
 * Copies the ROME 4.0 referential now, whatever the date of the last sync.
 *
 *   pnpm --filter @cvforge/api rome:sync
 *   node apps/api/dist/apps/api/src/rome/rome-sync.main.js   (container: no tsx)
 *
 * The API does it by itself once a week. This is for the first copy, and for
 * checking a sync end to end against the real database. It takes the same
 * lock as the scheduled run, so it never runs next to one; a replay only adds
 * a line to `rome_sync_runs`.
 *
 * Needs `rome-metiers`, `rome-competences` and `rome-fiches-metiers` in
 * FRANCE_TRAVAIL_APIS.
 */
async function main() {
  loadEnvironmentFiles();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const outcome = await app.get(RomeSyncService).run();

    if (outcome.status === "skipped") {
      console.error(
        outcome.reason === "locked"
          ? "Une synchronisation ROME tourne déjà ailleurs."
          : "API ROME inactives : ajoutez rome-metiers, rome-competences et rome-fiches-metiers à FRANCE_TRAVAIL_APIS.",
      );
      process.exitCode = 1;
      return;
    }

    if (outcome.status === "failed") {
      console.error(`Échec, référentiel précédent conservé : ${outcome.error}`);
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(outcome.stats, null, 2));
  } finally {
    await app.close();
  }
}

void main();
