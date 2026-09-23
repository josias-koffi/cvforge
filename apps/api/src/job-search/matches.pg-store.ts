import { and, desc, eq, inArray, lt } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobDigestRuns, jobMatches, jobs } from "../database/schema";
import type { StoredJob } from "./jobs.types";
import type {
  DigestRun,
  DigestRunKind,
  JobDigestRunsStore,
  JobMatchStatus,
  JobMatchWithJob,
  JobMatchesStore,
  NewJobMatch,
  StoredJobMatch,
} from "./matches.types";
import type { ScoreBreakdown } from "./matching/job-matching";

type MatchRow = typeof jobMatches.$inferSelect;
type JobRow = typeof jobs.$inferSelect;

function toMatch(row: MatchRow): StoredJobMatch {
  return {
    aiRank: row.aiRank,
    aiReason: row.aiReason,
    applicationId: row.applicationId,
    createdAt: row.createdAt.toISOString(),
    digestDate: row.digestDate,
    id: row.id,
    jobId: row.jobId,
    matchedSkills: row.matchedSkills,
    profileId: row.profileId,
    score: row.score,
    scoreBreakdown: (row.scoreBreakdown as ScoreBreakdown | null) ?? null,
    status: row.status as JobMatchStatus,
    userEmail: row.userEmail,
  };
}

function toJob(row: JobRow): StoredJob {
  return {
    closedAt: row.closedAt?.toISOString() ?? null,
    companyAnonymous: row.companyAnonymous,
    companyKey: row.companyKey,
    companyName: row.companyName,
    contractType: row.contractType as StoredJob["contractType"],
    department: row.department,
    description: row.description,
    descriptionSimhash: row.descriptionSimhash,
    firstSeenAt: row.firstSeenAt.toISOString(),
    id: row.id,
    lastSeenAt: row.lastSeenAt.toISOString(),
    latitude: row.latitude,
    locationLabel: row.locationLabel,
    longitude: row.longitude,
    primaryUrl: row.primaryUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    remote: row.remote,
    salaryLabel: row.salaryLabel,
    title: row.title,
    titleKey: row.titleKey,
  };
}

export class PgJobMatchesStore implements JobMatchesStore {
  constructor(private readonly db: Database) {}

  async listProposedJobIds(userEmail: string) {
    const rows = await this.db
      .select({ jobId: jobMatches.jobId })
      .from(jobMatches)
      .where(eq(jobMatches.userEmail, userEmail));

    return rows.map((row) => row.jobId);
  }

  /**
   * Writes the morning's selection. A conflict means the offer was already
   * proposed — the run is simply idempotent, not in error.
   */
  async createMany(matches: readonly NewJobMatch[]) {
    if (matches.length === 0) return 0;

    const inserted = await this.db
      .insert(jobMatches)
      .values(
        matches.map((match) => ({
          aiRank: match.aiRank ?? null,
          aiReason: match.aiReason ?? null,
          digestDate: match.digestDate,
          jobId: match.jobId,
          jobSnapshot: match.jobSnapshot,
          matchedSkills: match.matchedSkills,
          profileId: match.profileId,
          score: match.score,
          scoreBreakdown: match.scoreBreakdown,
          userEmail: match.userEmail,
        })),
      )
      .onConflictDoNothing({
        target: [jobMatches.userEmail, jobMatches.jobId],
      })
      .returning({ id: jobMatches.id });

    return inserted.length;
  }

  async findByJobId(userEmail: string, jobId: string) {
    const [row] = await this.db
      .select()
      .from(jobMatches)
      .where(and(eq(jobMatches.userEmail, userEmail), eq(jobMatches.jobId, jobId)))
      .limit(1);

    return row ? toMatch(row) : null;
  }

  async listStatusesByJobIds(userEmail: string, jobIds: readonly string[]) {
    if (jobIds.length === 0) return new Map<string, StoredJobMatch>();

    const rows = await this.db
      .select()
      .from(jobMatches)
      .where(
        and(
          eq(jobMatches.userEmail, userEmail),
          inArray(jobMatches.jobId, [...jobIds]),
        ),
      );

    return new Map(rows.map((row) => [row.jobId, toMatch(row)]));
  }

