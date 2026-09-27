import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobBoards } from "../database/schema";
import type {
  BoardOrigin,
  BoardRegistration,
  JobBoardsStore,
  RegisteredBoard,
} from "./boards.types";
import type { BoardProvider } from "./sources/boards/detect-board";

type JobBoardRow = typeof jobBoards.$inferSelect;

/**
 * How many failures in a row retire a company.
 *
 * A board that answers 404 is gone for good — a renamed company, a board
 * closed — and is retired at once. A board that merely errors gets five
 * chances: providers have outages, and forgetting a company on a bad afternoon
 * would silently shrink the coverage.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

function toBoard(row: JobBoardRow): RegisteredBoard {
  return {
    boardToken: row.boardToken,
    companyName: row.companyName,
    consecutiveFailures: row.consecutiveFailures,
    createdAt: row.createdAt.toISOString(),
    enabled: row.enabled,
    lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
    lastJobCount: row.lastJobCount,
    lastStatus: row.lastStatus,
    origin: row.origin as BoardOrigin,
    provider: row.provider as BoardProvider,
  };
}

export class PgJobBoardsStore implements JobBoardsStore {
  constructor(private readonly db: Database) {}

  /**
   * Inserts, or keeps what is already there. The company name is filled in if
   * it was missing, but nothing else is touched: a disabled board stays
   * disabled even though a candidate just imported an offer from it.
   */
  async register(board: BoardRegistration) {
    const [row] = await this.db
      .insert(jobBoards)
      .values({
        boardToken: board.boardToken,
        companyName: board.companyName?.trim() ?? "",
        origin: board.origin,
        provider: board.provider,
      })
      .onConflictDoUpdate({
        target: [jobBoards.provider, jobBoards.boardToken],
        set: {
          companyName: sql`case when ${jobBoards.companyName} = '' then excluded.company_name else ${jobBoards.companyName} end`,
        },
      })
      .returning();

    return toBoard(row!);
  }

  async listEnabled() {
    const rows = await this.db
      .select()
      .from(jobBoards)
      .where(eq(jobBoards.enabled, true))
      // Oldest fetch first, so a run that is cut short resumes where it left;
      // a board never fetched comes before them all.
      .orderBy(sql`${jobBoards.lastFetchedAt} asc nulls first`);

    return rows.map(toBoard);
  }

  async list(options: { limit?: number; provider?: BoardProvider } = {}) {
    const query = this.db.select().from(jobBoards).$dynamic();
    const rows = await (options.provider
      ? query.where(eq(jobBoards.provider, options.provider))
      : query
    )
      .orderBy(asc(jobBoards.provider), asc(jobBoards.boardToken))
      .limit(options.limit ?? 500);

    return rows.map(toBoard);
  }

  async find(provider: BoardProvider, boardToken: string) {
    const [row] = await this.db
      .select()
      .from(jobBoards)
      .where(
        and(
          eq(jobBoards.provider, provider),
          eq(jobBoards.boardToken, boardToken),
        ),
      )
      .limit(1);

    return row ? toBoard(row) : null;
  }

  async setEnabled(provider: BoardProvider, boardToken: string, enabled: boolean) {
    const [row] = await this.db
      .update(jobBoards)
      .set({
        // Re-enabling clears the failure count, or the next failure would
        // retire the board immediately.
        consecutiveFailures: enabled ? 0 : undefined,
        enabled,
      })
      .where(
        and(
          eq(jobBoards.provider, provider),
          eq(jobBoards.boardToken, boardToken),
        ),
      )
      .returning();

    return row ? toBoard(row) : null;
  }

  async recordFetch(
    provider: BoardProvider,
    boardToken: string,
    outcome: { jobCount: number; status: string; failed: boolean; gone?: boolean },
  ) {
    const current = await this.find(provider, boardToken);
    if (!current) return null;

    const consecutiveFailures = outcome.failed
      ? current.consecutiveFailures + 1
      : 0;
    // Only ever disables. Putting a board back is an admin decision, never a
    // side effect of a collection that happened to succeed.
    const enabled = outcome.gone
      ? false
      : current.enabled && consecutiveFailures < MAX_CONSECUTIVE_FAILURES;

    const [row] = await this.db
      .update(jobBoards)
      .set({
        consecutiveFailures,
        enabled,
        lastFetchedAt: new Date(),
        lastJobCount: outcome.failed ? current.lastJobCount : outcome.jobCount,
        lastStatus: outcome.status.slice(0, 200),
      })
      .where(
        and(
          eq(jobBoards.provider, provider),
          eq(jobBoards.boardToken, boardToken),
        ),
      )
      .returning();

    return row ? toBoard(row) : null;
  }
}
