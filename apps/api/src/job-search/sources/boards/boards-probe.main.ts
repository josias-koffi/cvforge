import { readFileSync } from "node:fs";
import { desc, isNotNull, ne, sql } from "drizzle-orm";
import { loadEnvironmentFiles } from "../../../shared/env";
import { createDatabaseClient } from "../../../database/database.client";
import { resolveDatabaseConfig } from "../../../database/database.config";
import { jobs } from "../../../database/schema";
import { PgJobBoardsStore } from "../../boards.pg-store";
import { BoardsService } from "../../boards.service";
import { AshbyBoard } from "./ashby.board";
import { BoardHttpClient } from "./board-http";
import { GreenhouseBoard } from "./greenhouse.board";
import { LeverBoard } from "./lever.board";
import { SmartRecruitersBoard } from "./smartrecruiters.board";
import { probeCompanies } from "./boards-probe";

/**
 * Looks for the job board of employers we already know by name.
 *
 *   pnpm --filter @cvforge/api boards:probe            # names from our offers
 *   pnpm --filter @cvforge/api boards:probe liste.txt  # one name per line
 *   node apps/api/dist/apps/api/src/job-search/sources/boards/boards-probe.main.js
 *                                                (container: it has no tsx)
 *
 * Without an argument it reads the employers of the offers already collected —
 * every sector, since that is what France Travail brings in — and asks, for
 * each, whether it also publishes on a recruiting tool we can read directly.
 * Those direct adverts carry the full description and a real apply link.
 *
 * Bounded on purpose: a few candidate spellings per company, four providers,
 * stopping at the first board that answers with offers. A company is
 * registered **only** when the real adapter brought back at least one.
 */

const DEFAULT_LIMIT = 300;

async function main() {
  loadEnvironmentFiles();

  // `pnpm run` forwards a `--` separator as a real argument; it is not a value.
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const file = args.find((argument) => !/^\d+$/.test(argument));
  const limit = Number(args.find((argument) => /^\d+$/.test(argument))) || DEFAULT_LIMIT;

  const database = createDatabaseClient(resolveDatabaseConfig(process.env));

  try {
    const boards = new BoardsService(new PgJobBoardsStore(database.db));
    const http = new BoardHttpClient();
    const adapters = [
      new GreenhouseBoard(http),
      new LeverBoard(http),
      new AshbyBoard(http),
      new SmartRecruitersBoard(http),
    ];

    const names = file
      ? readNames(file)
      : await employersFromOffers(database.db, limit);

    console.log(`${names.length} entreprise(s) à sonder.\n`);

    const report = await probeCompanies(names, adapters, boards, (name, hit) => {
      console.log(
        hit
          ? `  ✔ ${name} → ${hit.provider}/${hit.boardToken} ` +
            `(${hit.frenchCount} offres en France sur ${hit.listingCount})`
          : `  · ${name}`,
      );
    });

    console.log(
      `\n${report.hits.length} tableau(x) trouvé(s) sur ${report.probed} sondé(s), ` +
        `${report.registered} enregistré(s). Ils seront lus à la prochaine collecte.`,
    );
  } finally {
    await database.close();
  }
}

/**
 * The employers whose offers we hold, the most prolific first.
 *
 * Anonymous adverts are left out — there is no name to probe — and so is the
 * long tail of employers with a single advert, where the hit rate collapses
 * and the requests are spent for nothing.
 */
async function employersFromOffers(
  db: ReturnType<typeof createDatabaseClient>["db"],
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({ companyName: jobs.companyName, offers: sql<number>`count(*)` })
    .from(jobs)
    .where(isNotNull(jobs.companyName))
    .groupBy(jobs.companyName)
    .having(ne(jobs.companyName, ""))
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((row) => row.companyName);
}

function readNames(file: string): string[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

void main();
