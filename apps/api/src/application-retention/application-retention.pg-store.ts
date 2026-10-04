import {
  and,
  count,
  desc,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  applicationRetentionRuns,
  applications,
  interviewSessions,
  jobMatches,
  notifications,
} from "../database/schema";

/** An application the candidate is being told about, as the warning names it. */
export interface WarnedApplication {
  id: string;
  userEmail: string;
  title: string;
  companyName: string;
  updatedAt: string;
}

/** What a deletion took with it. */
export interface DeletionCounts {
  applications: number;
  interviewSessions: number;
  matchesDetached: number;
  notifications: number;
}

/** The three dates the rules give for a pass (application-retention.rules.ts). */
export interface RetentionCutoffs {
  warnBefore: Date;
  deleteBefore: Date;
  noticeGivenBefore: Date;
}

export const APPLICATION_RETENTION_STORE = Symbol(
  "APPLICATION_RETENTION_STORE",
);

export type ApplicationRetentionStore = {
  /**
   * Marks the applications due a warning as warned and returns them. The
   * update is the claim: two instances never warn about the same one.
   */
  claimWarnings(
    cutoffs: RetentionCutoffs,
    at: Date,
  ): Promise<WarnedApplication[]>;
  /** Deletes the warned applications whose notice has run, and what hangs on them. */
  deleteDue(cutoffs: RetentionCutoffs): Promise<DeletionCounts>;
  /** What a pass would do now, writing nothing (`--dry-run`). */
  countDue(
    cutoffs: RetentionCutoffs,
  ): Promise<{ toWarn: number; toDelete: number }>;
  recordRun(stats: Record<string, number>): Promise<void>;
  /** The last real passes, newest first. */
  listRuns(
    limit: number,
  ): Promise<Array<{ ranAt: string; stats: Record<string, number> }>>;
};

export class PgApplicationRetentionStore implements ApplicationRetentionStore {
  constructor(private readonly db: Database) {}

  async claimWarnings(
    cutoffs: RetentionCutoffs,
    at: Date,
  ): Promise<WarnedApplication[]> {
    const rows = await this.db
      .update(applications)
      .set({ deletionWarnedAt: at })
      .where(dueWarning(cutoffs))
      .returning({
        companyName: sql<
          string | null
        >`${applications.extracted}->>'companyName'`,
        id: applications.id,
        title: sql<string | null>`${applications.extracted}->>'title'`,
        updatedAt: applications.updatedAt,
        userEmail: applications.userEmail,
      });

    return rows.map((row) => ({
      companyName: row.companyName?.trim() ?? "",
      id: row.id,
      title: row.title?.trim() || "Candidature sans titre",
      updatedAt: row.updatedAt.toISOString(),
      userEmail: row.userEmail,
    }));
  }

  /**
   * One transaction: the application goes first, guarded again by the rule,
   * so a change made between the warning and now keeps it. What only refers
   * to it by id follows: interview sessions (their chunks cascade), the offer
   * match it came from (detached, the offer is the purge's business), and the
   * notifications about it. CV and letter versions cascade.
   */
  deleteDue(cutoffs: RetentionCutoffs): Promise<DeletionCounts> {
    return this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(applications)
        .where(dueDeletion(cutoffs))
        .returning({ id: applications.id });
      const ids = deleted.map((row) => row.id);
      if (ids.length === 0) {
        return {
          applications: 0,
          interviewSessions: 0,
          matchesDetached: 0,
          notifications: 0,
        };
      }

      const sessions = await tx
        .delete(interviewSessions)
        .where(inArray(interviewSessions.applicationId, ids))
        .returning({ id: interviewSessions.id });
      const matches = await tx
        .update(jobMatches)
        .set({ applicationId: null, updatedAt: new Date() })
        .where(inArray(jobMatches.applicationId, ids))
        .returning({ id: jobMatches.id });
      const notes = await tx
        .delete(notifications)
        .where(inArray(sql`${notifications.metadata}->>'applicationId'`, ids))
        .returning({ id: notifications.id });

      return {
        applications: ids.length,
        interviewSessions: sessions.length,
        matchesDetached: matches.length,
        notifications: notes.length,
      };
    });
  }

  async countDue(cutoffs: RetentionCutoffs) {
    const [toWarn] = await this.db
      .select({ total: count() })
      .from(applications)
      .where(dueWarning(cutoffs));
    const [toDelete] = await this.db
      .select({ total: count() })
      .from(applications)
      .where(dueDeletion(cutoffs));

    return { toDelete: toDelete?.total ?? 0, toWarn: toWarn?.total ?? 0 };
  }

  async recordRun(stats: Record<string, number>) {
    await this.db.insert(applicationRetentionRuns).values({ stats });
  }

  async listRuns(limit: number) {
    const rows = await this.db
      .select()
      .from(applicationRetentionRuns)
      .orderBy(desc(applicationRetentionRuns.ranAt))
      .limit(limit);

    return rows.map((row) => ({
      ranAt: row.ranAt.toISOString(),
      stats: row.stats,
    }));
  }
}

/** Untouched long enough, and not warned since its last change. */
function dueWarning(cutoffs: RetentionCutoffs): SQL {
  return and(
    lt(applications.updatedAt, cutoffs.warnBefore),
    or(
      isNull(applications.deletionWarnedAt),
      lt(applications.deletionWarnedAt, applications.updatedAt),
    ),
  )!;
}

/** Untouched for a year, warned since its last change, notice run out. */
function dueDeletion(cutoffs: RetentionCutoffs): SQL {
  return and(
    lt(applications.updatedAt, cutoffs.deleteBefore),
    gte(applications.deletionWarnedAt, applications.updatedAt),
    lt(applications.deletionWarnedAt, cutoffs.noticeGivenBefore),
  )!;
}
