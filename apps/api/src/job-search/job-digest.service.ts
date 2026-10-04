import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { ProfilesStore } from "../profiles/profiles.types";
import type { SearchProjectsStore } from "../search-projects/search-projects.types";
import { BoardsService } from "./boards.service";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import type { JobSourceAdapter } from "./job-search.types";
import type { JobsStore, StoredJob } from "./jobs.types";
import type {
  DigestRun,
  DigestRunKind,
  JobDigestRunsStore,
  JobMatchesStore,
} from "./matches.types";
import type { JobSourcesStore } from "./job-sources.types";
import type { RomeMatchingReader } from "./rome-matching.pg-reader";
import { JobCollector } from "./job-collector";
import { DigestSelector } from "./job-digest.selection";
import { resyncStaleListings, type RefreshableSource } from "./listing-resync";
import type { DigestStats } from "./job-digest.steps";
import type { MarketNotesReader } from "../market/market-stats.service";
import { dateInParis, hourInParis } from "./paris-time";

/**
 * The morning run: collect, select, explain, write.
 *
 * Scheduled the way the rest of this repo schedules daily work — a plain
 * interval, no job queue — but made safe for several API instances by a row in
 * `job_digest_runs`: the first to insert today's date owns the run.
 */

const CHECK_INTERVAL_MS = 15 * 60_000;
const DIGEST_HOUR = 6;
/**
 * The daily pass only asks for what was published since yesterday: the rest is
 * already in the base. A first collection has nothing to build on, and takes
 * the whole retention window instead — `job-digest:run --since=31`.
 */
const COLLECTION_WINDOW_DAYS = 1;

/**
 * Past this, a run still marked `running` is a run whose process is gone: no
 * collection takes two hours, and the row would otherwise block every later
 * one.
 */
export const STALE_RUN_MS = 2 * 60 * 60_000;

