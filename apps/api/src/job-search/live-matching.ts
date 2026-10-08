import type { JobAlertPreferences, SearchProject } from "@cvforge/types";
import { Logger } from "@nestjs/common";
import type { ProfilesStore } from "../profiles/profiles.types";
import type { SearchProjectsStore } from "../search-projects/search-projects.types";
import type { AlertMatchesStore } from "./alert-matches.pg-store";
import type { JobDeduplicator } from "./dedup/job-deduplicator";
import type { JobSourceAdapter, NormalizedJobListing } from "./job-search.types";
import type { JobsStore, StoredJob } from "./jobs.types";
import { newJobValues, seedFromListing } from "./jobs.rows";
import {
  DEFAULT_SCORE_THRESHOLD,
  hasTradeEvidence,
  rejectionReason,
  scoreJob,
  type ScoredJob,
} from "./matching/job-matching";
import { dateInParis } from "./paris-time";
import type { RomeMatchingReader } from "./rome-matching.pg-reader";

/** Above this score, an offer is "très proche" and worth an alert. */
export const ALERT_SCORE_THRESHOLD = 60;

/**
 * The score an offer must reach to raise an alert for this candidate
 * (US-166): very close offers only, or every match; `null` when the
 * candidate turned alerts off — the offer then waits for the morning.
 */
export function alertThresholdFor(preferences: JobAlertPreferences): number | null {
  if (!preferences.enabled) return null;

  return preferences.threshold === "all" ? DEFAULT_SCORE_THRESHOLD : ALERT_SCORE_THRESHOLD;
}

type SearchEntry = { userEmail: string; project: SearchProject; romeCodes: string[] };
type Hit = { entry: SearchEntry; scored: ScoredJob; alertAbove: number | null };

export interface LiveMatchStats {
  listings: number;
  searches: number;
  /** Offers that matched at least one search, and were therefore kept. */
  stored: number;
  alerts: number;
  /** Matched, but gone by the time we checked: no alert. */
  closedBeforeAlert: number;
  errors: string[];
}

export interface LiveMatcherDeps {
  searchProjects: Pick<SearchProjectsStore, "listAll">;
  profiles: Pick<ProfilesStore, "findByUserEmail">;
  rome: RomeMatchingReader;
  deduplicator: Pick<JobDeduplicator, "attach">;
  jobs: Pick<JobsStore, "findById" | "closeListing">;
  alerts: Pick<AlertMatchesStore, "createAlert">;
  /** The candidate's alert preferences (US-166). */
  alertPreferences: (userEmail: string) => Promise<JobAlertPreferences>;
  sources: readonly JobSourceAdapter[];
  now: () => number;
}

/**
 * Matching as offers arrive (ADR-027 §4, US-165).
 *
 * Each new offer of the continuous collection is scored against every active
 * search with the morning's deterministic score — ROME, skills, contract,
 * place, remote work — and no AI call: the AI ranking stays with the morning.
 * An offer no search wants is forgotten; the national flow would otherwise
 * fill `jobs` with 10 000 to 30 000 offers a day. One that clears a search's
 * alert threshold, and is still online, becomes an `alert` match.
 */
export class LiveMatcher {
  private readonly logger = new Logger(LiveMatcher.name);

  constructor(private readonly deps: LiveMatcherDeps) {}

  async handle(listings: readonly NormalizedJobListing[]): Promise<LiveMatchStats> {
    const detectedAt = new Date(this.deps.now()).toISOString();
    const stats: LiveMatchStats = {
      alerts: 0,
      closedBeforeAlert: 0,
      errors: [],
      listings: listings.length,
      searches: 0,
      stored: 0,
    };
    if (listings.length === 0) return stats;

    const searches = await this.deps.searchProjects.listAll();
    stats.searches = searches.length;

    const previews = listings.map((listing) => previewJob(listing, detectedAt));
    const hits = await this.score(searches, previews, stats);

    for (const [index, matched] of hits) {
      const listing = listings[index]!;

      try {
        await this.keep(listing, matched, detectedAt, stats);
      } catch (error) {
        stats.errors.push(`${listing.source}/${listing.externalId}: ${String(error)}`);
      }
    }

    if (stats.errors.length > 0) {
      this.logger.warn(`Live matching: ${stats.errors.length} error(s), first: ${stats.errors[0]}`);
    }

    return stats;
  }

