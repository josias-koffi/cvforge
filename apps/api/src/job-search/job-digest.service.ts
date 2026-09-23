import {
  AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
  type SearchProject,
} from "@cvforge/types";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import type { NotificationsService } from "../notifications/notifications.service";
import { extractJsonFromContent } from "../cv-generation/cv-generation.normalizers";
import type { ProfilesStore, StoredProfile } from "../profiles/profiles.types";
import type { SearchProjectsStore } from "../search-projects/search-projects.types";
import { BoardsService } from "./boards.service";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import type { JobSourceAdapter, NormalizedJobListing } from "./job-search.types";
import type { JobsStore, StoredJob } from "./jobs.types";
import type {
  JobDigestRunsStore,
  JobMatchesStore,
  NewJobMatch,
} from "./matches.types";
import { buildSourceQueries } from "./sources/france-travail.query";
import {
  DEFAULT_SELECTION_SIZE,
  selectJobsForProject,
  type ScoredJob,
} from "./matching/job-matching";
import {
  buildRerankUserMessage,
  JOB_RERANK_SYSTEM_PROMPT,
  readRerankResponse,
  toRerankCandidates,
} from "./matching/job-rerank";

/**
 * The morning run: collect, select, explain, write.
 *
 * Scheduled the way the rest of this repo schedules daily work — a plain
 * interval, no job queue — but made safe for several API instances by a row in
 * `job_digest_runs`: the first to insert today's date owns the run.
 */

const CHECK_INTERVAL_MS = 15 * 60_000;
const DIGEST_HOUR = 6;
const PARIS_TIME_ZONE = "Europe/Paris";
/** One day back: yesterday's offers are already collected. */
const COLLECTION_WINDOW_DAYS = 1;
/** How far back a candidate's pool reaches. Past 30 days nothing is proposed. */
const CANDIDATE_WINDOW_DAYS = 31;
const CANDIDATE_POOL_SIZE = 500;
const MS_PER_DAY = 86_400_000;

/** Offers named in the e-mail; the rest are one click away. */
const EMAIL_PREVIEW_SIZE = 5;

export interface DigestStats {
  /** Searches the collection worked from. */
  projects: number;
  /** Among them, those that also asked for the morning selection. */
  digestProjects: number;
  listingsCollected: number;
  jobsCreated: number;
  boardsRead: number;
  matchesWritten: number;
  candidatesWithoutOffers: number;
  notificationsSent: number;
  aiReranks: number;
  errors: string[];
}

