import { loadEnvironmentFiles } from "../../../shared/env";
import { createDatabaseClient } from "../../../database/database.client";
import { resolveDatabaseConfig } from "../../../database/database.config";
import { PgJobBoardsStore } from "../../boards.pg-store";
import { BoardsService } from "../../boards.service";
import {
  CRAWL_PATTERNS,
  crawlQueryUrl,
  isPlausibleBoardToken,
  readCrawlBoards,
} from "./crawl-discovery";
import { BoardHttpClient } from "./board-http";
import { AshbyBoard } from "./ashby.board";
import { GreenhouseBoard } from "./greenhouse.board";
import { SmartRecruitersBoard } from "./smartrecruiters.board";
import type { CompanyBoardAdapter } from "./board.types";
import type { BoardProvider } from "./detect-board";

/**
 * Fills the company registry from the Common Crawl index.
 *
 *   pnpm --filter @cvforge/api boards:discover CC-MAIN-2026-33 greenhouse
 *
 * Meant to run monthly, by hand for now. Two rules make it safe to run against
 * production data: every candidate is **verified on the provider's live API**
 * before being registered, and a company already known is left exactly as it
 * is — including disabled.
 */

const COLLECTION_FALLBACK = "CC-MAIN-2026-33";
/** Bounded so one run cannot spend an afternoon on a single pattern. */
const MAX_CANDIDATES_PER_PATTERN = 400;

async function main() {
  loadEnvironmentFiles();

  // `pnpm run` forwards a `--` separator as a real argument; it is not a value.
  const [collection = COLLECTION_FALLBACK, onlyProvider] = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  const database = createDatabaseClient(resolveDatabaseConfig(process.env));
  const store = new PgJobBoardsStore(database.db);
  const boards = new BoardsService(store);
  const http = new BoardHttpClient();
  const verifiers: Partial<Record<BoardProvider, CompanyBoardAdapter>> = {
    ashby: new AshbyBoard(http),
    greenhouse: new GreenhouseBoard(http),
    smartrecruiters: new SmartRecruitersBoard(http),
  };

  let registered = 0;
  let rejected = 0;

  for (const [provider, patterns] of Object.entries(CRAWL_PATTERNS)) {
    if (onlyProvider && provider !== onlyProvider) continue;

    for (const pattern of patterns ?? []) {
      const body = await readIndex(crawlQueryUrl(collection, pattern));
      if (body === null) continue;

      const candidates = readCrawlBoards(body)
        .filter((board) => isPlausibleBoardToken(board.boardToken))
        .slice(0, MAX_CANDIDATES_PER_PATTERN);

      console.log(`${pattern}: ${candidates.length} candidate(s)`);

      for (const candidate of candidates) {
        const verifier = verifiers[candidate.provider];

        // Without an adapter we cannot check the company exists, and an
        // unverified guess would cost a daily 404 forever.
        if (!verifier) {
          rejected += 1;
          continue;
        }

        try {
          const listings = await verifier.fetchBoard(candidate.boardToken);
          // A board with no French or remote offer today may have one next
          // month; an empty board is kept, a missing one is not.
          await store.register({ ...candidate, origin: "crawl" });
          registered += 1;
          console.log(
            `  + ${candidate.provider}/${candidate.boardToken} (${listings.length} offre(s))`,
          );
        } catch {
          rejected += 1;
        }
      }
    }
  }

  console.log(
    `${registered} entreprise(s) enregistrée(s), ${rejected} écartée(s). Collecte possible sur : ${boards.supportedProviders().join(", ")}`,
  );
  await database.close();
}

/** The index answers 404 when the collection name is wrong — a common typo. */
async function readIndex(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { "user-agent": "CVForgeJobBot/1.0 (+https://cvforge.fr/robot)" },
  });

  if (!response.ok) {
    console.warn(`Index Common Crawl : ${response.status} pour ${url}`);
    return null;
  }

  return response.text();
}

void main();
