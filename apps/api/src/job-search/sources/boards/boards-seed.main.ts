import { createDatabaseClient } from "../../../database/database.client";
import { resolveDatabaseConfig } from "../../../database/database.config";
import { loadEnvironmentFiles } from "../../../shared/env";
import { PgJobBoardsStore } from "../../boards.pg-store";
import { BoardsService } from "../../boards.service";
import { importSeededBoards } from "./boards-seed";
import { SEEDED_BOARDS } from "./boards.seed";

/**
 * Registers the companies shipped in `boards.seed.ts`, so a fresh instance
 * has something to collect besides France Travail.
 *
 *   pnpm --filter @cvforge/api boards:seed
 *   node apps/api/dist/apps/api/src/job-search/sources/boards/boards-seed.main.js
 *                                                (container: it has no tsx)
 *
 * Deliberately a command and not a boot step: fifty outbound requests on every
 * start of every instance would slow each deployment for nothing. Replaying it
 * is harmless — registering upserts, and never re-enables a company an admin
 * switched off.
 */
async function main() {
  loadEnvironmentFiles();

  const database = createDatabaseClient(resolveDatabaseConfig(process.env));

  try {
    const boards = new BoardsService(new PgJobBoardsStore(database.db));
    const report = await importSeededBoards(boards);

    console.log(
      `${report.registered} entreprise(s) enregistrée(s) sur ${SEEDED_BOARDS.length}` +
        (report.skipped > 0 ? `, ${report.skipped} ignorée(s)` : "") +
        ". Elles seront collectées à la prochaine exécution.",
    );
  } finally {
    await database.close();
  }
}

void main();