  /** Every (offer, search) pair above the morning's threshold, by offer. */
  private async score(
    searches: readonly SearchEntry[],
    previews: readonly StoredJob[],
    stats: LiveMatchStats,
  ): Promise<Map<number, Hit[]>> {
    const now = this.deps.now();
    const run = this.deps.rome.forRun();
    const hits = new Map<number, Hit[]>();

    for (const entry of searches) {
      try {
        const { project, userEmail } = entry;
        const skills = await this.skillsOf(userEmail, project.profileId);
        const alertAbove = alertThresholdFor(await this.deps.alertPreferences(userEmail));
        const rome = await run.contextFor({
          jobs: previews,
          profileId: project.profileId,
          projectCodes: entry.romeCodes,
          userEmail,
        });

        previews.forEach((job, index) => {
          if (rejectionReason({ job, now, project }) !== null) return;

          const scored = scoreJob({ job, now, project, rome, skills });
          if (!isRelevantMatch(scored)) return;

          hits.set(index, [...(hits.get(index) ?? []), { alertAbove, entry, scored }]);
        });
      } catch (error) {
        // One search that cannot be scored costs its own alerts only.
        stats.errors.push(`${entry.userEmail}: ${String(error)}`);
      }
    }

    return hits;
  }

  /** Stores the offer, then raises the alerts it deserves. */
  private async keep(
    listing: NormalizedJobListing,
    matched: readonly Hit[],
    detectedAt: string,
    stats: LiveMatchStats,
  ): Promise<void> {
    const attached = await this.deps.deduplicator.attach(listing);
    stats.stored += 1;

    const alerting = matched.filter(
      ({ alertAbove, scored }) => alertAbove !== null && scored.score >= alertAbove,
    );
    if (alerting.length === 0) return;

    const job = (await this.deps.jobs.findById(attached.jobId))?.job;
    if (!job || job.closedAt) return;

    if (!(await this.stillOpen(listing))) {
      stats.closedBeforeAlert += 1;
      return;
    }

    for (const { entry, scored } of alerting) {
      const id = await this.deps.alerts.createAlert({
        detectedAt,
        digestDate: dateInParis(Date.parse(detectedAt)),
        jobId: job.id,
        jobSnapshot: job,
        matchedSkills: scored.matchedSkills,
        missingSkills: scored.missingSkills,
        profileId: entry.project.profileId,
        publishedAt: listing.publishedAt,
        score: scored.score,
        scoreBreakdown: scored.breakdown,
        source: listing.source,
        userEmail: entry.userEmail,
      });
      if (id) stats.alerts += 1;
    }
  }

  /**
   * Checked live, as the morning does before proposing. "Could not tell"
   * keeps the offer: a network blip must not swallow an alert.
   */
  private async stillOpen(listing: NormalizedJobListing): Promise<boolean> {
    const source = this.deps.sources.find(
      (candidate) => candidate.source === listing.source,
    );
    if (!source) return true;

    const answer = await source.isStillOpen(listing.externalId);
    if (answer !== false) return true;

    await this.deps.jobs.closeListing(
      listing.source,
      listing.externalId,
      new Date(this.deps.now()).toISOString(),
    );

    return false;
  }

  private async skillsOf(userEmail: string, profileId: string): Promise<string[]> {
    const registry = await this.deps.profiles.findByUserEmail(userEmail);
    const profile = registry?.profiles.find((candidate) => candidate.id === profileId);

    return profile?.sections.technicalSkills ?? [];
  }
}

/**
 * The morning's rule: the threshold, and direct evidence of the trade.
 * Place, freshness and contract alone reach the threshold for any recent
 * offer near the candidate, and would keep every accountant near a developer.
 */
export function isRelevantMatch(scored: ScoredJob): boolean {
  return (
    scored.score >= DEFAULT_SCORE_THRESHOLD && hasTradeEvidence(scored)
  );
}

/**
 * The offer as the score reads a stored job, without storing it: most offers
 * of the national flow match nobody and must leave no trace (ADR-027 §4).
 */
export function previewJob(listing: NormalizedJobListing, detectedAt: string): StoredJob {
  const seen = new Date(detectedAt);
  const values = newJobValues(seedFromListing(listing), { first: seen, last: seen });

  return {
    ...values,
    closedAt: null,
    contractType: listing.contractType,
    firstSeenAt: detectedAt,
    id: `${listing.source}:${listing.externalId}`,
    lastSeenAt: detectedAt,
    publishedAt: listing.publishedAt,
  };
}
