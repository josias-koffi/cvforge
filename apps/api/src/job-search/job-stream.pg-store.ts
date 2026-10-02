import { and, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobSourceCalls, jobStreamCursors } from "../database/schema";
import type { JobSource } from "./job-search.types";
import type {
  JobSourceCallsStore,
  JobStreamCursorsStore,
  StreamKey,
  StreamLease,
} from "./job-stream.types";

export class PgJobStreamCursorsStore implements JobStreamCursorsStore {
  constructor(
    private readonly db: Database,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * The row is created on first use, then taken by a conditional UPDATE: of
   * two instances waking at the same second, exactly one matches.
   */
  async claim(
    source: StreamKey,
    owner: string,
    leaseMs: number,
  ): Promise<StreamLease | null> {
    const now = new Date(this.now());

    await this.db
      .insert(jobStreamCursors)
      .values({ source })
      .onConflictDoNothing();

    const [row] = await this.db
      .update(jobStreamCursors)
      .set({
        lockedBy: owner,
        lockedUntil: new Date(now.getTime() + leaseMs),
        updatedAt: now,
      })
      .where(
        and(
          eq(jobStreamCursors.source, source),
          or(
            isNull(jobStreamCursors.lockedUntil),
            lt(jobStreamCursors.lockedUntil, now),
          ),
        ),
      )
      .returning({ cursorAt: jobStreamCursors.cursorAt });

    return row ? { cursorAt: row.cursorAt } : null;
  }

  async advance(
    source: StreamKey,
    owner: string,
    cursorAt: Date,
    leaseMs: number,
  ): Promise<boolean> {
    const now = new Date(this.now());
    const rows = await this.db
      .update(jobStreamCursors)
      .set({
        cursorAt,
        lockedUntil: new Date(now.getTime() + leaseMs),
        updatedAt: now,
      })
      .where(
        and(
          eq(jobStreamCursors.source, source),
          eq(jobStreamCursors.lockedBy, owner),
          gte(jobStreamCursors.lockedUntil, now),
        ),
      )
      .returning({ source: jobStreamCursors.source });

    return rows.length > 0;
  }

  async release(
    source: StreamKey,
    owner: string,
    report?: Record<string, unknown>,
  ): Promise<void> {
    await this.db
      .update(jobStreamCursors)
      .set({
        lockedBy: null,
        lockedUntil: null,
        ...(report ? { lastReport: report } : {}),
      })
      .where(
        and(
          eq(jobStreamCursors.source, source),
          eq(jobStreamCursors.lockedBy, owner),
        ),
      );
  }

  async lastReports() {
    const rows = await this.db
      .select({ report: jobStreamCursors.lastReport, source: jobStreamCursors.source })
      .from(jobStreamCursors);

    return new Map(
      rows.flatMap((row) => (row.report ? [[row.source, row.report] as const] : [])),
    );
  }
}

export class PgJobSourceCallsStore implements JobSourceCallsStore {
  constructor(private readonly db: Database) {}

  async add(source: JobSource, day: string, calls: number): Promise<void> {
    if (calls <= 0) return;

    await this.db
      .insert(jobSourceCalls)
      .values({ calls, day, source })
      .onConflictDoUpdate({
        set: { calls: sql`${jobSourceCalls.calls} + ${calls}` },
        target: [jobSourceCalls.source, jobSourceCalls.day],
      });
  }

  async totals(day: string, monthStart: string) {
    const rows = await this.db
      .select({
        month: sql<number>`sum(${jobSourceCalls.calls})::int`,
        source: jobSourceCalls.source,
        today: sql<number>`coalesce(sum(${jobSourceCalls.calls}) filter (where ${jobSourceCalls.day} = ${day}), 0)::int`,
      })
      .from(jobSourceCalls)
      .where(gte(jobSourceCalls.day, monthStart))
      .groupBy(jobSourceCalls.source);

    return new Map(
      rows.map((row) => [
        row.source as JobSource,
        { month: Number(row.month), today: Number(row.today) },
      ]),
    );
  }
}
