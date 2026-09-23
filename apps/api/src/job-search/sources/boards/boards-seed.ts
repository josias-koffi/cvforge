import type { BoardsService } from "../../boards.service";
import { SEEDED_BOARDS } from "./boards.seed";

export interface SeedReport {
  registered: number;
  skipped: number;
}

/**
 * Registers the shipped list of companies.
 *
 * Replaying it is harmless: `register` upserts, and never re-enables a company
 * an admin switched off. A company whose board has disappeared since is
 * retired on the next collection by `recordFetch`, so nothing here has to be
 * verified again at import time.
 */
export async function importSeededBoards(
  boards: Pick<BoardsService, "register">,
): Promise<SeedReport> {
  const report: SeedReport = { registered: 0, skipped: 0 };

  for (const board of SEEDED_BOARDS) {
    const registered = await boards.register({ ...board, origin: "seed" });

    if (registered) report.registered += 1;
    else report.skipped += 1;
  }

  return report;
}