@Injectable()
export class JobDigestService implements OnModuleInit {
  private readonly logger = new Logger(JobDigestService.name);
  private readonly collector: JobCollector;
  private readonly selector: DigestSelector;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly searchProjects: Pick<
      SearchProjectsStore,
      "listAll" | "listDigestEnabled"
    >,
    profiles: ProfilesStore,
    private readonly jobs: JobsStore,
    matches: JobMatchesStore,
    private readonly runs: JobDigestRunsStore,
    sourceStates: JobSourcesStore,
    boards: BoardsService,
    private readonly deduplicator: JobDeduplicator,
    private readonly sources: JobSourceAdapter[],
    credits: CreditsService,
    openRouter: OpenRouterService,
    notifications: NotificationsService,
    private readonly rome: RomeMatchingReader,
    market: MarketNotesReader,
    appUrl: string,
    private readonly now: () => number = Date.now,
  ) {
    this.collector = new JobCollector(sources, sourceStates, boards);
    this.selector = new DigestSelector({
      appUrl,
      credits,
      jobs,
      market,
      matches,
      notifications,
      now,
      openRouter,
      profiles,
      sources,
    });
  }

  onModuleInit() {
    // Checked every quarter of an hour rather than scheduled at 6:00 sharp: a
    // restart at 6:05 must not skip the day.
    this.timer = setInterval(() => {
      void this.runIfDue();
    }, CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runIfDue(): Promise<DigestStats | null> {
    if (hourInParis(this.now()) < DIGEST_HOUR) return null;

    return this.run();
  }

  /**
   * Starts a collection in the background and returns its identity at once.
   *
   * The fire-and-forget lives here rather than in the controller: a captured
   * promise in a controller is exactly what `no-unresolved-promises.test.ts`
   * forbids, and an unhandled rejection would take the process down. The
   * caller polls the run instead — a collection takes minutes, an HTTP
   * request must not.
   */
  async startBackgroundRun(options: {
    sinceDays?: number;
  }): Promise<{ started: boolean }> {
    await this.runs.recoverStale(STALE_RUN_MS);

    const claimed = await this.runs.claim(dateInParis(this.now()), "collect");
    if (!claimed) return { started: false };

    void this.executeRun(claimed, options.sinceDays).catch((error: unknown) => {
      this.logger.error(`Background collection failed: ${String(error)}`);
    });

    return { started: true };
  }

  /**
   * One pass. Returns null when the database refused the run: the day already
   * has its morning selection, or a collection is already under way.
   *
   * `kind: "collect"` stops once the offers are stored — no selection, no
   * notification, no e-mail. That is what the admin button asks for: a button
   * that writes to every candidate because somebody wanted to test a source
   * is an incident waiting to happen.
   */
  async run(
    options: {
      force?: boolean;
      sinceDays?: number;
      kind?: DigestRunKind;
    } = {},
  ): Promise<DigestStats | null> {
    const runDate = dateInParis(this.now());
    const kind = options.kind ?? "digest";

    // A run left behind by a restart would hold the lock for ever.
    await this.runs.recoverStale(STALE_RUN_MS);

    // Forcing gives the day back before claiming it again, so the manual run
    // works for a search configured after the morning pass. Nothing is sent
    // twice: a match is unique per candidate and offer, and the notification
    // is created once per day.
    if (options.force && kind === "digest") await this.runs.release(runDate);

    const claimed = await this.runs.claim(runDate, kind);
    if (!claimed) return null;

    return this.executeRun(claimed, options.sinceDays);
  }

  /** The work itself, once a run has been claimed. */
  private async executeRun(
    claimed: DigestRun,
    sinceDays?: number,
  ): Promise<DigestStats> {
    const { kind, runDate } = claimed;
    const stats: DigestStats = {
      aiReranks: 0,
      boardsDiscovered: 0,
      boardsRead: 0,
      candidatesWithoutOffers: 0,
      digestProjects: 0,
      errors: [],
      jobsCreated: 0,
      sourcesSkipped: [],
      listingsCollected: 0,
      matchesWritten: 0,
      notificationsSent: 0,
      projects: 0,
    };

    try {
      // Collected for everyone who configured a search, then selected only for
      // those who asked for the morning mail: the offers of a candidate who
      // turned the digest off still fill the database their search page reads.
      const allProjects = await this.searchProjects.listAll();
      stats.projects = allProjects.length;

      const listings = await this.collector.collect(
        allProjects,
        stats,
        sinceDays ?? COLLECTION_WINDOW_DAYS,
      );
      stats.listingsCollected = listings.length;

      const attached = await this.deduplicator.attachAll(listings);
      stats.jobsCreated = attached.jobsCreated;

      if (kind === "digest") {
        await this.resync(stats);
        const digestProjects = await this.searchProjects.listDigestEnabled();
        stats.digestProjects = digestProjects.length;
        const rome = this.rome.forRun();

        for (const entry of digestProjects) {
          await this.selector.build(entry, runDate, stats, rome);
        }
      }

      await this.runs.finish(claimed.id, {
        stats: { ...stats },
        status: "done",
      });
    } catch (error) {
      stats.errors.push(String(error));
      await this.runs.finish(claimed.id, {
        stats: { ...stats },
        status: "failed",
      });
      this.logger.error(`Digest ${runDate} failed: ${String(error)}`);
    }

    return stats;
  }

  /**
   * Once a day, before selecting: what France Travail changed or withdrew
   * since we stored it (US-163). A failure costs the resynchronisation, never
   * the morning selection.
   */
  private async resync(stats: DigestStats): Promise<void> {
    const source = this.sources.find(isRefreshable);
    if (!source) return;

    try {
      stats.resync = await resyncStaleListings({
        deduplicator: this.deduplicator,
        jobs: this.jobs,
        now: this.now,
        source,
      });
    } catch (error) {
      stats.errors.push(`resync: ${String(error)}`);
    }
  }

}

function isRefreshable(
  source: JobSourceAdapter,
): source is JobSourceAdapter & RefreshableSource {
  return (
    source.source === "france_travail" &&
    typeof (source as Partial<RefreshableSource>).refresh === "function"
  );
}

export { dateInParis, hourInParis };
export type { StoredJob };
