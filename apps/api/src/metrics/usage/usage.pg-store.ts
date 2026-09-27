import { and, avg, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { MetricsBucket } from "@cvforge/types";
import type { Database } from "../../database/database.types";
import {
  applicationCvVersions,
  applicationLetterVersions,
  applications,
  atsScans,
  authAccounts,
  creditLedgerEntries,
  interviewSessions,
  templates,
} from "../../database/schema";
import { bucketOf, inRange, toNumber } from "../shared/metrics-sql";
import type { Range } from "../shared/metrics-window";
import type { BucketValue } from "../shared/time-series";

/** The generations counted as documents; each is one charged ledger row. */
const DOCUMENT_ACTIONS = ["cv_generation", "letter_generation", "cv_import"] as const;
/** Signup months shown in the retention table. */
const RETENTION_MONTHS = 6;

export type DocumentCounts = Record<"cv_generation" | "letter_generation" | "cv_import", number>;

/** What candidates do with the product: documents, interviews, templates. */
export class PgUsageStore {
  constructor(private readonly db: Database) {}

  async readApplications(range: Range) {
    const [row] = await this.db
      .select({ total: count() })
      .from(applications)
      .where(inRange(applications.createdAt, range));
    return toNumber(row?.total);
  }

  async readInterviews(range: Range) {
    const [row] = await this.db
      .select({ total: count() })
      .from(interviewSessions)
      .where(inRange(interviewSessions.createdAt, range));
    return toNumber(row?.total);
  }

  /** Scans run from the app and from the landing, kept until they expire. */
  async readAtsScans(range: Range) {
    const [row] = await this.db
      .select({ total: count() })
      .from(atsScans)
      .where(inRange(atsScans.createdAt, range));
    return toNumber(row?.total);
  }

  /** Generations charged over the range, by kind. */
  async readDocuments(range: Range): Promise<DocumentCounts> {
    const rows = await this.db
      .select({ action: creditLedgerEntries.action, total: count() })
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.type, "ai_usage"),
          inArray(creditLedgerEntries.action, DOCUMENT_ACTIONS),
          inRange(creditLedgerEntries.createdAt, range),
        ),
      )
      .groupBy(creditLedgerEntries.action);
    const of = (action: string) =>
      toNumber(rows.find((row) => row.action === action)?.total);

    return {
      cv_generation: of("cv_generation"),
      cv_import: of("cv_import"),
      letter_generation: of("letter_generation"),
    };
  }

  async readSeries(range: Range, bucket: MetricsBucket) {
    const ledgerDate = bucketOf(creditLedgerEntries.createdAt, bucket);
    const applicationDate = bucketOf(applications.createdAt, bucket);
    const interviewDate = bucketOf(interviewSessions.createdAt, bucket);
    const [documents, created, interviews] = await Promise.all([
      this.db
        .select({ action: creditLedgerEntries.action, date: ledgerDate, total: count() })
        .from(creditLedgerEntries)
        .where(
          and(
            eq(creditLedgerEntries.type, "ai_usage"),
            inArray(creditLedgerEntries.action, [
              "cv_generation",
              "letter_generation",
            ] as const),
            inRange(creditLedgerEntries.createdAt, range),
          ),
        )
        .groupBy(ledgerDate, creditLedgerEntries.action),
      this.db
        .select({ date: applicationDate, total: count() })
        .from(applications)
        .where(inRange(applications.createdAt, range))
        .groupBy(applicationDate),
      this.db
        .select({ date: interviewDate, total: count() })
        .from(interviewSessions)
        .where(inRange(interviewSessions.createdAt, range))
        .groupBy(interviewDate),
    ]);
    const values = (rows: Array<{ date: string; total: number }>): BucketValue[] =>
      rows.map((row) => ({ date: row.date, value: toNumber(row.total) }));

    return {
      applications: values(created),
      cvGenerated: values(documents.filter((row) => row.action === "cv_generation")),
      interviews: values(interviews),
      lettersGenerated: values(
        documents.filter((row) => row.action === "letter_generation"),
      ),
    };
  }

  /** Accounts created in the range, and how many finished the onboarding. */
  async readOnboarding(range: Range) {
    const [row] = await this.db
      .select({ done: count(authAccounts.onboardingCompletedAt), signups: count() })
      .from(authAccounts)
      .where(inRange(authAccounts.createdAt, range));

    return { done: toNumber(row?.done), signups: toNumber(row?.signups) };
  }

  async readInterviewOutcomes(range: Range) {
    const [row] = await this.db
      .select({
        averageMinutes: sql<string | null>`avg(${interviewSessions.durationMinutes}) filter (where ${interviewSessions.status} = 'completed')`,
        completed: sql<string>`count(*) filter (where ${interviewSessions.status} = 'completed')`,
        total: count(),
      })
      .from(interviewSessions)
      .where(inRange(interviewSessions.createdAt, range));
    const completed = toNumber(row?.completed);

    return {
      abandoned: toNumber(row?.total) - completed,
      averageMinutes:
        row?.averageMinutes === null || row?.averageMinutes === undefined
          ? null
          : Math.round(toNumber(row.averageMinutes)),
      completed,
    };
  }

  /** Versions generated per template over the range, most used first. */
  async readTemplateUsage(kind: "cv" | "letter", range: Range) {
    const versions = kind === "cv" ? applicationCvVersions : applicationLetterVersions;
    const rows = await this.db
      .select({ count: count(), label: sql<string>`coalesce(${templates.name}, ${versions.templateId})` })
      .from(versions)
      .leftJoin(templates, eq(templates.id, versions.templateId))
      .where(and(isNotNull(versions.templateId), inRange(versions.createdAt, range)))
      .groupBy(templates.name, versions.templateId)
      .orderBy(sql`count(*) desc`)
      .limit(8);

    return rows.map((row) => ({ count: toNumber(row.count), label: row.label }));
  }

  /** Never pooled across engine versions: the scale is versioned (ADR-021). */
  async readAtsScores(range: Range) {
    const rows = await this.db
      .select({
        averageScore: avg(applicationCvVersions.atsScore),
        engineVersion: sql<string>`coalesce(${applicationCvVersions.atsEngineVersion}, 'unknown')`,
        scoredCvCount: count(),
      })
      .from(applicationCvVersions)
      .where(
        and(
          isNotNull(applicationCvVersions.atsScore),
          inRange(applicationCvVersions.createdAt, range),
        ),
      )
      .groupBy(applicationCvVersions.atsEngineVersion);

    return rows.map((row) => ({
      averageScore: Math.round(toNumber(row.averageScore)),
      engineVersion: row.engineVersion,
      scoredCvCount: toNumber(row.scoredCvCount),
    }));
  }

  /**
   * Per signup month, the share of accounts still active 7 and 30 days in.
   * Only accounts old enough to have got there are counted: a signup from
   * yesterday is not a churned one.
   */
  async readRetention(now: Date) {
    const activeAfter = (days: number) => sql`(
      exists (select 1 from ${applications} where ${applications.userEmail} = ${authAccounts.email}
        and ${applications.createdAt} >= ${authAccounts.createdAt} + make_interval(days => ${days}))
      or exists (select 1 from ${creditLedgerEntries} where ${creditLedgerEntries.userEmail} = ${authAccounts.email}
        and ${creditLedgerEntries.type} = 'ai_usage'
        and ${creditLedgerEntries.createdAt} >= ${authAccounts.createdAt} + make_interval(days => ${days})))`;
    const oldEnough = (days: number) =>
      sql`${authAccounts.createdAt} <= ${new Date(now.getTime() - days * 86_400_000)}`;
    const cohort = bucketOf(authAccounts.createdAt, "month");
    const since = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (RETENTION_MONTHS - 1), 1),
    );
    const rows = await this.db
      .select({
        active30: sql<string>`count(*) filter (where ${oldEnough(30)} and ${activeAfter(30)})`,
        active7: sql<string>`count(*) filter (where ${oldEnough(7)} and ${activeAfter(7)})`,
        cohort,
        eligible30: sql<string>`count(*) filter (where ${oldEnough(30)})`,
        eligible7: sql<string>`count(*) filter (where ${oldEnough(7)})`,
        signups: count(),
      })
      .from(authAccounts)
      .where(inRange(authAccounts.createdAt, { from: since, to: null }))
      .groupBy(cohort)
      .orderBy(cohort);

    return rows.map((row) => ({
      active30: toNumber(row.active30),
      active7: toNumber(row.active7),
      cohort: row.cohort,
      eligible30: toNumber(row.eligible30),
      eligible7: toNumber(row.eligible7),
      signups: toNumber(row.signups),
    }));
  }
}
