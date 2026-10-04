import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { STALE_RUN_MS } from "./job-digest.service";
import type { JobRetentionStore } from "./job-retention.pg-store";
import type { JobDigestRunsStore } from "./matches.types";
import { DEFAULT_MAX_AGE_DAYS } from "./matching/job-matching";
import { dateInParis } from "./paris-time";

const DAY_MS = 86_400_000;
/** Checked every hour: a purge refused by a running collection retries soon. */
const CHECK_INTERVAL_MS = 60 * 60_000;

/** What one purge did, kept in `job_digest_runs.stats` for the admin. */
export interface PurgeStats {
  listingsAnonymized: number;
  jobsAnonymized: number;
  jobsPurged: number;
  /** Past retention, kept because an active application points to them. */
  jobsKeptForApplications: number;
  errors: string[];
}

/** What a purge would do now, written nowhere (`jobs:purge --dry-run`). */
export interface PurgePreview {
  listingsToAnonymize: number;
  jobsToAnonymize: number;
  jobsToPurge: number;
  jobsKeptForApplications: number;
}

/**
 * Deletes the offers past the 30-day rule (US-169), and anonymizes the closed
 * ones the closing itself missed — those closed before US-169.
 *
 * A job goes once it is older than the window, or closed for as long, unless
 * an active application points to it; its adverts, links and matches go with
 * it. The application keeps its own copy of the offer and depends on nothing
 * here.
 *
 * Takes the collection's lock (a `purge` row in `job_digest_runs`): deleting
 * while a collection attaches adverts to the same jobs would race.
 *
 * **The daily pass starts after the first purge launched by hand.** The
 * deletion cannot be undone, so the first one waits for `jobs:purge
 * --dry-run` to be read, then `jobs:purge`; from then on it runs every day.
 */
export class JobPurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobPurgeService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  /** The check under way, so shutdown can wait for it. */
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: JobRetentionStore,
    private readonly runs: JobDigestRunsStore,
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.scheduleCheck();
    this.timer = setInterval(() => this.scheduleCheck(), CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;

    await this.pending;
  }

  /** Nothing awaits the check: an error is logged, the next hour retries. */
  private scheduleCheck() {
    this.pending = this.runIfDue().catch((error: unknown) => {
      this.logger.error(`Retention purge failed: ${String(error)}`);
    });
  }

  /** Once a Paris day, and only once a purge was launched by hand. */
  async runIfDue(): Promise<PurgeStats | null> {
    if (!(await this.runs.latest("purge", "done"))) return null;

    const last = await this.runs.latest("purge");
    const today = dateInParis(this.now());
    if (last && last.runDate === today && last.status !== "failed") return null;

    return this.run();
  }

  /** One purge now. Null when a collection holds the lock. */
  async run(): Promise<PurgeStats | null> {
    await this.runs.recoverStale(STALE_RUN_MS);

    const claimed = await this.runs.claim(dateInParis(this.now()), "purge");
    if (!claimed) return null;

    const stats: PurgeStats = {
      errors: [],
      jobsAnonymized: 0,
      jobsKeptForApplications: 0,
      jobsPurged: 0,
      listingsAnonymized: 0,
    };

    try {
      const anonymized = await this.store.anonymizeClosed();
      stats.listingsAnonymized = anonymized.listings;
      stats.jobsAnonymized = anonymized.jobs;

      const before = this.cutoff();
      stats.jobsKeptForApplications = (
        await this.store.countExpired(before)
      ).keptForApplications;
      stats.jobsPurged = await this.store.purgeExpired(before);

      await this.runs.finish(claimed.id, {
        stats: { ...stats },
        status: "done",
      });
      this.logger.log(`Retention purge: ${JSON.stringify(stats)}`);
    } catch (error) {
      stats.errors.push(String(error));
      await this.runs.finish(claimed.id, {
        stats: { ...stats },
        status: "failed",
      });
      this.logger.error(`Retention purge failed: ${String(error)}`);
    }

    return stats;
  }

  async preview(): Promise<PurgePreview> {
    const anonymize = await this.store.countToAnonymize();
    const expired = await this.store.countExpired(this.cutoff());

    return {
      jobsKeptForApplications: expired.keptForApplications,
      jobsToAnonymize: anonymize.jobs,
      jobsToPurge: expired.expired,
      listingsToAnonymize: anonymize.listings,
    };
  }

  /** The same window as the freshness rule: nothing older is ever proposed. */
  private cutoff(): string {
    return new Date(this.now() - DEFAULT_MAX_AGE_DAYS * DAY_MS).toISOString();
  }
}