@Injectable()
export class JobDigestService implements OnModuleInit {
  private readonly logger = new Logger(JobDigestService.name);
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
    private readonly boards: BoardsService,
    private readonly deduplicator: JobDeduplicator,
    private readonly sources: JobSourceAdapter[],
    private readonly credits: CreditsService,
    private readonly openRouter: OpenRouterService,
    private readonly notifications: NotificationsService,
    private readonly appUrl: string,
    private readonly now: () => number = Date.now,
  ) {}

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
   * One pass. Returns null when another instance already owns today's run.
   */
  async run(options: { force?: boolean } = {}): Promise<DigestStats | null> {
    const runDate = dateInParis(this.now());

    // Forcing gives the day back before claiming it again, so the manual run
    // works for a search configured after the morning pass. Nothing is sent
    // twice: a match is unique per candidate and offer, and the notification
    // is created once per day.
    if (options.force) await this.runs.release(runDate);

    const claimed = await this.runs.claim(runDate);
    if (!claimed) return null;

    const stats: DigestStats = {
      aiReranks: 0,
      boardsRead: 0,
      candidatesWithoutOffers: 0,
      digestProjects: 0,
      errors: [],
      jobsCreated: 0,
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

      const listings = await this.collect(
        allProjects.map((entry) => entry.project),
        stats,
      );
      stats.listingsCollected = listings.length;

      const attached = await this.deduplicator.attachAll(listings);
      stats.jobsCreated = attached.jobsCreated;

      const digestProjects = await this.searchProjects.listDigestEnabled();
      stats.digestProjects = digestProjects.length;

      for (const entry of digestProjects) {
        await this.buildSelection(entry, runDate, stats);
      }

      await this.runs.finish(runDate, { stats: { ...stats }, status: "done" });
    } catch (error) {
      stats.errors.push(String(error));
      await this.runs.finish(runDate, { stats: { ...stats }, status: "failed" });
      this.logger.error(`Digest ${runDate} failed: ${String(error)}`);
    }

    return stats;
  }

  /** Every source, once, for the queries the candidates' searches imply. */
  private async collect(
    projects: readonly SearchProject[],
    stats: DigestStats,
  ): Promise<NormalizedJobListing[]> {
    const listings: NormalizedJobListing[] = [];
    const queries = buildSourceQueries(projects, COLLECTION_WINDOW_DAYS);

    for (const source of this.sources) {
      for (const query of queries) {
        try {
          listings.push(...(await source.search(query)));
        } catch (error) {
          // One failed query costs its offers, never the whole morning.
          stats.errors.push(`${source.source}: ${String(error)}`);
        }
      }
    }

    try {
      const boards = await this.boards.collect();
      stats.boardsRead = boards.boardsRead;
      listings.push(...boards.listings);
    } catch (error) {
      stats.errors.push(`boards: ${String(error)}`);
    }

    return listings;
  }

  private async buildSelection(
    entry: { userEmail: string; project: SearchProject },
    runDate: string,
    stats: DigestStats,
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
   * The announcement. It never fails the run: a candidate whose e-mail bounces
   * still has their offers waiting on the page.
   */
  private async announce(
    entry: { userEmail: string; project: SearchProject },
    runDate: string,
    live: ScoredJob[],
    ranked: Array<{ id: string; rank: number; reason: string }> | null,
    stats: DigestStats,
  ): Promise<void> {
    const reasons = new Map(ranked?.map((item) => [item.id, item.reason]) ?? []);
    const ordered = ranked
      ? [...live].sort(
          (left, right) =>
            (ranked.find((item) => item.id === left.job.id)?.rank ?? 99) -
            (ranked.find((item) => item.id === right.job.id)?.rank ?? 99),
        )
      : live;

    try {
      const sent = await this.notifications.sendJobDigestNotification({
        digestDate: runDate,
        digestUrl: `${this.appUrl}/offres-du-jour`,
        emailEnabled: entry.project.emailEnabled,
        offers: ordered.slice(0, EMAIL_PREVIEW_SIZE).map((scored) => ({
          companyName: scored.job.companyAnonymous ? "" : scored.job.companyName,
          locationLabel: scored.job.locationLabel,
          reason: reasons.get(scored.job.id) ?? "",
          score: scored.score,
          title: scored.job.title,
        })),
        preferencesUrl: `${this.appUrl}/notifications`,
        totalCount: live.length,
        userEmail: entry.userEmail,
      });

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

    return registry?.profiles.find((profile) => profile.id === profileId) ?? null;
  }

  /**
   * Checks the offers are still online before proposing them.
   *
   * A source that cannot answer leaves the offer in place: "we could not
   * check" is not "it is gone", and dropping a live offer on a network blip
   * would be the worse mistake.
   */
  private async keepLiveOnly(selected: ScoredJob[]): Promise<ScoredJob[]> {
    const live: ScoredJob[] = [];

    for (const entry of selected) {
      const listings = (await this.jobs.findById(entry.job.id))?.listings ?? [];
      const open = listings.filter((listing) => !listing.closedAt);
      let isOpen = open.length > 0;

      for (const listing of open) {
        const source = this.sources.find(
          (candidate) => candidate.source === listing.source,
        );
        if (!source) continue;

        const answer = await source.isStillOpen(listing.externalId);
        if (answer === false) {
          await this.jobs.closeListing(
            listing.source,
            listing.externalId,
            new Date(this.now()).toISOString(),
          );
          isOpen = open.length > 1;
        }
      }

      if (isOpen) live.push(entry);
    }

    return live;
  }

  /**
   * The paid pass. Credits are charged **after** the model answered: a failed
   * call must not cost the candidate anything, and the deterministic order is
   * a perfectly good fallback.
   */
  private async rerank(
    userEmail: string,
    profile: StoredProfile | null,
    selected: ScoredJob[],
    stats: DigestStats,
  ) {
    try {
      await this.credits.assertSufficientCredits(
        AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
        userEmail,
      );

      const raw = await withOpenRouterHttpErrors(() =>
        this.openRouter.chat(
          [
            { content: JOB_RERANK_SYSTEM_PROMPT, role: "system" },
            {
              content: buildRerankUserMessage(
                {
                  // No name, no contact details: the model is given what the
                  // candidate does, never who they are.
                  headline: profile?.headline ?? "",
                  skills: profile?.sections.technicalSkills ?? [],
                  targetRoles: [],
                },
                toRerankCandidates(selected),
              ),
              role: "user",
            },
          ],
          { temperature: 0.2 },
        ),
      );

      const ranked = readRerankResponse(
        extractJsonFromContent<{ classement?: unknown }>(raw),
        selected,
      );

      await this.credits.consumeCredits({
        action: AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
        userEmail,
      });
      stats.aiReranks += 1;

      return ranked;
    } catch (error) {
      this.logger.warn(`AI rerank skipped for ${userEmail}: ${String(error)}`);
      return null;
    }
  }
}

function toNewMatches(input: {
  live: ScoredJob[];
  project: SearchProject;
  ranked: Array<{ id: string; rank: number; reason: string }> | null;
  runDate: string;
  userEmail: string;
}): NewJobMatch[] {
  const byId = new Map(input.ranked?.map((entry) => [entry.id, entry]) ?? []);

  return input.live.map((entry) => {
    const ranking = byId.get(entry.job.id);

    return {
      aiRank: ranking?.rank ?? null,
      aiReason: ranking?.reason || null,
      digestDate: input.runDate,
      jobId: entry.job.id,
      jobSnapshot: entry.job,
      matchedSkills: entry.matchedSkills,
      profileId: input.project.profileId,
      score: entry.score,
      scoreBreakdown: entry.breakdown,
      userEmail: input.userEmail,
    };
  });
}

/** The run is a Paris day, not a UTC one: 6:00 means 6:00 for the candidate. */
export function dateInParis(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Read from the formatted **parts**, not from the formatted string: a French
 * locale renders the hour as "08 h", and `Number("08 h")` is NaN — which then
 * fails every comparison silently and lets the run start at any hour.
 */
export function hourInParis(timestamp: number): number {
  const hour = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    hour12: false,
    timeZone: PARIS_TIME_ZONE,
  })
    .formatToParts(new Date(timestamp))
    .find((part) => part.type === "hour")?.value;

  const parsed = Number(hour);

  // An hour we cannot read must not open the gate.
  return Number.isFinite(parsed) ? parsed % 24 : DIGEST_HOUR - 1;
}

export type { StoredJob };
