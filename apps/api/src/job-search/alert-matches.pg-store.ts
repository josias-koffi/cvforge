import type { JobAlertAnalysis } from "@cvforge/types";
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobMatches, jobs } from "../database/schema";
import type { JobSource } from "./job-search.types";
import type { NewJobMatch } from "./matches.types";

/** DI token for the alerts raised as offers arrive (US-165). */
export const ALERT_MATCHES_STORE = Symbol("ALERT_MATCHES_STORE");

/** A match raised by the continuous collection, with its dates. */
export interface NewAlertMatch extends NewJobMatch {
  source: JobSource;
  /** At the source; null when it gives none. */
  publishedAt: string | null;
  detectedAt: string;
}

/** An alert waiting to go out, with what the e-mail shows of its offer. */
export interface PendingAlert {
  id: string;
  userEmail: string;
  jobId: string;
  source: JobSource;
  publishedAt: string | null;
  detectedAt: string;
  matchedSkills: string[];
  title: string;
  companyName: string;
  locationLabel: string;
  remote: boolean;
  /** The paid analysis (US-168), or why there is none; null while it runs. */
  aiAnalysis: JobAlertAnalysis | null;
  aiAnalysisStatus: AiAnalysisStatus | null;
}

export type AiAnalysisStatus = "done" | "no_credit" | "capped" | "failed";

/** A fresh alert waiting for its paid analysis, with what the model reads. */
export interface AlertToAnalyse {
  id: string;
  userEmail: string;
  profileId: string;
  detectedAt: string;
  matchedSkills: string[];
  missingSkills: string[];
  job: {
    title: string;
    companyName: string;
    locationLabel: string;
    contractType: string;
    salaryLabel: string;
    remote: boolean;
    description: string;
  };
}

/** What a candidate already received today, Paris time. */
export interface AlertSendHistory {
  /** Offers sent in alerts today. */
  sentToday: number;
  lastSentAt: string | null;
}

export type AlertMatchesStore = {
  /**
   * Writes the alert, unless the offer was already proposed to this candidate
   * in any way. Returns its id, or null on that conflict.
   */
  createAlert(match: NewAlertMatch): Promise<string | null>;
  /** The alert went out: from now on the offer stays out of the morning. */
  markAlertSent(ids: readonly string[], at: string): Promise<void>;
  /**
   * Alerts not sent yet, oldest first, raised since `since`. An offer closed
   * since (US-163 resync, live check) is left out: it never goes out.
   */
  listPending(since: string, limit: number): Promise<PendingAlert[]>;
  /** Per candidate, what alerts already sent on `day` (`YYYY-MM-DD`, Paris). */
  sendHistory(
    userEmails: readonly string[],
    day: string,
  ): Promise<Map<string, AlertSendHistory>>;
  /** Alerts raised since `since`, not sent and not analysed yet, oldest first (US-168). */
  listToAnalyse(since: string, limit: number): Promise<AlertToAnalyse[]>;
  /**
   * The candidate's analyses on `day` (Paris): those that succeeded, which
   * tells whether the day is paid for, and every attempt, which the daily cap
   * counts — a failed call costs us as much as one that worked.
   */
  analysesOn(
    userEmail: string,
    day: string,
  ): Promise<{ done: number; attempts: number }>;
  /** Writes the analysis, or why there is none. Only once per alert. */
  saveAnalysis(
    id: string,
    result: {
      status: AiAnalysisStatus;
      analysis: JobAlertAnalysis | null;
      at: string;
    },
  ): Promise<void>;
};

export class PgAlertMatchesStore implements AlertMatchesStore {
  constructor(private readonly db: Database) {}

  async createAlert(match: NewAlertMatch): Promise<string | null> {
    const [row] = await this.db
      .insert(jobMatches)
      .values({
        detectedAt: new Date(match.detectedAt),
        digestDate: match.digestDate,
        jobId: match.jobId,
        jobSnapshot: match.jobSnapshot,
        kind: "alert",
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        profileId: match.profileId,
        publishedAt: match.publishedAt ? new Date(match.publishedAt) : null,
        score: match.score,
        scoreBreakdown: match.scoreBreakdown,
        source: match.source,
        userEmail: match.userEmail,
      })
      .onConflictDoNothing({ target: [jobMatches.userEmail, jobMatches.jobId] })
      .returning({ id: jobMatches.id });

    return row?.id ?? null;
  }

  async markAlertSent(ids: readonly string[], at: string): Promise<void> {
    if (ids.length === 0) return;

    await this.db
      .update(jobMatches)
      .set({ alertSentAt: new Date(at) })
      .where(
        and(
          inArray(jobMatches.id, [...ids]),
          eq(jobMatches.kind, "alert"),
          isNull(jobMatches.alertSentAt),
        ),
      );
  }