  async listByDigestDate(userEmail: string, digestDate: string) {
    const rows = await this.db
      .select({ job: jobs, match: jobMatches })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobs.id, jobMatches.jobId))
      .where(
        and(
          eq(jobMatches.userEmail, userEmail),
          eq(jobMatches.digestDate, digestDate),
        ),
      )
      .orderBy(jobMatches.aiRank, desc(jobMatches.score));

    return rows.map((row) => withJob(row.match, row.job));
  }

  async listRecent(userEmail: string, limit: number) {
    const rows = await this.db
      .select({ job: jobs, match: jobMatches })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobs.id, jobMatches.jobId))
      .where(eq(jobMatches.userEmail, userEmail))
      .orderBy(desc(jobMatches.digestDate), desc(jobMatches.score))
      .limit(limit);

    return rows.map((row) => withJob(row.match, row.job));
  }

  async findById(userEmail: string, matchId: string) {
    const [row] = await this.db
      .select({ job: jobs, match: jobMatches })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobs.id, jobMatches.jobId))
      .where(and(eq(jobMatches.userEmail, userEmail), eq(jobMatches.id, matchId)))
      .limit(1);

    return row ? withJob(row.match, row.job) : null;
  }

  async setStatus(
    userEmail: string,
    matchId: string,
    status: JobMatchStatus,
    applicationId?: string,
  ) {
    const [row] = await this.db
      .update(jobMatches)
      .set({
        ...(applicationId ? { applicationId } : {}),
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(jobMatches.userEmail, userEmail), eq(jobMatches.id, matchId)))
      .returning();

    return row ? toMatch(row) : null;
  }

  async deleteByUserEmail(userEmail: string) {
    const rows = await this.db
      .delete(jobMatches)
      .where(eq(jobMatches.userEmail, userEmail))
      .returning({ id: jobMatches.id });

    return rows.length;
  }
}

function withJob(match: MatchRow, job: JobRow): JobMatchWithJob {
  return { ...toMatch(match), job: toJob(job) };
}

export class PgJobDigestRunsStore implements JobDigestRunsStore {
  constructor(private readonly db: Database) {}

  /**
   * The lock. Two instances waking at the same minute both insert, and the
   * database lets exactly one through: either the day already has its morning
   * selection, or a collection is already running. The loser gets nothing
   * back — that is the answer "somebody else has it", not a failure.
   *
   * `onConflictDoNothing` without a target covers both indexes at once.
   */
  async claim(runDate: string, kind: DigestRunKind): Promise<DigestRun | null> {
    const [row] = await this.db
      .insert(jobDigestRuns)
      .values({ kind, runDate, status: "running" })
      .onConflictDoNothing()
      .returning();

    return row ? toRun(row) : null;
  }

  /**
   * A container restarted mid-collection leaves a row `running` for ever,
   * which would block every later run: the unique index would refuse them.
   * Anything older than the window is declared failed — no collection
   * survives that long without finishing.
   */
  async recoverStale(olderThanMs: number): Promise<number> {
    const rows = await this.db
      .update(jobDigestRuns)
      .set({ finishedAt: new Date(), status: "failed" })
      .where(
        and(
          eq(jobDigestRuns.status, "running"),
          lt(jobDigestRuns.startedAt, new Date(Date.now() - olderThanMs)),
        ),
      )
      .returning({ id: jobDigestRuns.id });

    return rows.length;
  }

  async list(limit: number): Promise<DigestRun[]> {
    const rows = await this.db
      .select()
      .from(jobDigestRuns)
      .orderBy(desc(jobDigestRuns.startedAt))
      .limit(limit);

    return rows.map(toRun);
  }

  async finish(
    runId: string,
    outcome: { status: "done" | "failed"; stats: Record<string, unknown> },
  ) {
    await this.db
      .update(jobDigestRuns)
      .set({
        finishedAt: new Date(),
        stats: outcome.stats,
        status: outcome.status,
      })
      .where(eq(jobDigestRuns.id, runId));
  }

  /** Gives the day's morning selection back, so it can be asked for again. */
  async release(runDate: string): Promise<boolean> {
    const rows = await this.db
      .delete(jobDigestRuns)
      .where(
        and(
          eq(jobDigestRuns.runDate, runDate),
          eq(jobDigestRuns.kind, "digest"),
        ),
      )
      .returning({ id: jobDigestRuns.id });

    return rows.length > 0;
  }

  async find(runDate: string) {
    const [row] = await this.db
      .select()
      .from(jobDigestRuns)
      .where(
        and(
          eq(jobDigestRuns.runDate, runDate),
          eq(jobDigestRuns.kind, "digest"),
        ),
      )
      .limit(1);

    return row ? toRun(row) : null;
  }
}

function toRun(row: typeof jobDigestRuns.$inferSelect): DigestRun {
  return {
    finishedAt: row.finishedAt?.toISOString() ?? null,
    id: row.id,
    kind: row.kind as DigestRun["kind"],
    runDate: row.runDate,
    startedAt: row.startedAt.toISOString(),
    stats: (row.stats as Record<string, unknown> | null) ?? null,
    status: row.status as DigestRun["status"],
  };
}
