import { loadEnvironmentFiles } from "../../../shared/env";
import { createDatabaseClient } from "../../../database/database.client";
import { resolveDatabaseConfig } from "../../../database/database.config";
import { PgJobBoardsStore } from "../../boards.pg-store";
import { BoardsService } from "../../boards.service";
import { CrawlRunner } from "./crawl-runner";
import type { BoardProvider } from "./detect-board";

/**
 * Fills the company registry from the Common Crawl index, once, now.
 *
 *   pnpm --filter @cvforge/api boards:discover [collection] [provider]
 *   node apps/api/dist/apps/api/src/job-search/sources/boards/crawl-discovery.main.js \
 *     CC-MAIN-2026-43 greenhouse                 (container: it has no tsx)
 *
 * The same discovery runs by itself every day (`BoardDiscoveryService`); this
 * is for running it on demand or on one provider. Without a collection, the
 * newest crawls are tried in turn.
 */
async function main() {
  loadEnvironmentFiles();

  // `pnpm run` forwards a `--` separator as a real argument; it is not a value.
  const [collection, provider] = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  const database = createDatabaseClient(resolveDatabaseConfig(process.env));
  const store = new PgJobBoardsStore(database.db);
  const boards = new BoardsService(store);

  const report = await new CrawlRunner({
    log: console.log,
    store,
    verifiers: boards.verifiers(),
  }).run({ collection, provider: provider as BoardProvider | undefined });

  console.log(JSON.stringify(report, null, 2));
  await database.close();
}

void main();
