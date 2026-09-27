import type { SearchProject } from "@cvforge/types";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { ProfilesStore, StoredProfile } from "../profiles/profiles.types";
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
import type {
  RomeMatchingReader,
  RomeMatchingRun,
} from "./rome-matching.pg-reader";
import { JobCollector } from "./job-collector";
import {
  digestNotification,
  keepLiveOnly,
  rerankSelection,
  toNewMatches,
  type DigestStats,
} from "./job-digest.steps";
import type { MarketNotesReader } from "../market/market-stats.service";
import { dateInParis, hourInParis } from "./paris-time";
import {
  DEFAULT_SELECTION_SIZE,
  selectJobsForProject,
  type ScoredJob,
} from "./matching/job-matching";

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
const STALE_RUN_MS = 2 * 60 * 60_000;
/** How far back a candidate's pool reaches. Past 30 days nothing is proposed. */
const CANDIDATE_WINDOW_DAYS = 31;
const CANDIDATE_POOL_SIZE = 500;
const MS_PER_DAY = 86_400_000;

@Injectable()
export class JobDigestService implements OnModuleInit {
  private readonly logger = new Logger(JobDigestService.name);
  private readonly collector: JobCollector;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly searchProjects: Pick<
      SearchProjectsStore,
      "listAll" | "listDigestEnabled"
    >,
    private readonly profiles: ProfilesStore,
    private readonly jobs: JobsStore,
    private readonly matches: JobMatchesStore,
    private readonly runs: JobDigestRunsStore,
    sourceStates: JobSourcesStore,
    boards: BoardsService,
    private readonly deduplicator: JobDeduplicator,
    private readonly sources: JobSourceAdapter[],
    private readonly credits: CreditsService,
    private readonly openRouter: OpenRouterService,
    private readonly notifications: NotificationsService,
    private readonly rome: RomeMatchingReader,
    private readonly market: MarketNotesReader,
    private readonly appUrl: string,
    private readonly now: () => number = Date.now,
  ) {
    this.collector = new JobCollector(sources, sourceStates, boards);
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
        const digestProjects = await this.searchProjects.listDigestEnabled();
        stats.digestProjects = digestProjects.length;
        const rome = this.rome.forRun();

        for (const entry of digestProjects) {
          await this.buildSelection(entry, runDate, stats, rome);
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

  private async buildSelection(
    entry: { userEmail: string; project: SearchProject; romeCodes: string[] },
    runDate: string,
    stats: DigestStats,
    rome: RomeMatchingRun,
  ): Promise<void> {
    const { project, userEmail } = entry;

    try {
      const profile = await this.findProfile(userEmail, project.profileId);
      const alreadyProposedJobIds = new Set(
        await this.matches.listProposedJobIds(userEmail),
      );
      const candidates = await this.jobs.findOpenJobs({
        departments: project.locations.map((location) => location.department),
        includeRemote: project.remote !== "onsite",
        limit: CANDIDATE_POOL_SIZE,
        since: new Date(
          this.now() - CANDIDATE_WINDOW_DAYS * MS_PER_DAY,
        ).toISOString(),
      });
      const selected = selectJobsForProject({
        alreadyProposedJobIds,
        jobs: candidates,
        limit: DEFAULT_SELECTION_SIZE,
        now: this.now(),
        project,
        rome: await rome.contextFor({
          jobs: candidates,
          profileId: project.profileId,
          projectCodes: entry.romeCodes,
          userEmail,
        }),
        skills: profile?.sections.technicalSkills ?? [],
      });
      const live = await this.keepLiveOnly(selected);

      if (live.length === 0) {
        stats.candidatesWithoutOffers += 1;
        return;
      }

      const ranked = project.aiRerankEnabled
        ? await this.rerank(userEmail, profile, live, stats)
        : null;

      const written = await this.matches.createMany(
        toNewMatches({ live, project, ranked, runDate, userEmail }),
      );
      stats.matchesWritten += written;

      // Nothing new to announce: a run that re-proposed nothing must not send
      // an e-mail saying otherwise.
      if (written > 0) {
        await this.announce(entry, runDate, live, ranked, stats);
      }
    } catch (error) {
      // A candidate whose selection fails loses one morning, not the feature.
      stats.errors.push(`${userEmail}: ${String(error)}`);
      this.logger.warn(`Selection failed for ${userEmail}: ${String(error)}`);
    }
  }

  /**
   * The announcement, with what moved in the candidate's job market (US-128).
   * It never fails the run: a candidate whose e-mail bounces still has their
   * offers waiting on the page.
   */
  private async announce(
    entry: { userEmail: string; project: SearchProject; romeCodes: string[] },
    runDate: string,
    live: ScoredJob[],
    ranked: Array<{ id: string; rank: number; reason: string }> | null,
    stats: DigestStats,
  ): Promise<void> {
    try {
      const marketNotes = await this.market.notesFor({
        project: entry.project,
        romeCodes: entry.romeCodes,
        since: new Date(this.now() - MS_PER_DAY),
      });
      const sent = await this.notifications.sendJobDigestNotification(
        digestNotification({
          appUrl: this.appUrl,
          entry,
          live,
          marketNotes,
          ranked,
          runDate,
        }),
      );

      if (sent) stats.notificationsSent += 1;
    } catch (error) {
      stats.errors.push(`notification ${entry.userEmail}: ${String(error)}`);
      this.logger.warn(
        `Could not announce the digest to ${entry.userEmail}: ${String(error)}`,
      );
    }
  }

  private async findProfile(
    userEmail: string,
    profileId: string,
  ): Promise<StoredProfile | null> {
    const registry = await this.profiles.findByUserEmail(userEmail);

    return (
      registry?.profiles.find((profile) => profile.id === profileId) ?? null
    );
  }

  private keepLiveOnly(selected: ScoredJob[]): Promise<ScoredJob[]> {
    return keepLiveOnly(selected, {
      jobs: this.jobs,
      now: this.now,
      sources: this.sources,
    });
  }

  /** The deterministic order stands whenever the paid pass fails. */
  private async rerank(
    userEmail: string,
    profile: StoredProfile | null,
    selected: ScoredJob[],
    stats: DigestStats,
  ) {
    try {
      const ranked = await rerankSelection(
        { profile, selected, userEmail },
        { credits: this.credits, openRouter: this.openRouter },
      );
      stats.aiReranks += 1;

      return ranked;
    } catch (error) {
      this.logger.warn(`AI rerank skipped for ${userEmail}: ${String(error)}`);
      return null;
    }
  }
}

export { dateInParis, hourInParis };
export type { StoredJob };
