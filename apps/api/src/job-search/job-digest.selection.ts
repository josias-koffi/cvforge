import type { SearchProject } from "@cvforge/types";
import { Logger } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import { departmentsWithin } from "../shared/geo/communes";
import type { CreditsService } from "../credits/credits.service";
import type { MarketNotesReader } from "../market/market-stats.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { ProfilesStore, StoredProfile } from "../profiles/profiles.types";
import {
  digestNotification,
  keepLiveOnly,
  rerankSelection,
  toNewMatches,
  type DigestStats,
} from "./job-digest.steps";
import type { JobSourceAdapter } from "./job-search.types";
import type { JobsStore } from "./jobs.types";
import type { JobMatchesStore } from "./matches.types";
import {
  DEFAULT_SELECTION_SIZE,
  selectJobsForProject,
  type ScoredJob,
} from "./matching/job-matching";
import type { RomeMatchingRun } from "./rome-matching.pg-reader";

/**
 * Every department a location's radius reaches, not only its own: 25 km
 * around Paris takes in Boulogne and Montreuil, which the pool otherwise
 * never read.
 */
export function poolDepartments(project: SearchProject): string[] {
  const departments = project.locations.flatMap((location) =>
    location.latitude !== null && location.longitude !== null
      ? [
          location.department,
          ...departmentsWithin(
            location.latitude,
            location.longitude,
            location.radiusKm,
          ),
        ]
      : [location.department],
  );

  return [...new Set(departments.filter(Boolean))];
}

/** How far back a candidate's pool reaches. Past 30 days nothing is proposed. */
const CANDIDATE_WINDOW_DAYS = 31;
const CANDIDATE_POOL_SIZE = 500;
const MS_PER_DAY = 86_400_000;

export interface DigestSelectorDeps {
  appUrl: string;
  credits: CreditsService;
  jobs: JobsStore;
  market: MarketNotesReader;
  matches: JobMatchesStore;
  notifications: NotificationsService;
  now: () => number;
  openRouter: OpenRouterService;
  profiles: ProfilesStore;
  sources: readonly JobSourceAdapter[];
}

/**
 * One candidate's morning selection: pick, check live, rank, write, announce.
 * Split from `job-digest.service.ts`, which keeps the schedule, the lock and
 * the collection.
 */
export class DigestSelector {
  private readonly logger = new Logger(DigestSelector.name);

  constructor(private readonly deps: DigestSelectorDeps) {}

  async build(
    entry: { userEmail: string; project: SearchProject; romeCodes: string[] },
    runDate: string,
    stats: DigestStats,
    rome: RomeMatchingRun,
  ): Promise<void> {
    const { project, userEmail } = entry;

    try {
      const profile = await this.findProfile(userEmail, project.profileId);
      const alreadyProposedJobIds = new Set(
        await this.deps.matches.listProposedJobIds(userEmail),
      );
      const candidates = await this.deps.jobs.findOpenJobs({
        departments: poolDepartments(project),
        includeRemote: project.remote !== "onsite",
        limit: CANDIDATE_POOL_SIZE,
        since: new Date(
          this.deps.now() - CANDIDATE_WINDOW_DAYS * MS_PER_DAY,
        ).toISOString(),
      });
      const selected = selectJobsForProject({
        alreadyProposedJobIds,
        jobs: candidates,
        limit: DEFAULT_SELECTION_SIZE,
        now: this.deps.now(),
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

      const written = await this.deps.matches.createMany(
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
      const marketNotes = await this.deps.market.notesFor({
        project: entry.project,
        romeCodes: entry.romeCodes,
        since: new Date(this.deps.now() - MS_PER_DAY),
      });
      const sent = await this.deps.notifications.sendJobDigestNotification(
        digestNotification({
          appUrl: this.deps.appUrl,
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
    const registry = await this.deps.profiles.findByUserEmail(userEmail);

    return (
      registry?.profiles.find((profile) => profile.id === profileId) ?? null
    );
  }

  private keepLiveOnly(selected: ScoredJob[]): Promise<ScoredJob[]> {
    return keepLiveOnly(selected, {
      jobs: this.deps.jobs,
      now: this.deps.now,
      sources: this.deps.sources,
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
        { credits: this.deps.credits, openRouter: this.deps.openRouter },
      );
      stats.aiReranks += 1;

      return ranked;
    } catch (error) {
      this.logger.warn(`AI rerank skipped for ${userEmail}: ${String(error)}`);
      return null;
    }
  }
}
