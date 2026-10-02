import { and, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  applications,
  jobBoardPostings,
  jobBoards,
  jobListings,
  jobMatches,
} from "../database/schema";
import type {
  BoardCadenceStore,
  FrequentBoard,
  SeenPosting,
} from "./board-cadence.types";
import type { BoardProvider } from "./sources/boards/detect-board";

/** Keeps one INSERT well under Postgres' parameter limit. */
const INSERT_CHUNK = 500;

export class PgBoardCadenceStore implements BoardCadenceStore {
  constructor(
    private readonly db: Database,
    private readonly now: () => number = Date.now,
  ) {}

  async knownIds(provider: BoardProvider, boardToken: string) {
    const rows = await this.db
      .select({ externalId: jobBoardPostings.externalId })
      .from(jobBoardPostings)
      .where(
        and(
          eq(jobBoardPostings.provider, provider),
          eq(jobBoardPostings.boardToken, boardToken),
        ),
      );

    return new Set(rows.map((row) => row.externalId));
  }

  /** `xmax = 0` is true only for a row this statement inserted. */
  async recordSeen(
    provider: BoardProvider,
    boardToken: string,
    postings: readonly SeenPosting[],
  ) {
    const created = new Set<string>();
    const seenAt = new Date(this.now());

    for (let start = 0; start < postings.length; start += INSERT_CHUNK) {
      const rows = await this.db
        .insert(jobBoardPostings)
        .values(
          postings.slice(start, start + INSERT_CHUNK).map((posting) => ({
            announcedAt: posting.announcedAt ? new Date(posting.announcedAt) : null,
            boardToken,
            externalId: posting.externalId,
            firstSeenAt: seenAt,
            lastSeenAt: seenAt,
            provider,
          })),
        )
        .onConflictDoUpdate({
          set: { lastSeenAt: seenAt },
          target: [
            jobBoardPostings.provider,
            jobBoardPostings.boardToken,
            jobBoardPostings.externalId,
          ],
        })
        .returning({
          externalId: jobBoardPostings.externalId,
          inserted: sql<boolean>`(xmax = 0)`,
        });

      for (const row of rows) if (row.inserted) created.add(row.externalId);
    }

    return created;
  }

  async pauseFrequent(provider: BoardProvider, boardToken: string, until: Date) {
    await this.db
      .update(jobBoards)
      .set({ frequentPausedUntil: until })
      .where(
        and(eq(jobBoards.provider, provider), eq(jobBoards.boardToken, boardToken)),
      );
  }

  /**
   * From a match back to the board: match → its job's adverts → the posting
   * that board showed under the same id.
   */
  async listInterested(input: {
    matchedSince: Date;
    followedSince: Date;
    now: Date;
  }): Promise<FrequentBoard[]> {
    const interestAt = sql<Date>`max(greatest(${jobMatches.createdAt}, ${jobMatches.updatedAt}))`;
    const rows = await this.db
      .select({
        boardToken: jobBoardPostings.boardToken,
        interestAt,
        provider: jobBoardPostings.provider,
      })
      .from(jobMatches)
      .innerJoin(jobListings, eq(jobListings.jobId, jobMatches.jobId))
      .innerJoin(
        jobBoardPostings,
        and(
          eq(jobBoardPostings.provider, jobListings.source),
          eq(jobBoardPostings.externalId, jobListings.externalId),
        ),
      )
      .innerJoin(
        jobBoards,
        and(
          eq(jobBoards.provider, jobBoardPostings.provider),
          eq(jobBoards.boardToken, jobBoardPostings.boardToken),
        ),
      )
      .where(
        and(
          readable(input.now),
          or(
            gte(jobMatches.createdAt, input.matchedSince),
            and(
              inArray(jobMatches.status, ["saved", "applied"]),
              gte(jobMatches.updatedAt, input.followedSince),
            ),
          ),
        ),
      )
      .groupBy(jobBoardPostings.provider, jobBoardPostings.boardToken);

    return rows.map((row) => ({
      boardToken: row.boardToken,
      interestAt: new Date(row.interestAt),
      provider: row.provider as BoardProvider,
    }));
  }

  async listApplicationUrls(since: Date) {
    const rows = await this.db
      .select({ createdAt: applications.createdAt, url: applications.offerUrl })
      .from(applications)
      .where(and(isNotNull(applications.offerUrl), gte(applications.createdAt, since)));

    return rows.map((row) => ({ createdAt: row.createdAt, url: row.url ?? "" }));
  }

  async filterReadable(
    boards: ReadonlyArray<{ provider: BoardProvider; boardToken: string }>,
    now: Date,
  ) {
    if (boards.length === 0) return [];

    const rows = await this.db
      .select({ boardToken: jobBoards.boardToken, provider: jobBoards.provider })
      .from(jobBoards)
      .where(
        and(
          readable(now),
          inArray(
            sql`(${jobBoards.provider} || '/' || ${jobBoards.boardToken})`,
            boards.map((board) => `${board.provider}/${board.boardToken}`),
          ),
        ),
      );

    return rows.map((row) => ({
      boardToken: row.boardToken,
      provider: row.provider as BoardProvider,
    }));
  }
}

/** Enabled, and not sent back to the daily pass by a 429 or a 403. */
function readable(now: Date) {
  return and(
    eq(jobBoards.enabled, true),
    or(isNull(jobBoards.frequentPausedUntil), lte(jobBoards.frequentPausedUntil, now)),
  );
}
