import { eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobSources } from "../database/schema";
import type { JobSource } from "./job-search.types";
import type { JobSourceState, JobSourcesStore } from "./job-sources.types";

export class PgJobSourcesStore implements JobSourcesStore {
  constructor(private readonly db: Database) {}

  async list(): Promise<JobSourceState[]> {
    const rows = await this.db.select().from(jobSources);

    return rows.map(toState);
  }

  /**
   * The switched-off sources, and only those.
   *
   * The negative on purpose: a source missing from the table counts as
   * enabled, so one added later is collected from the day its adapter lands
   * rather than skipped because nobody inserted its row.
   */
  async listDisabled(): Promise<Set<JobSource>> {
    const rows = await this.db
      .select({ source: jobSources.source })
      .from(jobSources)
      .where(eq(jobSources.enabled, false));

    return new Set(rows.map((row) => row.source as JobSource));
  }

  /**
   * Upserts: a source has no row until something is said about it, because the
   * list of sources lives in the code, not in this table.
   */
  async setEnabled(source: JobSource, enabled: boolean) {
    const [row] = await this.db
      .insert(jobSources)
      .values({ enabled, source })
      .onConflictDoUpdate({
        set: {
          // Re-enabling clears the counter, or the next failure would switch
          // the source straight back off.
          ...(enabled ? { consecutiveFailures: 0 } : {}),
          enabled,
        },
        target: jobSources.source,
      })
      .returning();

    return row ? toState(row) : null;
  }

  async recordRun(
    source: JobSource,
    outcome: { listingCount: number; status: string; failed: boolean },
  ): Promise<void> {
    const [current] = await this.db
      .select()
      .from(jobSources)
      .where(eq(jobSources.source, source))
      .limit(1);

    const values = {
      consecutiveFailures: outcome.failed
        ? (current?.consecutiveFailures ?? 0) + 1
        : 0,
      // The last successful figure survives a failure: showing zero would read
      // as "this source finds nothing", a different problem entirely.
      lastListingCount: outcome.failed
        ? (current?.lastListingCount ?? 0)
        : outcome.listingCount,
      lastRunAt: new Date(),
      lastStatus: outcome.status.slice(0, 200),
    };

    await this.db
      .insert(jobSources)
      .values({ ...values, source })
      .onConflictDoUpdate({ set: values, target: jobSources.source });
  }
}

function toState(row: typeof jobSources.$inferSelect): JobSourceState {
  return {
    consecutiveFailures: row.consecutiveFailures,
    enabled: row.enabled,
    lastListingCount: row.lastListingCount,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastStatus: row.lastStatus,
    source: row.source as JobSource,
  };
}