  async listPending(since: string, limit: number): Promise<PendingAlert[]> {
    const rows = await this.db
      .select({ job: jobs, match: jobMatches })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobs.id, jobMatches.jobId))
      .where(
        and(
          eq(jobMatches.kind, "alert"),
          isNull(jobMatches.alertSentAt),
          isNull(jobs.closedAt),
          gte(jobMatches.createdAt, new Date(since)),
        ),
      )
      .orderBy(asc(jobMatches.createdAt))
      .limit(limit);

    return rows.map(({ job, match }) => ({
      companyName: job.companyAnonymous ? "" : job.companyName,
      detectedAt: (match.detectedAt ?? match.createdAt).toISOString(),
      id: match.id,
      jobId: job.id,
      locationLabel: job.locationLabel,
      matchedSkills: match.matchedSkills,
      publishedAt: match.publishedAt?.toISOString() ?? null,
      aiAnalysis: match.aiAnalysis ?? null,
      aiAnalysisStatus:
        (match.aiAnalysisStatus as AiAnalysisStatus | null) ?? null,
      remote: job.remote,
      source: (match.source ?? "france_travail") as JobSource,
      title: job.title,
      userEmail: match.userEmail,
    }));
  }

  async sendHistory(userEmails: readonly string[], day: string) {
    if (userEmails.length === 0) return new Map<string, AlertSendHistory>();

    const sentDay = sql`to_char(${jobMatches.alertSentAt} at time zone 'Europe/Paris', 'YYYY-MM-DD')`;
    const rows = await this.db
      .select({
        lastSentAt: sql<Date | string | null>`max(${jobMatches.alertSentAt})`,
        sentToday: sql<number>`count(*) filter (where ${sentDay} = ${day})::int`,
        userEmail: jobMatches.userEmail,
      })
      .from(jobMatches)
      .where(
        and(
          inArray(jobMatches.userEmail, [...userEmails]),
          eq(jobMatches.kind, "alert"),
          isNotNull(jobMatches.alertSentAt),
        ),
      )
      .groupBy(jobMatches.userEmail);

    return new Map(
      rows.map((row) => [
        row.userEmail,
        {
          lastSentAt: row.lastSentAt
            ? new Date(row.lastSentAt).toISOString()
            : null,
          sentToday: Number(row.sentToday),
        },
      ]),
    );
  }

  async listToAnalyse(since: string, limit: number): Promise<AlertToAnalyse[]> {
    const rows = await this.db
      .select({ job: jobs, match: jobMatches })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobs.id, jobMatches.jobId))
      .where(
        and(
          eq(jobMatches.kind, "alert"),
          isNull(jobMatches.aiAnalysisStatus),
          isNull(jobMatches.alertSentAt),
          isNull(jobs.closedAt),
          gte(jobMatches.detectedAt, new Date(since)),
        ),
      )
      .orderBy(asc(jobMatches.detectedAt))
      .limit(limit);

    return rows.map(({ job, match }) => ({
      detectedAt: (match.detectedAt ?? match.createdAt).toISOString(),
      id: match.id,
      job: {
        companyName: job.companyAnonymous ? "" : job.companyName,
        contractType: job.contractType,
        description: job.description,
        locationLabel: job.locationLabel,
        remote: job.remote,
        salaryLabel: job.salaryLabel,
        title: job.title,
      },
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      profileId: match.profileId,
      userEmail: match.userEmail,
    }));
  }

  async analysesOn(userEmail: string, day: string) {
    const analysedDay = sql`to_char(${jobMatches.aiAnalysisAt} at time zone 'Europe/Paris', 'YYYY-MM-DD')`;
    const [row] = await this.db
      .select({
        attempts: sql<number>`count(*) filter (where ${jobMatches.aiAnalysisStatus} in ('done', 'failed'))::int`,
        done: sql<number>`count(*) filter (where ${jobMatches.aiAnalysisStatus} = 'done')::int`,
      })
      .from(jobMatches)
      .where(
        and(
          eq(jobMatches.userEmail, userEmail),
          eq(jobMatches.kind, "alert"),
          isNotNull(jobMatches.aiAnalysisAt),
          sql`${analysedDay} = ${day}`,
        ),
      );

    return {
      attempts: Number(row?.attempts ?? 0),
      done: Number(row?.done ?? 0),
    };
  }

  async saveAnalysis(
    id: string,
    result: {
      status: AiAnalysisStatus;
      analysis: JobAlertAnalysis | null;
      at: string;
    },
  ): Promise<void> {
    await this.db
      .update(jobMatches)
      .set({
        aiAnalysis: result.analysis,
        aiAnalysisAt: new Date(result.at),
        aiAnalysisStatus: result.status,
      })
      .where(and(eq(jobMatches.id, id), isNull(jobMatches.aiAnalysisStatus)));
  }
}
